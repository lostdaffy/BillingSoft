const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  hsnCode: {
    type: String,
    required: [true, 'HSN code is required']
  },
  defaultRate: {
    type: Number,
    required: [true, 'Default rate is required'],
    min: 0
  },
  description: {
    type: String,
    default: ''
  },
  unit: {
    type: String,
    default: 'Nos'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

productSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Product', productSchema);
