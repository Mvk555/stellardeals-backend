const Notification = require('../models/Notification');
const { isId } = require('../utils/validId');
const asyncHandler = require('../utils/asyncHandler');

const getMyNotifications = asyncHandler(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).populate('product', 'name image'),
    Notification.countDocuments({ user: req.user._id, read: false })
  ]);
  res.json({ notifications, unread });
});

const markRead = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Notification not found' });
  const note = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!note) return res.status(404).json({ message: 'Notification not found' });
  res.json(note);
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});

module.exports = { getMyNotifications, markRead, markAllRead };
