const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { create, getMine, getOne, accept, reject, message } = require('./quote.controller');

const router = express.Router();

router.use(authenticate, authorize('buyer'));

router.post('/', create);
router.get('/', getMine);
router.get('/:id', getOne);
router.patch('/:id/accept', accept);
router.patch('/:id/reject', reject);
router.post('/:id/messages', message);

module.exports = router;
