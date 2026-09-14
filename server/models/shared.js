const mongoose = require('mongoose');
const { PAYMENT_MODES } = require('../utils/constants');

const lineItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    srNo: Number,
    description: { type: String, required: [true, 'Item description is required'], trim: true },
    hsnCode: { type: String, default: '' },
    unit: { type: String, default: 'Nos' },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxableValue: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: [0.01, 'Payment amount must be positive'] },
    date: { type: Date, default: Date.now },
    mode: { type: String, enum: PAYMENT_MODES, default: 'CASH' },
    reference: { type: String, default: '' },
    note: { type: String, default: '' }
  },
  { timestamps: true }
);

// Party details are copied onto each document so old invoices never change
// when the party master is edited later.
const partySnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Party name is required'], trim: true },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    pincode: { type: String, default: '' },
    mobile: { type: String, default: '' },
    email: { type: String, default: '' },
    gst: { type: String, default: '' },
    panUid: { type: String, default: '' },
    aadhaar: { type: String, default: '' }
  },
  { _id: false }
);

const totalsFields = {
  pricesIncludeTax: { type: Boolean, default: false },
  isInterState: { type: Boolean, default: false },
  placeOfSupply: { type: String, default: '' },
  subtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  discount: { type: Number, default: 0, min: 0 },
  otherCharges: { type: Number, default: 0, min: 0 },
  otherChargesLabel: { type: String, default: 'Other Charges' },
  roundOff: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  amountInWords: { type: String, default: '' },
  payments: [paymentSchema],
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 }
};

module.exports = { lineItemSchema, paymentSchema, partySnapshotSchema, totalsFields };
