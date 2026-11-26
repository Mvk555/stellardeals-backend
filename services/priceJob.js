const cron = require('node-cron');
const Product = require('../models/Product');
const { checkAlertsForProduct } = require('./alertService');

const roundPrice = (n) => (n < 1000 ? Math.round(n) : Math.round(n / 10) * 10);

const nudge = (price, mrp) => {
  const moved = price * (1 + (Math.random() * 0.06 - 0.03));
  const floor = mrp * 0.6;
  const ceil = mrp * 1.05;
  return roundPrice(Math.min(ceil, Math.max(floor, moved)));
};

const runPriceJob = async (count = 4) => {
  const ids = await Product.distinct('_id');
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const products = await Product.find({ _id: { $in: ids.slice(0, count) } }).select('+priceHistory');

  let changed = 0;
  let notifications = 0;

  for (const product of products) {
    if (!product.retailerLinks.length) continue;
    const before = product.bestPrice;
    const mrp = product.originalPrice || before;

    const links = product.retailerLinks.map(l => ({
      retailer: l.retailer,
      url: l.url,
      price: nudge(l.price, mrp)
    }));
    const after = Math.min(...links.map(l => l.price));

    if (after === before && links.every((l, i) => l.price === product.retailerLinks[i].price)) continue;

    await Product.updateOne({ _id: product._id }, {
      $set: { retailerLinks: links, price: after },
      ...(after !== before ? { $push: { priceHistory: { $each: [{ date: new Date(), price: after }], $slice: -1000 } } } : {})
    });

    if (after !== before) changed += 1;
    notifications += await checkAlertsForProduct(product._id, product.name, after);
  }

  return { checked: products.length, changed, notifications };
};

const startPriceJob = () => {
  if (process.env.PRICE_JOB_ENABLED === 'false') return null;
  const expression = process.env.PRICE_JOB_CRON || '*/10 * * * *';
  if (!cron.validate(expression)) {
    console.error(`⚠️ Invalid PRICE_JOB_CRON "${expression}", price job not started`);
    return null;
  }
  const task = cron.schedule(expression, async () => {
    try {
      const result = await runPriceJob();
      console.log(`⏱️ Price job: ${result.checked} checked, ${result.changed} best prices changed, ${result.notifications} notifications`);
    } catch (error) {
      console.error(`⚠️ Price job failed: ${error.message}`);
    }
  });
  console.log(`⏱️ Price job scheduled (${expression})`);
  return task;
};

module.exports = { runPriceJob, startPriceJob };
