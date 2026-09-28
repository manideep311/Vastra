const express = require('express');
const validateObjectIdParam = require('../../middleware/validateObjectId');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getForProduct, postReview } = require('./review.controller');

const router = express.Router();

router.param('productId', validateObjectIdParam);

router.get('/:productId', getForProduct); // public
router.post('/:productId', authenticate, authorize('buyer'), postReview);

module.exports = router;
