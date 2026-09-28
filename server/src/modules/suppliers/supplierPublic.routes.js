const express = require('express');
const validateObjectIdParam = require('../../middleware/validateObjectId');
const { getPublic } = require('./supplierPublic.controller');

// Mounted at /api/suppliers (plural) — a separate, unauthenticated namespace
// from the existing /api/supplier (singular) self-service routes, so nothing
// about the current authenticated supplier flows changes.
const router = express.Router();

router.param('id', validateObjectIdParam);

router.get('/:id', getPublic);

module.exports = router;
