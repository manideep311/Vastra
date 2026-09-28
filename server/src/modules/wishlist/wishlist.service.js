const Wishlist = require('../../models/Wishlist');
const Product = require('../../models/Product');
const { httpError, assertObjectId } = require('../../utils/validate');

const WISHLIST_FIELDS = 'name images category price stock status unit moq ratingAverage ratingCount';
const MAX_WISHLIST_ITEMS = 200;

const findOrCreateRaw = async (buyerId) => {
  let wishlist = await Wishlist.findOne({ buyerId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ buyerId, productIds: [] });
  }
  return wishlist;
};

const getWishlist = async (buyerId) => {
  const wishlist = await findOrCreateRaw(buyerId);
  await wishlist.populate('productIds', WISHLIST_FIELDS);
  // Drop references to products that have since been deleted.
  wishlist.productIds = wishlist.productIds.filter(Boolean);
  return wishlist;
};

const addToWishlist = async (buyerId, productId) => {
  assertObjectId(productId, 'product');
  if (!(await Product.exists({ _id: productId }))) throw httpError(404, 'Product not found');
  const wishlist = await findOrCreateRaw(buyerId);
  if (!wishlist.productIds.some((id) => id.toString() === productId)) {
    if (wishlist.productIds.length >= MAX_WISHLIST_ITEMS) throw httpError(400, 'Your wishlist is full');
    wishlist.productIds.push(productId);
    await wishlist.save();
  }
  return wishlist.populate('productIds', WISHLIST_FIELDS);
};

const removeFromWishlist = async (buyerId, productId) => {
  const wishlist = await findOrCreateRaw(buyerId);
  wishlist.productIds = wishlist.productIds.filter((id) => id.toString() !== productId);
  await wishlist.save();
  return wishlist.populate('productIds', WISHLIST_FIELDS);
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
