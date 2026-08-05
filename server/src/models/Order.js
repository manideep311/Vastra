const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // snapshot — survives even if product is later edited/deleted
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    unit: { type: String, default: 'unit' }, // snapshot of the product's selling unit (kg/meter/unit)
  },
  { _id: false }
);

const ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_dispatch', 'completed'];

const orderSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    shippingInfo: {
      address: { type: String, required: true },
      contact: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
    },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);