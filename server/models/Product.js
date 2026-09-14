const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    type: { type: String, enum: ['GOODS', 'SERVICE'], default: 'GOODS' },
    sku: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    hsnCode: { type: String, default: '', trim: true },
    unit: { type: String, default: 'Nos' },
    // Sale price. Named defaultRate for compatibility with v1 data.
    defaultRate: {
      type: Number,
      required: [true, 'Sale price is required'],
      min: 0
    },
    purchaseRate: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    trackStock: { type: Boolean, default: true },
    stock: { type: Number, default: 0 },
    lowStockAlert: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Product', productSchema);
