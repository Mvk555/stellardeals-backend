const Product = require('../models/Product');
const { isId } = require('../utils/validId');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getProducts = async (req, res) => {
  try {
    const { category, brand, search, minPrice, maxPrice, sort } = req.query;
    const query = {};

    if (category && category !== 'All') query.category = String(category);
    if (brand && brand !== 'All') query.brand = String(brand);
    if (search) {
      const rx = escapeRegex(String(search).trim());
      query.$or = [
        { name: { $regex: rx, $options: 'i' } },
        { brand: { $regex: rx, $options: 'i' } },
        { category: { $regex: rx, $options: 'i' } }
      ];
    }
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if ((minPrice && Number.isFinite(min)) || (maxPrice && Number.isFinite(max))) {
      query.price = {};
      if (minPrice && Number.isFinite(min)) query.price.$gte = min;
      if (maxPrice && Number.isFinite(max)) query.price.$lte = max;
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price-low') sortObj = { price: 1 };
    else if (sort === 'price-high') sortObj = { price: -1 };
    else if (sort === 'rating') sortObj = { rating: -1 };
    else if (sort === 'name') sortObj = { name: 1 };

    if (req.query.page === undefined) {
      return res.json(await Product.find(query).sort(sortObj));
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const total = await Product.countDocuments(query);
    const pages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);
    const products = await Product.find(query).sort(sortObj).skip((page - 1) * limit).limit(limit);
    res.json({ products, page, pages, total, limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    res.json(await Product.find({ featured: true }).limit(8));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductMeta = async (req, res) => {
  try {
    const [categories, brands] = await Promise.all([Product.distinct('category'), Product.distinct('brand')]);
    res.json({ categories: categories.sort(), brands: brands.sort() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPriceHistory = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.findById(req.params.id).select('+priceHistory');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const history = [...(product.priceHistory || [])]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(h => ({ date: h.date, price: h.price }));

    const current = product.bestPrice;
    if (history.length === 0) {
      return res.json({ productId: product.id, name: product.name, current, history: [], stats: null, verdict: 'Not enough data yet' });
    }

    const prices = history.map(h => h.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const lowestPoint = history.find(h => h.price === lowest);

    let verdict = 'Fair price';
    if (current <= lowest * 1.03) verdict = 'Great time to buy';
    else if (current >= average * 1.05) verdict = 'Price is high right now';

    res.json({
      productId: product.id,
      name: product.name,
      current,
      stats: { lowest, highest, average, lowestDate: lowestPoint.date, savingsVsAverage: average - current },
      verdict,
      history
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, getProductById, getFeaturedProducts, getProductMeta, getPriceHistory };
