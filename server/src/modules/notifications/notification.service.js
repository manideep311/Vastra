const Notification = require('../../models/Notification');
const { pagination } = require('../../utils/validate');

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

const listMyNotifications = async (userId, query = {}) => {
  const { page, limit, skip } = pagination(query, { defaultLimit: 20, maxLimit: 50 });
  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments({ userId, read: false }),
    Notification.countDocuments({ userId }),
  ]);
  return { notifications, unreadCount, pagination: { total, page, limit } };
};

const markRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { returnDocument: 'after' }
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
