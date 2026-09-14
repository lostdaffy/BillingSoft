const mongoose = require('mongoose');
const { PAYMENT_MODES } = require('../utils/constants');

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: { type: String, required: [true, 'Category is required'], trim: true },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be positive'] },
    gstAmount: { type: Number, default: 0, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    paymentMode: { type: String, enum: PAYMENT_MODES, default: 'CASH' },
    payee: { type: String, default: '', trim: true },
    reference: { type: String, default: '', trim: true },
    note: { type: String, default: '' }
  },
  { timestamps: true }
);

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
