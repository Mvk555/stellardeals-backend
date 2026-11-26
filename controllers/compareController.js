const mongoose = require('mongoose');
const Product = require('../models/Product');

// GET /api/compare?ids=id1,id2,id3  (max 3, order preserved)
const compareProducts = async (req, res) => {
  try {
    const raw = req.query.ids;
    if (!raw) return res.status(400).json({ message: 'No product IDs provided' });

    const ids = [...new Set(
      String(raw).split(',').map(s => s.trim()).filter(id => mongoose.isValidObjectId(id))
    )].slice(0, 3);

    if (ids.length === 0) return res.status(400).json({ message: 'No valid product IDs provided' });

    const found = await Product.find({ _id: { $in: ids } });
    const ordered = ids.map(id => found.find(p => p.id === id)).filter(Boolean);

    if (ordered.length === 0) return res.status(404).json({ message: 'No products found' });
    res.json(ordered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { compareProducts };
