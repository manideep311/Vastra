const SampleRequest = require('../../models/SampleRequest');
const Product = require('../../models/Product');
const { notify } = require('../notifications/notification.service');
const { SAMPLE_STATUSES } = require('../../models/SampleRequest');
const { httpError, assertObjectId, optionalNumber, requireString, optionalString, oneOf } = require('../../utils/validate');

const populateOpts = [
  { path: 'productId', select: 'name images category' },
  { path: 'buyerId', select: 'email' },
  { path: 'supplierId', select: 'email' },
];

const createSampleRequest = async (buyerId, input) => {
  const productId = assertObjectId(input.productId, 'product');
  const quantity = optionalNumber(input.quantity, 'Sample quantity', { min: 1, max: 10, integer: true }) ?? 1;
  const shippingAddress = requireString(input.shippingAddress, 'Shipping address', { min: 10, max: 500 });
  const contact = requireString(input.contact, 'Contact', { min: 7, max: 30 });
  const message = optionalString(input.message, 'Message', { max: 1000 });

  const product = await Product.findById(productId).select('supplierId name');
  if (!product) throw httpError(404, 'Product not found');

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
  oneOf(status, SAMPLE_STATUSES, 'sample status');
  const sample = await SampleRequest.findOneAndUpdate(
    { _id: sampleId, supplierId },
    { status },
    { returnDocument: 'after', runValidators: true }
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
