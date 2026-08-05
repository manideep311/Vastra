const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ping, search, chat, similar, compare, categorize, recommendations, suggestQuote } = require('./ai.controller');

const router = express.Router();

router.get('/ping', ping);
router.post('/search', search);
router.post('/chat', chat);
router.get('/similar/:productId', similar);
router.post('/compare', compare);
router.post('/categorize', categorize);
router.get('/recommendations', authenticate, authorize('buyer'), recommendations);
router.post('/suggest-quote', authenticate, authorize('supplier'), suggestQuote);

module.exports = router;