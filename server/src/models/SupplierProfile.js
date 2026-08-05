const mongoose = require('mongoose');

const supplierProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: { type: String, required: true },
    businessType: { type: String },
    contactInfo: {
      phone: { type: String },
      email: { type: String },
    },
    businessAddress: { type: String },
    operatingHours: { type: String },
    productCategories: [{ type: String }],
    fabricTypesOffered: [{ type: String }],
    moq: { type: Number },

    // --- Trust / directory extensions (additive) ---
    isVerified: { type: Boolean, default: false },
    verificationBadge: { type: String, enum: ['none', 'verified', 'premium'], default: 'none' },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    about: { type: String }, // short public-facing company description
    logoUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupplierProfile', supplierProfileSchema);