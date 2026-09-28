const express = require('express');
const { authenticate, optionalAuthenticate, authorize } = require('../../middleware/auth.middleware');
const { aiLimiter } = require('../../middleware/rateLimit');
const validateObjectIdParam = require('../../middleware/validateObjectId');
const { ping, search, chat, similar, compare, categorize, recommendations, suggestQuote } = require('./ai.controller');

const router = express.Router();

router.param('productId', validateObjectIdParam);

// Similar products is served from the cached vector index — no model call,
// so it stays public and outside the AI quota limiter.
router.get('/similar/:productId', similar);

// Everything below proxies to a paid inference API. The buyer assistant and
// search remain available to guests (browsing doesn't require an account),
// but are rate limited per IP — or per account when signed in.
router.post('/search', optionalAuthenticate, aiLimiter, search);
router.post('/chat', optionalAuthenticate, aiLimiter, chat);
router.post('/compare', optionalAuthenticate, aiLimiter, compare);

router.get('/ping', authenticate, aiLimiter, ping);
router.get('/recommendations', authenticate, authorize('buyer'), aiLimiter, recommendations);
router.post('/categorize', authenticate, authorize('supplier'), aiLimiter, categorize);
router.post('/suggest-quote', authenticate, authorize('supplier'), aiLimiter, suggestQuote);

module.exports = router;
