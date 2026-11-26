const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { isId } = require('../utils/validId');

const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
    res.json(wishlist || { user: req.user._id, products: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!isId(productId)) return res.status(400).json({ message: 'Invalid product' });
    if (!(await Product.exists({ _id: productId }))) return res.status(404).json({ message: 'Product not found' });

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { products: productId } },   // no duplicates, no race conditions
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('products');
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    if (!isId(req.params.productId)) return res.status(400).json({ message: 'Invalid product' });
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { products: req.params.productId } },
      { new: true }
    ).populate('products');
    res.json(wishlist || { user: req.user._id, products: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
