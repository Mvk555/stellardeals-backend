const Product = require('../models/Product');
const Click = require('../models/Click');
const { isId } = require('../utils/validId');
const asyncHandler = require('../utils/asyncHandler');

const trackClick = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const retailer = String(req.body.retailer || '').trim();

  if (!isId(productId)) return res.status(400).json({ message: 'Invalid product' });
  if (!['Amazon', 'Flipkart'].includes(retailer)) return res.status(400).json({ message: 'Retailer must be Amazon or Flipkart' });

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const link = product.retailerLinks.find(l => l.retailer === retailer);
  if (!link) return res.status(404).json({ message: `${retailer} link not available for this product` });

  await Click.create({ product: product._id, retailer, price: link.price, user: req.user ? req.user._id : undefined });
  res.status(201).json({ url: link.url, retailer, price: link.price });
});

module.exports = { trackClick };
