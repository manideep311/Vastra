const mongoose = require('mongoose');

// One wishlist per buyer — a simple set of saved product references.
const wishlistSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);
