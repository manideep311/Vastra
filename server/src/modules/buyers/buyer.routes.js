const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { submitOnboarding, getMyProfile, postAddress, patchAddress, deleteAddress } = require('./buyer.controller');

const router = express.Router();

router.use(authenticate, authorize('buyer')); // applies to every route below

router.post('/onboarding', submitOnboarding);
router.get('/profile', getMyProfile);

router.post('/addresses', postAddress);
router.patch('/addresses/:addressId', patchAddress);
router.delete('/addresses/:addressId', deleteAddress);

module.exports = router;