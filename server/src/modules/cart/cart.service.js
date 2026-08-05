const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const { getEffectivePrice } = require('../products/product.service');

// Populated cart items always carry moq/unit so the client can enforce and
// label minimum order quantities without a second round trip.
const CART_ITEM_POPULATE = 'name images category price stock status unit moq';

// Internal only — NOT populated, so productId comparisons work correctly.
const findOrCreateRawCart = async (buyerId) => {
  let cart = await Cart.findOne({ buyerId });
  if (!cart) {
    cart = await Cart.create({ buyerId, items: [] });
  }
  return cart;
};

// Exported for the GET /cart route — always populated, safe to send to the client.
const getOrCreateCart = async (buyerId) => {
  const cart = await findOrCreateRawCart(buyerId);
  return cart.populate('items.productId', CART_ITEM_POPULATE);
};

// A product's real minimum — unset/1 means no minimum at all.
const effectiveMoq = (product) => (product.moq > 1 ? product.moq : 1);

const assertMeetsMoq = (product, quantity) => {
  const moq = effectiveMoq(product);
  if (quantity < moq) {
    const error = new Error(`Minimum order is ${moq} ${product.unit || 'unit'}${moq === 1 ? '' : 's'}`);
    error.statusCode = 400;
    throw error;
  }
};

const addItem = async (buyerId, productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  if (product.stock < quantity) {
    const error = new Error('Insufficient stock');
    error.statusCode = 400;
    throw error;
  }

  const cart = await findOrCreateRawCart(buyerId);
  const existingItem = cart.items.find((item) => item.productId.toString() === productId);
  const newTotalQuantity = existingItem ? existingItem.quantity + quantity : quantity;

  // MOQ applies to the total quantity of this product in the cart, not just
  // the amount being added in this call — matches how the buyer will see it.
  assertMeetsMoq(product, newTotalQuantity);

  if (existingItem) {
    existingItem.quantity = newTotalQuantity;
    existingItem.priceAtAdd = getEffectivePrice(product, existingItem.quantity); // re-price against bulk tiers
  } else {
    cart.items.push({ productId, quantity, priceAtAdd: getEffectivePrice(product, quantity) });
  }

  await cart.save();
  return cart.populate('items.productId', CART_ITEM_POPULATE);
};

const updateItemQuantity = async (buyerId, productId, quantity) => {
  const cart = await findOrCreateRawCart(buyerId);
  const item = cart.items.find((item) => item.productId.toString() === productId);
  if (!item) {
    const error = new Error('Item not in cart');
    error.statusCode = 404;
    throw error;
  }

  const product = await Product.findById(productId);
  if (product) {
    assertMeetsMoq(product, quantity);
    item.priceAtAdd = getEffectivePrice(product, quantity); // re-price against bulk tiers
  }

  item.quantity = quantity;
  await cart.save();
  return cart.populate('items.productId', CART_ITEM_POPULATE);
};

const removeItem = async (buyerId, productId) => {
  const cart = await findOrCreateRawCart(buyerId);
  cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
  await cart.save();
  return cart.populate('items.productId', CART_ITEM_POPULATE);
};

module.exports = { getOrCreateCart, addItem, updateItemQuantity, removeItem };
