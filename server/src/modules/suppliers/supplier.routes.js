const express = require('express');
const validateObjectIdParam = require('../../middleware/validateObjectId');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { submitOnboarding, getMyProfile, patchMyProfile, dashboard } = require('./supplier.controller');
const { listOrders, patchStatus } = require('./supplierOrder.controller');
const { listQuotes, respond, decline } = require('./supplierQuote.controller');

const router = express.Router();

router.param('id', validateObjectIdParam);

router.use(authenticate, authorize('supplier'));

router.get('/dashboard', dashboard);
router.post('/onboarding', submitOnboarding);
router.get('/profile', getMyProfile);
router.patch('/profile', patchMyProfile);

router.get('/orders', listOrders);
router.patch('/orders/:id/status', patchStatus);

router.get('/quotes', listQuotes);
router.patch('/quotes/:id/respond', respond);
router.patch('/quotes/:id/decline', decline);

module.exports = router;