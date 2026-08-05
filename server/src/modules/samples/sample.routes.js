const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { create, getMine } = require('./sample.controller');

const router = express.Router();

router.use(authenticate, authorize('buyer'));

router.post('/', create);
router.get('/', getMine);

module.exports = router;
