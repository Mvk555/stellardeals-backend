const Order = require('../models/Order');
const Product = require('../models/Product');
const { isId } = require('../utils/validId');

const restoreStock = async (items) => {
  for (const it of items) {
    await Product.updateOne({ _id: it.product }, { $inc: { stock: it.quantity } });
  }
};

// POST /api/orders  { items:[{product, quantity}], address }
// Prices, names and totals come from the DATABASE, never from the browser.
const createOrder = async (req, res) => {
  try {
    const { items, address } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'No items' });

    const lines = new Map();
    for (const it of items) {
      const pid = String(it.product || it.productId || it._id || it.id || '');
      const qty = Number(it.quantity);
      if (!isId(pid)) return res.status(400).json({ message: 'Invalid product in cart' });
      if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: 'Quantity must be a whole number, at least 1' });
      lines.set(pid, (lines.get(pid) || 0) + qty);
    }
    for (const qty of lines.values()) {
      if (qty > 10) return res.status(400).json({ message: 'You can order at most 10 units of one product' });
    }

    const products = await Promise.all([...lines.keys()].map(id => Product.findById(id)));
    if (products.some(p => !p)) return res.status(404).json({ message: 'A product in your cart no longer exists' });

    // reserve stock atomically: the update only succeeds if enough stock is still there
    const reserved = [];
    for (const p of products) {
      const qty = lines.get(String(p._id));
      const ok = await Product.findOneAndUpdate({ _id: p._id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
      if (!ok) {
        await restoreStock(reserved);
        return res.status(400).json({ message: `Insufficient stock for ${p.name}` });
      }
      reserved.push({ product: p._id, quantity: qty });
    }

    const orderItems = products.map(p => ({
      product: p._id, name: p.name, image: p.image, price: p.price, quantity: lines.get(String(p._id))
    }));
    const totalPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    let order;
    try {
      order = await Order.create({ user: req.user._id, items: orderItems, totalPrice, address });
    } catch (e) {
      await restoreStock(reserved);
      if (e.name === 'ValidationError') return res.status(400).json({ message: 'Please fill in the complete delivery address' });
      throw e;
    }
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Order not found' });
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const ownerId = order.user && order.user._id ? order.user._id.toString() : '';
    if (ownerId !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/cancel  (owner or admin, only while still Processing) -> stock goes back
const cancelOrder = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Order not found' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (order.status !== 'Processing') {
      return res.status(400).json({ message: `Only orders that are still Processing can be cancelled (this one is ${order.status})` });
    }
    await restoreStock(order.items);
    order.status = 'Cancelled';
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder, restoreStock };
