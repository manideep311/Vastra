const { placeOrder, getBuyerOrders, getBuyerOrderById } = require('./order.service');

const checkout = async (req, res, next) => {
  try {
    const orders = await placeOrder(req.user.userId, req.body.shippingInfo);
    res.status(201).json({ orders });
  } catch (error) {
    next(error);
  }
};

const listMyOrders = async (req, res, next) => {
  try {
    const orders = await getBuyerOrders(req.user.userId);
    res.status(200).json({ orders });
  } catch (error) {
    next(error);
  }
};

const getMyOrder = async (req, res, next) => {
  try {
    const order = await getBuyerOrderById(req.user.userId, req.params.id);
    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkout, listMyOrders, getMyOrder };