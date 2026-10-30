const express = require('express');
const validateObjectIdParam = require('../../middleware/validateObjectId');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { checkout, listMyOrders } = require('./order.controller');

const router = express.Router();

router.param('id', validateObjectIdParam);

router.use(authenticate, authorize('buyer'));

router.post('/checkout', checkout);
router.get('/', listMyOrders);

module.exports = router;