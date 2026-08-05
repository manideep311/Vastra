const SampleRequest = require('../../models/SampleRequest');
const Product = require('../../models/Product');
const { notify } = require('../notifications/notification.service');

const populateOpts = [
  { path: 'productId', select: 'name images category' },
  { path: 'buyerId', select: 'email' },
  { path: 'supplierId', select: 'email' },
];

const createSampleRequest = async (buyerId, { productId, quantity, shippingAddress, contact, message }) => {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const sample = await SampleRequest.create({
    buyerId,
    supplierId: product.supplierId,
    productId,
    quantity,
    shippingAddress,
    contact,
    message,
  });

  notify(product.supplierId, {
    type: 'sample_request',
    title: 'New sample request',
    message: `A buyer requested a sample of "${product.name}".`,
    link: '/supplier/samples',
  });

  return sample.populate(populateOpts);
};

const listBuyerSamples = async (buyerId) => SampleRequest.find({ buyerId }).populate(populateOpts).sort({ createdAt: -1 });

const listSupplierSamples = async (supplierId) =>
  SampleRequest.find({ supplierId }).populate(populateOpts).sort({ createdAt: -1 });

const updateSampleStatus = async (supplierId, sampleId, status) => {
  const sample = await SampleRequest.findOneAndUpdate(
    { _id: sampleId, supplierId },
    { status },
    { new: true, runValidators: true }
  );
  if (!sample) {
    const error = new Error('Sample request not found');
    error.statusCode = 404;
    throw error;
  }

  notify(sample.buyerId, {
    type: 'sample_status',
    title: 'Sample request update',
    message: `Your sample request status changed to "${status.replace(/_/g, ' ')}".`,
    link: '/buyer/samples',
  });

  return sample.populate(populateOpts);
};

module.exports = { createSampleRequest, listBuyerSamples, listSupplierSamples, updateSampleStatus };
