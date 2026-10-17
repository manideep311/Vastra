const express = require('express');
const { register, login, me, logout } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { loginLimiter, registerLimiter } = require('../../middleware/rateLimit');

const router = express.Router();

router.get('/me', authenticate, me);
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);

module.exports = router;
