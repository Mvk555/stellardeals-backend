const Product = require('../models/Product');
const User = require('../models/User');
const Click = require('../models/Click');
const Alert = require('../models/Alert');
const { isId } = require('../utils/validId');
const asyncHandler = require('../utils/asyncHandler');
const { runPriceJob } = require('../services/priceJob');

const ALLOWED = ['name', 'description', 'price', 'originalPrice', 'category', 'brand', 'image', 'featured', 'specs', 'retailerLinks'];
const REQUIRED_ON_CREATE = ['name', 'description', 'category', 'brand', 'image'];
const RETAILERS = ['Amazon', 'Flipkart'];

const pick = (body) => {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  return out;
};

const normalizeLinks = (links) => links.map(l => ({ retailer: l.retailer, url: String(l.url).trim(), price: Number(l.price) }));

const bestOf = (links, fallback) =>
  Array.isArray(links) && links.length ? Math.min(...links.map(l => Number(l.price))) : fallback;

const validate = (d, isCreate) => {
  if (isCreate) {
    for (const k of REQUIRED_ON_CREATE) {
      if (d[k] === undefined || d[k] === '') return `${k} is required`;
    }
    const hasLinks = Array.isArray(d.retailerLinks) && d.retailerLinks.length > 0;
    if (!hasLinks && (d.price === undefined || d.price === '')) return 'price is required (or add at least one retailer link)';
  }
  for (const k of ['price', 'originalPrice']) {
    if (d[k] !== undefined && d[k] !== '' && (!Number.isFinite(Number(d[k])) || Number(d[k]) < 0)) return `${k} must be a number, 0 or more`;
  }
  if (d.specs !== undefined && (typeof d.specs !== 'object' || d.specs === null || Array.isArray(d.specs))) {
    return 'specs must be an object, like { "ram": "8GB" }';
  }
  if (d.retailerLinks !== undefined) {
    if (!Array.isArray(d.retailerLinks)) return 'retailerLinks must be a list';
    const seen = new Set();
    for (const l of d.retailerLinks) {
      if (!l || !RETAILERS.includes(l.retailer)) return 'retailer must be Amazon or Flipkart';
      if (seen.has(l.retailer)) return `${l.retailer} is added twice`;
      seen.add(l.retailer);
      if (!/^https?:\/\//i.test(String(l.url || ''))) return `link for ${l.retailer} must start with http:// or https://`;
      if (!Number.isFinite(Number(l.price)) || Number(l.price) < 0) return `price for ${l.retailer} must be a number, 0 or more`;
    }
  }
  return null;
};

const clean = (doc) => {
  const o = doc.toObject();
  delete o.priceHistory;
  return o;
};

const createProduct = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  const err = validate(data, true);
  if (err) return res.status(400).json({ message: err });

  if (Array.isArray(data.retailerLinks) && data.retailerLinks.length) {
    data.retailerLinks = normalizeLinks(data.retailerLinks);
    data.price = bestOf(data.retailerLinks);
  }
  const best = bestOf(data.retailerLinks, Number(data.price));
  const product = await Product.create({ ...data, priceHistory: [{ date: new Date(), price: best }] });
  res.status(201).json(clean(product));
});

const updateProduct = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const data = pick(req.body);
  if (Object.keys(data).length === 0) return res.status(400).json({ message: 'Nothing to update' });
  const err = validate(data, false);
  if (err) return res.status(400).json({ message: err });

  const product = await Product.findById(req.params.id).select('+priceHistory');
  if (!product) return res.status(404).json({ message: 'Product not found' });

  if (Array.isArray(data.retailerLinks) && data.retailerLinks.length) {
    data.retailerLinks = normalizeLinks(data.retailerLinks);
    data.price = bestOf(data.retailerLinks);
  }
  product.set(data);
  if (data.retailerLinks !== undefined) {
    const best = bestOf(data.retailerLinks, product.price);
    const last = product.priceHistory.length ? product.priceHistory[product.priceHistory.length - 1].price : null;
    if (best !== last) product.priceHistory.push({ date: new Date(), price: best });
  }
  await product.save();
  res.json(clean(product));
});

const deleteProduct = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await product.deleteOne();
  await Alert.deleteMany({ product: product._id });
  res.json({ message: 'Product deleted' });
});

const getAllUsers = asyncHandler(async (req, res) => {
  res.json(await User.find().select('-password'));
});

const getStats = asyncHandler(async (req, res) => {
  const [products, users, clicks, alerts, categories, recentClicks] = await Promise.all([
    Product.countDocuments(),
    User.countDocuments(),
    Click.countDocuments(),
    Alert.countDocuments(),
    Product.distinct('category'),
    Click.find().sort({ createdAt: -1 }).limit(5).populate('product', 'name').populate('user', 'name')
  ]);
  res.json({ products, users, clicks, alerts, categories: categories.length, recentClicks });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const days = 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayStarts = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dayStarts.push(d);
  }

  const [totalClicks, byRetailerRaw, topRaw, dailyCounts] = await Promise.all([
    Click.countDocuments(),
    Click.aggregate([{ $group: { _id: '$retailer', count: { $sum: 1 } } }]),
    Click.aggregate([{ $group: { _id: '$product', clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }, { $limit: 10 }]),
    Promise.all(dayStarts.map(start => {
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return Click.countDocuments({ createdAt: { $gte: start, $lt: end } });
    }))
  ]);

  const byRetailer = ['Amazon', 'Flipkart'].map(r => ({
    retailer: r,
    count: (byRetailerRaw.find(x => x._id === r) || { count: 0 }).count
  }));

  const productDocs = await Product.find({ _id: { $in: topRaw.map(t => t._id) } }).select('name image category');
  const topProducts = topRaw
    .map(t => ({ product: productDocs.find(p => p.id === String(t._id)), clicks: t.clicks }))
    .filter(t => t.product);

  const pad = (n) => String(n).padStart(2, '0');
  const daily = dayStarts.map((d, i) => ({
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    count: dailyCounts[i]
  }));

  res.json({ totalClicks, byRetailer, topProducts, daily });
});

const runPriceJobNow = asyncHandler(async (req, res) => {
  res.json(await runPriceJob(6));
});

module.exports = { createProduct, updateProduct, deleteProduct, getAllUsers, getStats, getAnalytics, runPriceJobNow };
