const mongoose = require('mongoose');

const SAMPLE_STATUSES = ['pending', 'approved', 'shipped', 'delivered', 'declined'];

const sampleRequestSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    shippingAddress: { type: String, required: true },
    contact: { type: String, required: true },
    message: { type: String },
    status: { type: String, enum: SAMPLE_STATUSES, default: 'pending' },
  },
  { timestamps: true }
);

sampleRequestSchema.index({ buyerId: 1, createdAt: -1 });
sampleRequestSchema.index({ supplierId: 1, createdAt: -1 });

module.exports = mongoose.model('SampleRequest', sampleRequestSchema);
module.exports.SAMPLE_STATUSES = SAMPLE_STATUSES;
