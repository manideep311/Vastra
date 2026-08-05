const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getMine, postItem, deleteItem } = require('./wishlist.controller');

const router = express.Router();

router.use(authenticate, authorize('buyer'));

router.get('/', getMine);
router.post('/items', postItem);
router.delete('/items/:productId', deleteItem);

module.exports = router;
