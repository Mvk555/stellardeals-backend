const mongoose = require('mongoose');

const retailerLinkSchema = new mongoose.Schema({
  retailer: { type: String, required: true, enum: ['Amazon', 'Flipkart'] },
  url: { type: String, required: true },
  price: { type: Number, required: true, min: 0 }
}, { _id: false });

const pricePointSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  price: { type: Number, required: true, min: 0 }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  category: { type: String, required: true },
  brand: { type: String, required: true },
  image: { type: String, required: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  numReviews: { type: Number, default: 0 },
  specs: { type: Object, default: {} },
  featured: { type: Boolean, default: false },
  retailerLinks: { type: [retailerLinkSchema], default: [] },
  priceHistory: { type: [pricePointSchema], default: [], select: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.virtual('bestPrice').get(function () {
  if (!this.retailerLinks || this.retailerLinks.length === 0) return this.price;
  return Math.min(...this.retailerLinks.map(r => r.price));
});

productSchema.index({ name: 'text', brand: 'text', category: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ featured: 1 });

module.exports = mongoose.model('Product', productSchema);
