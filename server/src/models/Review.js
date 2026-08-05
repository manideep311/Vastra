const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // present if tied to a completed order
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per buyer per product — resubmitting updates the existing review.
reviewSchema.index({ productId: 1, buyerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
