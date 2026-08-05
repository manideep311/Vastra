const express = require('express');
const { authenticate } = require('../../middleware/auth.middleware');
const { getMine, patchRead, patchReadAll } = require('./notification.controller');

const router = express.Router();

router.use(authenticate); // available to both buyers and suppliers

router.get('/', getMine);
router.patch('/read-all', patchReadAll);
router.patch('/:id/read', patchRead);

module.exports = router;
