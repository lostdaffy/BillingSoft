const express = require('express');
const { rateLimit } = require('express-rate-limit');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { maskAadhaar } = require('../utils/aadhaar');

const router = express.Router();

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down.' }
  })
);

// Customer-facing view of a shared invoice. Only works while the owner keeps sharing enabled.
router.get(
  '/invoices/:token',
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{32}$/.test(token)) throw new HttpError(404, 'This link is invalid or has expired');

    const invoice = await Invoice.findOne({ shareToken: token });
    if (!invoice || invoice.status === 'DRAFT') throw new HttpError(404, 'This link is invalid or has expired');

    const owner = await User.findById(invoice.userId).select('company settings').lean();
    if (!owner) throw new HttpError(404, 'This link is invalid or has expired');

    const data = invoice.toJSON();
    delete data.userId;
    delete data.shareToken;
    delete data.clientId;
    if (data.client && data.client.aadhaar) data.client.aadhaar = maskAadhaar(data.client.aadhaar);
    data.payments = (data.payments || []).map(({ amount, date, mode }) => ({ amount, date, mode }));

    const { showBankDetails, showUpiQr, showSignature, themeColor } = owner.settings || {};
    res.json({
      invoice: data,
      company: owner.company,
      settings: { showBankDetails, showUpiQr, showSignature, themeColor }
    });
  })
);

module.exports = router;
