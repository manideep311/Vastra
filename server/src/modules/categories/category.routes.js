const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getAll, create } = require('./category.controller');

const router = express.Router();

router.get('/', getAll); // public — used to populate marketplace filters
router.post('/', authenticate, authorize('supplier'), create); // suppliers can suggest new categories

module.exports = router;
