const { getSupplierOrders, getSupplierOrderById, updateOrderStatus } = require('../orders/order.service');

const listOrders = async (req, res, next) => {
  try {
    const orders = await getSupplierOrders(req.user.userId);
    res.status(200).json({ orders });
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await getSupplierOrderById(req.user.userId, req.params.id);
    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

const patchStatus = async (req, res, next) => {
  try {
    const order = await updateOrderStatus(req.user.userId, req.params.id, req.body.status);
    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

module.exports = { listOrders, getOrder, patchStatus };