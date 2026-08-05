const { listSupplierSamples, updateSampleStatus } = require('../samples/sample.service');

const listSamples = async (req, res, next) => {
  try {
    const samples = await listSupplierSamples(req.user.userId);
    res.status(200).json({ samples });
  } catch (error) {
    next(error);
  }
};

const patchStatus = async (req, res, next) => {
  try {
    const sample = await updateSampleStatus(req.user.userId, req.params.id, req.body.status);
    res.status(200).json({ sample });
  } catch (error) {
    next(error);
  }
};

module.exports = { listSamples, patchStatus };
