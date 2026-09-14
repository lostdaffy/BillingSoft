const mongoose = require('mongoose');
const { lineItemSchema, partySnapshotSchema, totalsFields } = require('./shared');
const { SALES_DOC_TYPES, SALES_STATUSES, OPEN_INVOICE_STATUSES } = require('../utils/constants');
const { today } = require('../utils/dates');

// Sales documents: tax invoices, quotations, estimates and proforma invoices.
const invoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    invoiceType: {
      type: String,
      enum: SALES_DOC_TYPES,
      default: 'INVOICE'
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true
    },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    client: { type: partySnapshotSchema, required: true },
    shippingAddress: { type: String, default: '' },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: { type: Date },
    poNumber: { type: String, default: '' },
    ewayBillNo: { type: String, default: '' },
    vehicleNo: { type: String, default: '' },
    items: {
      type: [lineItemSchema],
      validate: [(items) => items.length > 0, 'At least one item is required']
    },
    ...totalsFields,
    // v1 stored a flat tax amount; kept so historical documents still load.
    tax: { type: Number, default: 0 },
    status: {
      type: String,
      enum: SALES_STATUSES,
      default: 'DRAFT'
    },
    convertedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    convertedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    termsAndConditions: { type: String, default: '' },
    notes: { type: String, default: '' },
    shareToken: { type: String }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

invoiceSchema.virtual('isOverdue').get(function isOverdue() {
  return (
    this.invoiceType === 'INVOICE' &&
    OPEN_INVOICE_STATUSES.includes(this.status) &&
    this.balanceDue > 0 &&
    Boolean(this.dueDate) &&
    this.dueDate < today()
  );
});

invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, invoiceType: 1, invoiceDate: -1 });
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ userId: 1, clientId: 1 });
invoiceSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
