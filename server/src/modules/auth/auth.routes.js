const express = require('express');
const { register, login, me, logout } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rateLimit');

const router = express.Router();

router.get('/me', authenticate, me);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);

module.exports = router;
