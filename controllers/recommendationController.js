const Product = require('../models/Product');
const { isId } = require('../utils/validId');

const getRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isId(productId)) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const recommendations = await Product.find({
      _id: { $ne: productId },
      $or: [
        { category: product.category },
        { brand: product.brand },
        { price: { $gte: product.price * 0.7, $lte: product.price * 1.3 } }
      ]
    }).sort({ rating: -1 }).limit(4);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrending = async (req, res) => {
  try {
    res.json(await Product.find().sort({ rating: -1, numReviews: -1 }).limit(8));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRecommendations, getTrending };
