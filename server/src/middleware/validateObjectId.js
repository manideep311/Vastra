const { isObjectId } = require('../utils/validate');

// Used with router.param(...) so every route that takes an :id-style param
// rejects malformed ids with a clean 400 before any database work happens.
const validateObjectIdParam = (req, res, next, value, name) => {
  if (!isObjectId(value)) {
    return res.status(400).json({ error: `Invalid ${name}` });
  }
  next();
};

module.exports = validateObjectIdParam;
