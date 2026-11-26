const Alert = require('../models/Alert');
const Notification = require('../models/Notification');

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const checkAlertsForProduct = async (productId, name, bestPrice) => {
  const hits = await Alert.find({ product: productId, targetPrice: { $gte: bestPrice }, notified: false });

  if (hits.length > 0) {
    await Notification.insertMany(hits.map(a => ({
      user: a.user,
      product: productId,
      type: 'price_alert',
      message: `${name} is now ${rupees(bestPrice)}, at or below your target of ${rupees(a.targetPrice)}`
    })));
    await Alert.updateMany({ _id: { $in: hits.map(a => a._id) } }, { notified: true });
  }

  await Alert.updateMany({ product: productId, targetPrice: { $lt: bestPrice }, notified: true }, { notified: false });
  return hits.length;
};

module.exports = { checkAlertsForProduct };
