const express = require('express');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const Client = require('../models/Client');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { isValidGstin, stateCodeFromGstin, normaliseStateCode } = require('../utils/gst');
const { str } = require('../services/documents');
const { peekNextNumber, setNextNumber } = require('../services/numbering');
const { DOC_PREFIX_KEYS } = require('../utils/constants');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMAGE_LENGTH = 700 * 1024; // base64 data URL, roughly 500 KB of image

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many attempts. Please try again after 15 minutes.' }
});

const signToken = (user) =>
  jwt.sign({ userId: String(user._id) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

const loadUser = async (req) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(404, 'Account not found');
  return user;
};

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const name = str(req.body.name);
    const email = str(req.body.email).toLowerCase();
    const password = String(req.body.password || '');

    if (!name) throw new HttpError(400, 'Name is required');
    if (!EMAIL_REGEX.test(email)) throw new HttpError(400, 'Enter a valid email address');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');

    const user = new User({ name, email, password });
    const businessName = str(req.body.businessName);
    if (businessName) user.company.name = businessName;
    await user.save();

    res.status(201).json({ token: signToken(user), user: user.toPublicJSON() });
  })
);

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = str(req.body.email).toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) throw new HttpError(400, 'Email and password are required');

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new HttpError(401, 'Invalid email or password');
    }

    res.json({ token: signToken(user), user: user.toPublicJSON() });
  })
);

router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toPublicJSON() });
  })
);

router.put(
  '/profile',
  auth,
  asyncHandler(async (req, res) => {
    const user = await loadUser(req);
    const name = str(req.body.name);
    if (!name) throw new HttpError(400, 'Name is required');

    if (req.body.email !== undefined) {
      const email = str(req.body.email).toLowerCase();
      if (!EMAIL_REGEX.test(email)) throw new HttpError(400, 'Enter a valid email address');
      if (email !== user.email && (await User.exists({ email, _id: { $ne: user._id } }))) {
        throw new HttpError(409, 'An account with this email already exists');
      }
      user.email = email;
    }
    user.name = name;
    await user.save();
    res.json({ message: 'Profile updated', user: user.toPublicJSON() });
  })
);

const COMPANY_FIELDS = ['name', 'tagline', 'gstin', 'pan', 'mobile', 'email', 'website', 'address', 'city', 'state', 'stateCode', 'pincode', 'dealsIn'];
const BANK_FIELDS = ['accountHolder', 'bankName', 'branch', 'accountNumber', 'ifscCode', 'upiId'];

const validateImage = (value, label) => {
  const image = String(value || '');
  if (!image) return '';
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(image)) {
    throw new HttpError(400, `${label} must be a PNG, JPG or WEBP image`);
  }
  if (image.length > MAX_IMAGE_LENGTH) throw new HttpError(400, `${label} is too large. Please use an image under 500 KB.`);
  return image;
};

router.put(
  '/company',
  auth,
  asyncHandler(async (req, res) => {
    const user = await loadUser(req);
    const body = req.body || {};

    for (const field of COMPANY_FIELDS) {
      if (body[field] !== undefined) user.company[field] = str(body[field]);
    }
    user.company.gstin = str(user.company.gstin).toUpperCase();
    user.company.pan = str(user.company.pan).toUpperCase();

    if (!user.company.name) throw new HttpError(400, 'Business name is required');
    if (user.company.gstin && !isValidGstin(user.company.gstin)) {
      throw new HttpError(400, 'GSTIN format is invalid (example: 09ABCDE1234F1Z5)');
    }
    if (user.company.email && !EMAIL_REGEX.test(user.company.email)) {
      throw new HttpError(400, 'Business email is invalid');
    }
    user.company.stateCode = stateCodeFromGstin(user.company.gstin) || normaliseStateCode(user.company.stateCode);

    if (body.logo !== undefined) user.company.logo = validateImage(body.logo, 'Logo');
    if (body.signature !== undefined) user.company.signature = validateImage(body.signature, 'Signature');

    if (body.bankDetails && typeof body.bankDetails === 'object') {
      for (const field of BANK_FIELDS) {
        if (body.bankDetails[field] !== undefined) user.company.bankDetails[field] = str(body.bankDetails[field]);
      }
      user.company.bankDetails.ifscCode = str(user.company.bankDetails.ifscCode).toUpperCase();
    }

    await user.save();
    res.json({ message: 'Business profile updated', user: user.toPublicJSON() });
  })
);

