const express = require('express');
const validateObjectIdParam = require('../../middleware/validateObjectId');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { create, getMine, accept, reject } = require('./quote.controller');

const router = express.Router();

router.param('id', validateObjectIdParam);

router.use(authenticate, authorize('buyer'));

router.post('/', create);
router.get('/', getMine);
router.patch('/:id/accept', accept);
router.patch('/:id/reject', reject);

module.exports = router;
