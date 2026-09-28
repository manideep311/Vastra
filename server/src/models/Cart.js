const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    priceAtAdd: { type: Number, required: true }, // price snapshot at time of adding
    // Set when the line came from an accepted quote — checkout honours the
    // negotiated price instead of re-pricing it against the live catalog.
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
  },
  { _id: false } // no need for a separate _id per line item
);

const cartSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one active cart per buyer
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);