const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  retailer: { type: String, required: true, enum: ['Amazon', 'Flipkart'] },
  price: { type: Number, min: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: true, updatedAt: false } });

clickSchema.index({ product: 1 });
clickSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Click', clickSchema);
