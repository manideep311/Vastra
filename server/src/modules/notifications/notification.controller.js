const { listMyNotifications, markRead, markAllRead } = require('./notification.service');

const getMine = async (req, res, next) => {
  try {
    const result = await listMyNotifications(req.user.userId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchRead = async (req, res, next) => {
  try {
    const notification = await markRead(req.user.userId, req.params.id);
    res.status(200).json({ notification });
  } catch (error) {
    next(error);
  }
};

const patchReadAll = async (req, res, next) => {
  try {
    const result = await markAllRead(req.user.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMine, patchRead, patchReadAll };
