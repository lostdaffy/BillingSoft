const mongoose = require('mongoose');
const { PARTY_TYPES } = require('../utils/constants');

// A "party": customer, supplier or both. The model keeps its v1 name so the
// existing `clients` collection is reused without a data move.
const clientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: { type: String, enum: PARTY_TYPES, default: 'CUSTOMER' },
    name: {
      type: String,
      required: [true, 'Party name is required'],
      trim: true
    },
    contactPerson: { type: String, default: '', trim: true },
    mobile: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    gst: { type: String, default: '', trim: true, uppercase: true },
    panUid: { type: String, default: '', trim: true, uppercase: true },
    aadhaar: { type: String, default: '', trim: true },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    pincode: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    openingBalance: { type: Number, default: 0, min: 0 },
    openingBalanceType: { type: String, enum: ['RECEIVABLE', 'PAYABLE'], default: 'RECEIVABLE' },
    creditDays: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

clientSchema.index({ userId: 1, name: 1 });
clientSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Client', clientSchema);
