const { getOrCreateCart, addItem, updateItemQuantity, removeItem } = require('./cart.service');

const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.userId);
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

const postItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await addItem(req.user.userId, productId, quantity);
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

const patchItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const cart = await updateItemQuantity(req.user.userId, req.params.productId, quantity);
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const cart = await removeItem(req.user.userId, req.params.productId);
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, postItem, patchItem, deleteItem };