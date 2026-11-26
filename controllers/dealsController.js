const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const DAY = 24 * 60 * 60 * 1000;

const getDeals = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 24);
  const since = Date.now() - 30 * DAY;
  const products = await Product.find().select('+priceHistory');

  const drops = [];
  const lows = [];

  for (const product of products) {
    const history = product.priceHistory || [];
    if (history.length < 2) continue;
    const current = product.bestPrice;

    const recent = history.filter(h => new Date(h.date).getTime() >= since).map(h => h.price);
    const reference = recent.length ? Math.max(...recent) : null;
    const lowestBefore = Math.min(...history.slice(0, -1).map(h => h.price));

    const base = product.toObject();
    delete base.priceHistory;

    if (reference && reference > current) {
      drops.push({ ...base, previousPrice: reference, dropPercent: Math.round(((reference - current) / reference) * 100) });
    }
    if (current <= lowestBefore) {
      lows.push({ ...base, lowestBefore, dropPercent: Math.round(((base.originalPrice || current) - current) / (base.originalPrice || current) * 100) });
    }
  }

  drops.sort((a, b) => b.dropPercent - a.dropPercent);
  lows.sort((a, b) => b.dropPercent - a.dropPercent);

  res.json({ biggestDrops: drops.slice(0, limit), allTimeLows: lows.slice(0, limit) });
});

module.exports = { getDeals };
