const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEFAULT_TERMS = [
  'Goods once sold will not be taken back or exchanged.',
  'Interest @ 18% p.a. will be charged if payment is not made within the due date.',
  'Subject to local jurisdiction only.'
].join('\n');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6
    },
    company: {
      name: { type: String, default: 'My Company', trim: true },
      tagline: { type: String, default: '' },
      gstin: { type: String, default: '', uppercase: true, trim: true },
      pan: { type: String, default: '', uppercase: true, trim: true },
      mobile: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      stateCode: { type: String, default: '' },
      pincode: { type: String, default: '' },
      dealsIn: { type: String, default: '' },
      logo: { type: String, default: '' },
      signature: { type: String, default: '' },
      bankDetails: {
        accountHolder: { type: String, default: '' },
        bankName: { type: String, default: '' },
        branch: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '', uppercase: true },
        upiId: { type: String, default: '' }
      }
    },
    settings: {
      invoicePrefix: { type: String, default: 'INV' },
      quotationPrefix: { type: String, default: 'QT' },
      estimatePrefix: { type: String, default: 'EST' },
      proformaPrefix: { type: String, default: 'PI' },
      purchasePrefix: { type: String, default: 'PUR' },
      defaultDueDays: { type: Number, default: 15, min: 0 },
      defaultTerms: { type: String, default: DEFAULT_TERMS },
      defaultNotes: { type: String, default: 'Thank you for your business!' },
      roundOff: { type: Boolean, default: true },
      pricesIncludeTax: { type: Boolean, default: false },
      showBankDetails: { type: Boolean, default: true },
      showUpiQr: { type: Boolean, default: true },
      showSignature: { type: Boolean, default: true },
      themeColor: { type: String, default: '#4f46e5' }
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    company: this.company,
    settings: this.settings,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
