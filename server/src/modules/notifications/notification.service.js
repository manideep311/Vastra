const Notification = require('../../models/Notification');

// Best-effort notification creation — used internally by other modules
// (orders, quotes, samples, reviews) as a side effect of their main action.
// Never throws: a notification failure should never break the primary flow.
const notify = async (userId, { type = 'system', title, message, link }) => {
  try {
    await Notification.create({ userId, type, title, message, link });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

const listMyNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Notification.countDocuments({ userId, read: false }),
    Notification.countDocuments({ userId }),
  ]);
  return { notifications, unreadCount, pagination: { total, page: Number(page), limit: Number(limit) } };
};

const markRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }
  return notification;
};

const markAllRead = async (userId) => {
  await Notification.updateMany({ userId, read: false }, { read: true });
  return { message: 'All notifications marked as read' };
};

module.exports = { notify, listMyNotifications, markRead, markAllRead };
