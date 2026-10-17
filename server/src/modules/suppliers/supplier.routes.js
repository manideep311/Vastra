const express = require('express');
const validateObjectIdParam = require('../../middleware/validateObjectId');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { submitOnboarding, getMyProfile, patchMyProfile, dashboard } = require('./supplier.controller');
const { listOrders, getOrder, patchStatus } = require('./supplierOrder.controller');
const { listQuotes, getQuote, respond, decline } = require('./supplierQuote.controller');

const router = express.Router();

router.param('id', validateObjectIdParam);

router.use(authenticate, authorize('supplier'));

router.get('/dashboard', dashboard);
router.post('/onboarding', submitOnboarding);
router.get('/profile', getMyProfile);
router.patch('/profile', patchMyProfile);

router.get('/orders', listOrders);
router.get('/orders/:id', getOrder);
router.patch('/orders/:id/status', patchStatus);

router.get('/quotes', listQuotes);
router.get('/quotes/:id', getQuote);
router.patch('/quotes/:id/respond', respond);
router.patch('/quotes/:id/decline', decline);

module.exports = router;