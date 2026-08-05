const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true },
    category: { type: String, required: true }, // category name, kept simple for now
    description: { type: String },
    images: [{ type: String }], // image URLs
    colors: [{ type: String }],
    specifications: { type: mongoose.Schema.Types.Mixed }, // flexible key-value pairs
    stock: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['available', 'out_of_stock'],
      default: 'available',
    },
    embeddingVector: { type: [Number], default: undefined }, // populated later by AI service

    // --- B2B / textile extensions (all optional, additive — safe for existing rows) ---
    unit: { type: String, default: 'meter' }, // e.g. meter, yard, kg, piece, roll
    moq: { type: Number, default: 1 }, // minimum order quantity
    leadTime: { type: String }, // e.g. "10-15 days"
    gsm: { type: Number }, // fabric weight (grams per square meter)
    fabricWidth: { type: String }, // e.g. "44 in", "58 in", "150 cm"
    rollLength: { type: String }, // e.g. "25 meters/roll"
    fabricComposition: { type: String }, // e.g. "100% Cotton", "80/20 Poly-Cotton"
    tags: [{ type: String }], // free-form search/filter tags
    priceTiers: [
      {
        _id: false,
        minQty: { type: Number, required: true }, // quantity at/above which this price applies
        price: { type: Number, required: true }, // price per unit at this tier
      },
    ],
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index for basic keyword search across name and description
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);