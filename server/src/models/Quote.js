const mongoose = require('mongoose');

// Bulk quote request (RFQ) between a buyer and a supplier for a specific product.
// The buyer requests a quantity, an optional target price and a note; the
// supplier responds with a price and lead time; the buyer accepts or rejects.

const QUOTE_STATUSES = ['pending', 'quoted', 'accepted', 'rejected', 'expired'];

const quoteSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    requestedQuantity: { type: Number, required: true, min: 1 },
    targetPrice: { type: Number }, // buyer's hoped-for price per unit, optional
    message: { type: String }, // buyer's opening note
    status: { type: String, enum: QUOTE_STATUSES, default: 'pending' },
    quotedPrice: { type: Number }, // supplier's offered price per unit
    quotedLeadTime: { type: String }, // e.g. "10-15 days"
    supplierMessage: { type: String },
    validUntil: { type: Date },
  },
  { timestamps: true }
);

quoteSchema.index({ buyerId: 1, createdAt: -1 });
quoteSchema.index({ supplierId: 1, createdAt: -1 });

module.exports = mongoose.model('Quote', quoteSchema);
module.exports.QUOTE_STATUSES = QUOTE_STATUSES;
