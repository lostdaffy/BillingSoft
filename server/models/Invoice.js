const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  srNo: Number,
  description: String,
  hsnCode: String,
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceType: {
    type: String,
    enum: ['QUOTATION', 'INVOICE', 'ESTIMATE'],
    default: 'INVOICE'
  },
  client: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    aadhaar: { type: String, default: '' },
    panUid: { type: String, default: '' },
    mobile: { type: String, default: '' },
    stateCode: { type: String, default: '' }
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  amountInWords: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT'
  },
  termsAndConditions: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

invoiceSchema.index({ userId: 1, invoiceNumber: 1 });
invoiceSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
