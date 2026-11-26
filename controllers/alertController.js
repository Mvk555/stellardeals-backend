const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const Product = require('../models/Product');
const { checkAlertsForProduct } = require('../services/alertService');

const createAlert = async (req, res) => {
  try {
    const { productId } = req.body;
    const targetPrice = Number(req.body.targetPrice);

    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: 'Invalid product' });
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      return res.status(400).json({ message: 'Target price must be a positive number' });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const existing = await Alert.findOne({ user: req.user._id, product: productId });
    if (existing && existing.targetPrice === targetPrice) return res.status(200).json(existing);

    const alert = await Alert.findOneAndUpdate(
      { user: req.user._id, product: productId },
      { targetPrice, notified: false },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await checkAlertsForProduct(product._id, product.name, product.bestPrice);
    res.status(201).json(await Alert.findById(alert._id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.user._id }).populate('product').sort({ createdAt: -1 });
    const result = alerts
      .filter(a => a.product)
      .map(a => {
        const currentPrice = a.product.bestPrice;
        return {
          _id: a._id,
          product: a.product,
          targetPrice: a.targetPrice,
          currentPrice,
          triggered: currentPrice <= a.targetPrice,
          createdAt: a.createdAt
        };
      });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAlert = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Alert not found' });
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    if (alert.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await alert.deleteOne();
    res.json({ message: 'Alert removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createAlert, getMyAlerts, deleteAlert };
