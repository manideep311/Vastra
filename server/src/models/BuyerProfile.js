const mongoose = require('mongoose');

const buyerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one profile per user
    },
    businessType: { type: String },
    industry: { type: String },
    categoriesOfInterest: [{ type: String }],
    preferredFabricTypes: [{ type: String }],
    typicalOrderQuantity: { type: String },
    budgetRange: { type: String },

    // --- Address book (additive) ---
    addresses: [
      {
        label: { type: String, default: 'Default' }, // e.g. "Warehouse", "HQ"
        address: { type: String, required: true },
        contact: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('BuyerProfile', buyerProfileSchema);