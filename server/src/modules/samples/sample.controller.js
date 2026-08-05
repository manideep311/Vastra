const { createSampleRequest, listBuyerSamples } = require('./sample.service');

const create = async (req, res, next) => {
  try {
    const { productId, quantity, shippingAddress, contact, message } = req.body;
    const sample = await createSampleRequest(req.user.userId, { productId, quantity, shippingAddress, contact, message });
    res.status(201).json({ sample });
  } catch (error) {
    next(error);
  }
};

const getMine = async (req, res, next) => {
  try {
    const samples = await listBuyerSamples(req.user.userId);
    res.status(200).json({ samples });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getMine };
