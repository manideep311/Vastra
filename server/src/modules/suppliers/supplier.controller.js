const { completeOnboarding, getProfile, updateProfile, getDashboard } = require('./supplier.service');

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

const patchMyProfile = async (req, res, next) => {
  try {
    const profile = await updateProfile(req.user.userId, req.body);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
};

const dashboard = async (req, res, next) => {
  try {
    const data = await getDashboard(req.user.userId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = { submitOnboarding, getMyProfile, patchMyProfile, dashboard };