const { getPublicProfile } = require('./supplier.service');

// Public storefront view of a supplier — no authentication required.
const getPublic = async (req, res, next) => {
  try {
    const data = await getPublicProfile(req.params.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublic };
