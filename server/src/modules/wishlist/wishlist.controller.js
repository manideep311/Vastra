const { getWishlist, addToWishlist, removeFromWishlist } = require('./wishlist.service');

const getMine = async (req, res, next) => {
  try {
    const wishlist = await getWishlist(req.user.userId);
    res.status(200).json({ wishlist });
  } catch (error) {
    next(error);
  }
};

const postItem = async (req, res, next) => {
  try {
    const wishlist = await addToWishlist(req.user.userId, req.body.productId);
    res.status(200).json({ wishlist });
  } catch (error) {
    next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const wishlist = await removeFromWishlist(req.user.userId, req.params.productId);
    res.status(200).json({ wishlist });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMine, postItem, deleteItem };
