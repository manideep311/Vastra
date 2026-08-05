const Wishlist = require('../../models/Wishlist');

const findOrCreateRaw = async (buyerId) => {
  let wishlist = await Wishlist.findOne({ buyerId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ buyerId, productIds: [] });
  }
  return wishlist;
};

const getWishlist = async (buyerId) => {
  const wishlist = await findOrCreateRaw(buyerId);
  return wishlist.populate('productIds', 'name images category price stock status');
};

const addToWishlist = async (buyerId, productId) => {
  const wishlist = await findOrCreateRaw(buyerId);
  if (!wishlist.productIds.some((id) => id.toString() === productId)) {
    wishlist.productIds.push(productId);
    await wishlist.save();
  }
  return wishlist.populate('productIds', 'name images category price stock status');
};

const removeFromWishlist = async (buyerId, productId) => {
  const wishlist = await findOrCreateRaw(buyerId);
  wishlist.productIds = wishlist.productIds.filter((id) => id.toString() !== productId);
  await wishlist.save();
  return wishlist.populate('productIds', 'name images category price stock status');
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
