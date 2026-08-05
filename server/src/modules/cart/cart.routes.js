const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getCart, postItem, patchItem, deleteItem } = require('./cart.controller');

const router = express.Router();

router.use(authenticate, authorize('buyer'));

router.get('/', getCart);
router.post('/items', postItem);
router.patch('/items/:productId', patchItem);
router.delete('/items/:productId', deleteItem);

module.exports = router;