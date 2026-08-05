const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { checkout, listMyOrders, getMyOrder } = require('./order.controller');

const router = express.Router();

router.use(authenticate, authorize('buyer'));

router.post('/checkout', checkout);
router.get('/', listMyOrders);
router.get('/:id', getMyOrder);

module.exports = router;