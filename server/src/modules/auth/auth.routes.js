const express = require('express');
const { register, login, logout } = require('./auth.controller');

const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;