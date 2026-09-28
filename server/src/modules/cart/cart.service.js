const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const { getEffectivePrice } = require('../products/product.service');
const { httpError, assertObjectId, requireNumber } = require('../../utils/validate');

// Populated cart items always carry moq/unit so the client can enforce and
// label minimum order quantities without a second round trip.
const CART_ITEM_POPULATE = 'name images category price priceTiers stock status unit moq supplierId';

// Fabric sold by weight/length can be ordered in fractions; everything else
// is whole units only. Mirrors client/src/utils/units.js.
const DECIMAL_UNITS = new Set(['kg', 'meter']);

// Internal only — NOT populated, so productId comparisons work correctly.
const findOrCreateRawCart = async (buyerId) => {
  let cart = await Cart.findOne({ buyerId });
  if (!cart) {
    cart = await Cart.create({ buyerId, items: [] });
  }
  return cart;
};

// Exported for the GET /cart route — always populated, safe to send to the client.
// Lines whose product was deleted by the supplier are dropped here, so the
// client never receives an item with a null product.
const getOrCreateCart = async (buyerId) => {
  const cart = await findOrCreateRawCart(buyerId);
  await cart.populate('items.productId', CART_ITEM_POPULATE);
  if (cart.items.some((item) => !item.productId)) {
    cart.items = cart.items.filter((item) => item.productId);
    await cart.save();
  }
  return cart;
};

// A product's real minimum — unset/1 means no minimum at all.
const effectiveMoq = (product) => (product.moq > 1 ? product.moq : 1);

const unitLabel = (product, qty) => {
  const unit = product.unit || 'unit';
  return unit === 'kg' || qty === 1 ? unit : `${unit}s`;
};

const parseQuantity = (value, product) => {
  const quantity = requireNumber(value, 'Quantity', { min: 0.01, max: 1_000_000 });
  if (!DECIMAL_UNITS.has(product.unit) && !Number.isInteger(quantity)) {
    throw httpError(400, `${product.name} is sold in whole ${unitLabel(product, 2)}`);
  }
  return Math.round(quantity * 100) / 100;
};

const assertMeetsMoq = (product, quantity) => {
  const moq = effectiveMoq(product);
  if (quantity < moq) {
    throw httpError(400, `Minimum order is ${moq} ${unitLabel(product, moq)}`);
  }
};

const assertInStock = (product, quantity) => {
  if (product.status !== 'available' || product.stock <= 0) {
    throw httpError(400, `${product.name} is currently out of stock`);
  }
  if (quantity > product.stock) {
    throw httpError(400, `Only ${product.stock} ${unitLabel(product, product.stock)} of ${product.name} available`);
  }
};

const loadProduct = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) throw httpError(404, 'Product not found');
  return product;
};

const addItem = async (buyerId, productId, rawQuantity) => {
  assertObjectId(productId, 'product');
  const product = await loadProduct(productId);
  const quantity = parseQuantity(rawQuantity, product);

  const cart = await findOrCreateRawCart(buyerId);
  const existingItem = cart.items.find((item) => item.productId.toString() === productId);
  const newTotalQuantity = existingItem ? existingItem.quantity + quantity : quantity;

  // MOQ and stock apply to the total quantity of this product in the cart,
  // not just the amount being added in this call.
  assertMeetsMoq(product, newTotalQuantity);
  assertInStock(product, newTotalQuantity);

  if (existingItem) {
    existingItem.quantity = newTotalQuantity;
    existingItem.priceAtAdd = getEffectivePrice(product, newTotalQuantity); // re-price against bulk tiers
    existingItem.quoteId = undefined; // quantity changed — the quoted terms no longer apply
  } else {
    cart.items.push({ productId, quantity, priceAtAdd: getEffectivePrice(product, quantity) });
  }

  await cart.save();
  return cart.populate('items.productId', CART_ITEM_POPULATE);
};

const updateItemQuantity = async (buyerId, productId, rawQuantity) => {
  const cart = await findOrCreateRawCart(buyerId);
  const item = cart.items.find((item) => item.productId.toString() === productId);
  if (!item) throw httpError(404, 'Item not in cart');

  const product = await loadProduct(productId);
  const quantity = parseQuantity(rawQuantity, product);
  assertMeetsMoq(product, quantity);
  assertInStock(product, quantity);

  item.quantity = quantity;
  item.priceAtAdd = getEffectivePrice(product, quantity); // re-price against bulk tiers
  item.quoteId = undefined;
  await cart.save();
  return cart.populate('items.productId', CART_ITEM_POPULATE);
};

const removeItem = async (buyerId, productId) => {
  const cart = await findOrCreateRawCart(buyerId);
  cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
  await cart.save();
  return cart.populate('items.productId', CART_ITEM_POPULATE);
};

module.exports = { getOrCreateCart, addItem, updateItemQuantity, removeItem, effectiveMoq, assertMeetsMoq };
