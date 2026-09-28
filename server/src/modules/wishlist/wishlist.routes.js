const express = require('express');
const validateObjectIdParam = require('../../middleware/validateObjectId');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getMine, postItem, deleteItem } = require('./wishlist.controller');

const router = express.Router();

router.param('productId', validateObjectIdParam);

router.use(authenticate, authorize('buyer'));

router.get('/', getMine);
router.post('/items', postItem);
router.delete('/items/:productId', deleteItem);

module.exports = router;
