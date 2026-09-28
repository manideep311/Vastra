const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const SupplierProfile = require('../../models/SupplierProfile');
const { notify } = require('../notifications/notification.service');
const { getEffectivePrice } = require('../products/product.service');
const { effectiveMoq } = require('../cart/cart.service');
const { httpError, requireString, oneOf } = require('../../utils/validate');

const ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_dispatch', 'completed'];

const validateShippingInfo = (shippingInfo) => ({
  address: requireString(shippingInfo?.address, 'Delivery address', { min: 10, max: 500 }),
  contact: requireString(shippingInfo?.contact, 'Contact number', { min: 7, max: 30 }),
});

// Decrements stock only if enough is still there — two buyers checking out
// the last roll at the same moment can't both succeed.
const reserveStock = async (productId, quantity) => {
  const updated = await Product.findOneAndUpdate(
    { _id: productId, status: 'available', stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { returnDocument: 'after', projection: { stock: 1 } }
  );
  if (updated && updated.stock <= 0) {
    await Product.updateOne({ _id: productId, stock: { $lte: 0 } }, { status: 'out_of_stock' });
  }
  return Boolean(updated);
};

const releaseStock = (reservations) =>
  Promise.all(
    reservations.map(({ productId, quantity }) =>
      Product.updateOne({ _id: productId }, { $inc: { stock: quantity }, status: 'available' })
    )
  );

const placeOrder = async (buyerId, rawShippingInfo) => {
  const shippingInfo = validateShippingInfo(rawShippingInfo);

  const cart = await Cart.findOne({ buyerId });
  if (!cart || cart.items.length === 0) throw httpError(400, 'Cart is empty');

  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // Re-validate every line against the live catalog. Prices are recomputed
  // server-side at checkout (only accepted-quote lines keep their negotiated
  // price), so nothing the client sends — or a stale cart — sets the total.
  const groupedBySupplier = {};
  for (const item of cart.items) {
    const product = productMap.get(item.productId.toString());
    if (!product) throw httpError(400, 'A product in your cart is no longer available. Please remove it and try again.');
    if (product.status !== 'available' || product.stock < item.quantity) {
      throw httpError(400, `Only ${Math.max(product.stock, 0)} ${product.unit || 'unit'} of ${product.name} left — please update your cart`);
    }
    if (!item.quoteId && item.quantity < effectiveMoq(product)) {
      throw httpError(400, `Minimum order for ${product.name} is ${effectiveMoq(product)} ${product.unit || 'unit'}`);
    }
    const price = item.quoteId ? item.priceAtAdd : getEffectivePrice(product, item.quantity);
    const supplierKey = product.supplierId.toString();
    if (!groupedBySupplier[supplierKey]) groupedBySupplier[supplierKey] = [];
    groupedBySupplier[supplierKey].push({ item, product, price });
  }

  // Reserve all stock first; if any line loses a race, roll back and stop
  // before a single order is created.
  const reservations = [];
  for (const group of Object.values(groupedBySupplier)) {
    for (const { item, product } of group) {
      const reserved = await reserveStock(product._id, item.quantity);
      if (!reserved) {
        await releaseStock(reservations);
        throw httpError(409, `${product.name} just sold out or changed stock. Please review your cart.`);
      }
      reservations.push({ productId: product._id, quantity: item.quantity });
    }
  }

  const settled = await Promise.allSettled(
    Object.entries(groupedBySupplier).map(([supplierId, group]) => {
      const items = group.map(({ item, product, price }) => ({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price,
        unit: product.unit || 'unit',
      }));
      const total = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
      return Order.create({
        buyerId,
        supplierId,
        items,
        shippingInfo,
        status: 'pending',
        statusHistory: [{ status: 'pending', timestamp: new Date() }],
        total,
      });
    })
  );

  // All-or-nothing: if any supplier's order failed to save, undo the others
  // and return the reserved stock, so the cart stays intact for a retry.
  const failure = settled.find((s) => s.status === 'rejected');
  if (failure) {
    const saved = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value._id);
    if (saved.length) await Order.deleteMany({ _id: { $in: saved } });
    await releaseStock(reservations);
    throw failure.reason;
  }
  const createdOrders = settled.map((s) => s.value);

  cart.items = [];
  await cart.save();

  for (const order of createdOrders) {
    notify(order.supplierId, {
      type: 'order_status',
      title: 'New order received',
      message: `You received a new order worth ₹${order.total.toFixed(2)}.`,
      link: '/supplier/orders',
    });
  }

  return createdOrders;
};

const getBuyerOrders = async (buyerId) => Order.find({ buyerId }).sort({ createdAt: -1 }).limit(200).lean();

const getBuyerOrderById = async (buyerId, orderId) => {
  const order = await Order.findOne({ _id: orderId, buyerId });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const getSupplierOrders = async (supplierId) => Order.find({ supplierId }).sort({ createdAt: -1 }).limit(200).lean();

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

  oneOf(newStatus, ORDER_STATUSES, 'status value');
  const currentIndex = ORDER_STATUSES.indexOf(order.status);
  const newIndex = ORDER_STATUSES.indexOf(newStatus);

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