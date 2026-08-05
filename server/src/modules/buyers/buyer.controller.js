const { completeOnboarding, getProfile, addAddress, updateAddress, removeAddress } = require('./buyer.service');

const submitOnboarding = async (req, res, next) => {
  try {
    const profile = await completeOnboarding(req.user.userId, req.body);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await getProfile(req.user.userId);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
};

const postAddress = async (req, res, next) => {
  try {
    const profile = await addAddress(req.user.userId, req.body);
    res.status(201).json({ profile });
  } catch (error) {
    next(error);
  }
};

const patchAddress = async (req, res, next) => {
  try {
    const profile = await updateAddress(req.user.userId, req.params.addressId, req.body);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const profile = await removeAddress(req.user.userId, req.params.addressId);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitOnboarding, getMyProfile, postAddress, patchAddress, deleteAddress };