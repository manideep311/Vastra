const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const SupplierProfile = require('../../models/SupplierProfile');
const { notify } = require('../notifications/notification.service');

const ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_dispatch', 'completed'];

const placeOrder = async (buyerId, shippingInfo) => {
  const cart = await Cart.findOne({ buyerId });
  if (!cart || cart.items.length === 0) {
    const error = new Error('Cart is empty');
    error.statusCode = 400;
    throw error;
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const groupedBySupplier = {};
  for (const item of cart.items) {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      const error = new Error('A product in your cart no longer exists');
      error.statusCode = 400;
      throw error;
    }
    if (product.stock < item.quantity) {
      const error = new Error(`Insufficient stock for ${product.name}`);
      error.statusCode = 400;
      throw error;
    }
    const supplierKey = product.supplierId.toString();
    if (!groupedBySupplier[supplierKey]) groupedBySupplier[supplierKey] = [];
    groupedBySupplier[supplierKey].push({ item, product });
  }

  const createdOrders = [];

  for (const supplierId of Object.keys(groupedBySupplier)) {
    const group = groupedBySupplier[supplierId];
    const items = group.map(({ item, product }) => ({
      productId: product._id,
      name: product.name,
      quantity: item.quantity,
      price: item.priceAtAdd,
      unit: product.unit || 'unit',
    }));
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await Order.create({
      buyerId,
      supplierId,
      items,
      shippingInfo,
      status: 'pending',
      statusHistory: [{ status: 'pending', timestamp: new Date() }],
      total,
    });

    for (const { item, product } of group) {
      product.stock -= item.quantity;
      if (product.stock === 0) product.status = 'out_of_stock';
      await product.save();
    }

    createdOrders.push(order);

    notify(supplierId, {
      type: 'order_status',
      title: 'New order received',
      message: `You received a new order worth ₹${total.toFixed(2)}.`,
      link: '/supplier/orders',
    });
  }

  cart.items = [];
  await cart.save();

  return createdOrders;
};

const getBuyerOrders = async (buyerId) => Order.find({ buyerId }).sort({ createdAt: -1 });

const getBuyerOrderById = async (buyerId, orderId) => {
  const order = await Order.findOne({ _id: orderId, buyerId });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const getSupplierOrders = async (supplierId) => Order.find({ supplierId }).sort({ createdAt: -1 });

const getSupplierOrderById = async (supplierId, orderId) => {
  const order = await Order.findOne({ _id: orderId, supplierId });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const updateOrderStatus = async (supplierId, orderId, newStatus) => {
  const order = await Order.findOne({ _id: orderId, supplierId });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const currentIndex = ORDER_STATUSES.indexOf(order.status);
  const newIndex = ORDER_STATUSES.indexOf(newStatus);

  if (newIndex === -1) {
    const error = new Error('Invalid status value');
    error.statusCode = 400;
    throw error;
  }
  if (newIndex <= currentIndex) {
    const error = new Error(`Cannot move status from '${order.status}' back to '${newStatus}'`);
    error.statusCode = 400;
    throw error;
  }

  order.status = newStatus;
  order.statusHistory.push({ status: newStatus, timestamp: new Date() });
  await order.save();

  if (newStatus === 'completed') {
    await SupplierProfile.findOneAndUpdate({ userId: supplierId }, { $inc: { completedOrders: 1 } });
  }

  notify(order.buyerId, {
    type: 'order_status',
    title: 'Order status updated',
    message: `Order #${order._id.toString().slice(-6)} is now "${newStatus.replace(/_/g, ' ')}".`,
    link: '/orders',
  });

  return order;
};

module.exports = {
  placeOrder,
  getBuyerOrders,
  getBuyerOrderById,
  getSupplierOrders,
  getSupplierOrderById,
  updateOrderStatus,
};