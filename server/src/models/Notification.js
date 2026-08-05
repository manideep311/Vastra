const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'order_status',
  'quote_request',
  'quote_response',
  'quote_accepted',
  'sample_request',
  'sample_status',
  'review',
  'system',
];

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true },
    message: { type: String },
    link: { type: String }, // frontend route to deep-link to, e.g. /buyer/orders/123
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