const PREFIX_FIELDS = Object.values(DOC_PREFIX_KEYS);
const BOOLEAN_SETTINGS = ['roundOff', 'pricesIncludeTax', 'showBankDetails', 'showUpiQr', 'showSignature'];

router.put(
  '/settings',
  auth,
  asyncHandler(async (req, res) => {
    const user = await loadUser(req);
    const body = req.body || {};

    for (const field of PREFIX_FIELDS) {
      if (body[field] === undefined) continue;
      const prefix = str(body[field]).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
      if (!prefix) throw new HttpError(400, 'Number prefixes can only contain letters, digits and hyphens');
      user.settings[field] = prefix;
    }
    for (const field of BOOLEAN_SETTINGS) {
      if (body[field] !== undefined) user.settings[field] = Boolean(body[field]);
    }
    if (body.defaultDueDays !== undefined) {
      user.settings.defaultDueDays = Math.min(Math.max(parseInt(body.defaultDueDays, 10) || 0, 0), 365);
    }
    if (body.defaultTerms !== undefined) user.settings.defaultTerms = String(body.defaultTerms);
    if (body.defaultNotes !== undefined) user.settings.defaultNotes = String(body.defaultNotes);
    if (body.themeColor !== undefined) {
      if (!/^#[0-9a-f]{6}$/i.test(str(body.themeColor))) throw new HttpError(400, 'Theme colour must be a hex value like #4f46e5');
      user.settings.themeColor = str(body.themeColor);
    }

    await user.save();
    res.json({ message: 'Settings updated', user: user.toPublicJSON() });
  })
);

const NUMBERED_TYPES = ['INVOICE', 'QUOTATION', 'ESTIMATE', 'PROFORMA', 'PURCHASE'];
const numberingTarget = (docType) =>
  docType === 'PURCHASE' ? { Model: Purchase, field: 'purchaseNumber' } : { Model: Invoice, field: 'invoiceNumber' };

router.get(
  '/numbering',
  auth,
  asyncHandler(async (req, res) => {
    const numbering = await Promise.all(
      NUMBERED_TYPES.map(async (docType) => {
        const next = await peekNextNumber({ user: req.user, docType, date: null, ...numberingTarget(docType) });
        return { docType, prefix: next.prefix, financialYear: next.fy, nextNumber: next.seq, preview: next.number };
      })
    );
    res.json({ numbering });
  })
);

router.put(
  '/numbering',
  auth,
  asyncHandler(async (req, res) => {
    const docType = str(req.body.docType).toUpperCase();
    if (!NUMBERED_TYPES.includes(docType)) throw new HttpError(400, 'Unknown document type');
    const nextNumber = parseInt(req.body.nextNumber, 10);
    if (!nextNumber || nextNumber < 1) throw new HttpError(400, 'Next number must be 1 or more');

    await setNextNumber({ user: req.user, docType, nextNumber, date: null });
    const next = await peekNextNumber({ user: req.user, docType, date: null, ...numberingTarget(docType) });
    res.json({ docType, prefix: next.prefix, financialYear: next.fy, nextNumber: next.seq, preview: next.number });
  })
);

router.put(
  '/password',
  auth,
  asyncHandler(async (req, res) => {
    const user = await loadUser(req);
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!(await user.comparePassword(currentPassword))) throw new HttpError(400, 'Current password is incorrect');
    if (newPassword.length < 6) throw new HttpError(400, 'New password must be at least 6 characters');

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  })
);

router.get(
  '/backup',
  auth,
  asyncHandler(async (req, res) => {
    const filter = { userId: req.userId };
    const [clients, products, invoices, purchases, expenses] = await Promise.all([
      Client.find(filter).lean(),
      Product.find(filter).lean(),
      Invoice.find(filter).lean(),
      Purchase.find(filter).lean(),
      Expense.find(filter).lean()
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="ebillsoft-backup-${stamp}.json"`);
    res.json({
      app: 'eBillSoft',
      version: 2,
      exportedAt: new Date(),
      account: req.user.toPublicJSON(),
      parties: clients,
      items: products,
      salesDocuments: invoices,
      purchases,
      expenses
    });
  })
);

module.exports = router;
