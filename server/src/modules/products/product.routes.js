const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload.middleware');
const { getAll, getOne, create, update, remove, getMine, uploadImages, getCategories } = require('./product.controller');

const router = express.Router();

router.get('/', getAll);
router.get('/meta/categories', getCategories);
router.get('/mine', authenticate, authorize('supplier'), getMine);
router.post('/', authenticate, authorize('supplier'), create);
router.patch('/:id', authenticate, authorize('supplier'), update);
router.delete('/:id', authenticate, authorize('supplier'), remove);
router.post('/:id/images', authenticate, authorize('supplier'), upload.array('images', 5), uploadImages);
router.get('/:id', getOne);

module.exports = router;