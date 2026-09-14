const mongoose = require('mongoose');
const { lineItemSchema, partySnapshotSchema, totalsFields } = require('./shared');
const { PURCHASE_STATUSES } = require('../utils/constants');
const { today } = require('../utils/dates');

// Purchase bills received from suppliers. Stock goes up; input GST is tracked.
const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    purchaseNumber: { type: String, required: true, trim: true },
    billNumber: { type: String, default: '', trim: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    supplier: { type: partySnapshotSchema, required: true },
    billDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    items: {
      type: [lineItemSchema],
      validate: [(items) => items.length > 0, 'At least one item is required']
    },
    ...totalsFields,
    status: { type: String, enum: PURCHASE_STATUSES, default: 'UNPAID' },
    notes: { type: String, default: '' }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

purchaseSchema.virtual('isOverdue').get(function isOverdue() {
  return (
    ['UNPAID', 'PARTIAL'].includes(this.status) &&
    this.balanceDue > 0 &&
    Boolean(this.dueDate) &&
    this.dueDate < today()
  );
});

purchaseSchema.index({ userId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ userId: 1, billDate: -1 });
purchaseSchema.index({ userId: 1, supplierId: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
