const Review = require('../models/Review');
const Product = require('../models/Product');
const { isId } = require('../utils/validId');

const createReview = async (req, res) => {
  try {
    const { productId } = req.body;
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();

    if (!isId(productId)) return res.status(400).json({ message: 'Invalid product' });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    if (!comment) return res.status(400).json({ message: 'Please write a comment' });
    if (comment.length > 1000) return res.status(400).json({ message: 'Comment is too long (max 1000 characters)' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (await Review.findOne({ user: req.user._id, product: productId })) {
      return res.status(400).json({ message: 'You already reviewed this product' });
    }

    let review;
    try {
      review = await Review.create({ user: req.user._id, product: productId, name: req.user.name, rating, comment });
    } catch (e) {
      if (e.code === 11000) return res.status(400).json({ message: 'You already reviewed this product' });
      throw e;
    }

    // blend the new rating into the existing average, so seeded ratings (e.g. 4.9 from 512 reviews) are not wiped out
    const count = product.numReviews || 0;
    const newCount = count + 1;
    const newRating = Math.round(((product.rating * count + rating) / newCount) * 10) / 10;
    await Product.updateOne({ _id: productId }, { rating: newRating, numReviews: newCount });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductReviews = async (req, res) => {
  try {
    if (!isId(req.params.productId)) return res.status(400).json({ message: 'Invalid product' });
    res.json(await Review.find({ product: req.params.productId }).sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getProductReviews };
