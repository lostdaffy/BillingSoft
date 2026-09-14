const express = require('express');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const auth = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { PARTY_TYPES } = require('../utils/constants');
const { isValidGstin, stateCodeFromGstin, normaliseStateCode } = require('../utils/gst');
const { num, round2 } = require('../utils/numbers');
const { rangeFromQuery } = require('../utils/dates');
const { str, escapeRegex } = require('../services/documents');

const router = express.Router();
router.use(auth);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PARTY_FIELDS = ['name', 'contactPerson', 'mobile', 'email', 'gst', 'panUid', 'aadhaar', 'address', 'city', 'state', 'stateCode', 'pincode', 'shippingAddress', 'notes'];

const applyPartyBody = (party, body = {}) => {
  for (const field of PARTY_FIELDS) {
    if (body[field] !== undefined) party[field] = str(body[field]);
  }
  if (body.type !== undefined) {
    if (!PARTY_TYPES.includes(body.type)) throw new HttpError(400, 'Party type must be CUSTOMER, SUPPLIER or BOTH');
    party.type = body.type;
  }
  if (body.openingBalance !== undefined) party.openingBalance = Math.max(num(body.openingBalance), 0);
  if (body.openingBalanceType !== undefined) {
    party.openingBalanceType = body.openingBalanceType === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
  }
  if (body.creditDays !== undefined) party.creditDays = Math.max(parseInt(body.creditDays, 10) || 0, 0);

  if (!str(party.name)) throw new HttpError(400, 'Party name is required');
  party.gst = str(party.gst).toUpperCase();
  if (party.gst && !isValidGstin(party.gst)) throw new HttpError(400, 'GSTIN format is invalid (example: 09ABCDE1234F1Z5)');
  if (party.email && !EMAIL_REGEX.test(party.email)) throw new HttpError(400, 'Email address is invalid');
  party.stateCode = stateCodeFromGstin(party.gst) || normaliseStateCode(party.stateCode);
};

const partyStats = async (userId, partyId) => {
  const idFilter = partyId ? new mongoose.Types.ObjectId(String(partyId)) : { $ne: null };
  const [sales, purchases] = await Promise.all([
    Invoice.aggregate([
      { $match: { userId, invoiceType: 'INVOICE', status: { $nin: ['DRAFT', 'CANCELLED'] }, clientId: idFilter } },
      {
        $group: {
          _id: '$clientId',
          totalSales: { $sum: '$totalAmount' },
          totalReceived: { $sum: '$amountPaid' },
          salesBalance: { $sum: '$balanceDue' },
          invoiceCount: { $sum: 1 }
        }
      }
    ]),
    Purchase.aggregate([
      { $match: { userId, status: { $ne: 'CANCELLED' }, supplierId: idFilter } },
      {
        $group: {
          _id: '$supplierId',
          totalPurchases: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          purchaseBalance: { $sum: '$balanceDue' },
          purchaseCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const stats = new Map();
  for (const row of [...sales, ...purchases]) {
    const key = String(row._id);
    stats.set(key, { ...(stats.get(key) || {}), ...row });
  }
  return stats;
};

const withBalance = (party, stats = {}) => {
  const opening = num(party.openingBalance);
  const openingPayable = party.openingBalanceType === 'PAYABLE' ? opening : 0;
  const openingReceivable = opening - openingPayable;
  const receivable = round2(openingReceivable + num(stats.salesBalance));
  const payable = round2(openingPayable + num(stats.purchaseBalance));
  return {
    ...party,
    totalSales: round2(num(stats.totalSales)),
    totalReceived: round2(num(stats.totalReceived)),
    totalPurchases: round2(num(stats.totalPurchases)),
    totalPaid: round2(num(stats.totalPaid)),
    invoiceCount: num(stats.invoiceCount),
    purchaseCount: num(stats.purchaseCount),
    receivable,
    payable,
    balance: round2(receivable - payable)
  };
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { userId: req.userId };
    if (req.query.type === 'CUSTOMER') filter.type = { $in: ['CUSTOMER', 'BOTH'] };
    if (req.query.type === 'SUPPLIER') filter.type = { $in: ['SUPPLIER', 'BOTH'] };
    if (str(req.query.q)) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ name: rx }, { mobile: rx }, { gst: rx }, { email: rx }, { city: rx }];
    }

    const [parties, stats] = await Promise.all([
      Client.find(filter).sort({ name: 1 }).lean(),
      partyStats(req.userId)
    ]);
    res.json(parties.map((party) => withBalance(party, stats.get(String(party._id)))));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const party = await Client.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!party) throw new HttpError(404, 'Party not found');
    const stats = await partyStats(req.userId, party._id);
    res.json(withBalance(party, stats.get(String(party._id))));
  })
);

// Running account statement. Debit = party owes us (sales, payments we made);
// credit = we owe the party (purchases, payments we received).
router.get(
  '/:id/ledger',
  asyncHandler(async (req, res) => {
    const party = await Client.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!party) throw new HttpError(404, 'Party not found');

    const [invoices, purchases, stats] = await Promise.all([
      Invoice.find({ userId: req.userId, clientId: party._id, invoiceType: 'INVOICE', status: { $nin: ['DRAFT', 'CANCELLED'] } })
        .select('invoiceNumber invoiceDate totalAmount payments')
        .lean(),
      Purchase.find({ userId: req.userId, supplierId: party._id, status: { $ne: 'CANCELLED' } })
        .select('purchaseNumber billNumber billDate totalAmount payments')
        .lean(),
      partyStats(req.userId, party._id)
    ]);

    const entries = [];
    for (const invoice of invoices) {
      entries.push({ date: invoice.invoiceDate, order: 0, kind: 'SALE', label: 'Sales Invoice', number: invoice.invoiceNumber, docId: invoice._id, debit: invoice.totalAmount, credit: 0 });
      for (const payment of invoice.payments || []) {
        entries.push({ date: payment.date, order: 1, kind: 'PAYMENT_IN', label: `Payment Received (${payment.mode})`, number: invoice.invoiceNumber, docId: invoice._id, reference: payment.reference, debit: 0, credit: payment.amount });
      }
    }
    for (const purchase of purchases) {
      const number = purchase.billNumber || purchase.purchaseNumber;
      entries.push({ date: purchase.billDate, order: 0, kind: 'PURCHASE', label: 'Purchase Bill', number, docId: purchase._id, debit: 0, credit: purchase.totalAmount });
      for (const payment of purchase.payments || []) {
        entries.push({ date: payment.date, order: 1, kind: 'PAYMENT_OUT', label: `Payment Made (${payment.mode})`, number, docId: purchase._id, reference: payment.reference, debit: payment.amount, credit: 0 });
      }
    }
    entries.sort((a, b) => new Date(a.date) - new Date(b.date) || a.order - b.order);

    const opening = num(party.openingBalance);
    let balance = party.openingBalanceType === 'PAYABLE' ? -opening : opening;
    let broughtForward = balance;
    const range = rangeFromQuery(req.query, 'none');
    const rows = [];
    let debit = 0;
    let credit = 0;

    for (const entry of entries) {
      const date = new Date(entry.date);
      if (range.toExclusive && date >= range.toExclusive) break;
      balance = round2(balance + num(entry.debit) - num(entry.credit));
      if (range.from && date < range.from) {
        broughtForward = balance;
        continue;
      }
      debit += num(entry.debit);
      credit += num(entry.credit);
      const { order, ...row } = entry;
      rows.push({ ...row, balance });
    }

    res.json({
      party: withBalance(party, stats.get(String(party._id))),
      openingBalance: round2(broughtForward),
      entries: rows,
      totals: { debit: round2(debit), credit: round2(credit) },
      closingBalance: rows.length ? rows[rows.length - 1].balance : round2(broughtForward)
    });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const party = new Client({ userId: req.userId });
    applyPartyBody(party, req.body);
    await party.save();
    res.status(201).json(withBalance(party.toObject()));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const party = await Client.findOne({ _id: req.params.id, userId: req.userId });
    if (!party) throw new HttpError(404, 'Party not found');
    applyPartyBody(party, req.body);
    await party.save();
    const stats = await partyStats(req.userId, party._id);
    res.json(withBalance(party.toObject(), stats.get(String(party._id))));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const party = await Client.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!party) throw new HttpError(404, 'Party not found');
    // Documents keep their own copy of the party details, so history is preserved.
    await Promise.all([
      Invoice.updateMany({ userId: req.userId, clientId: party._id }, { $unset: { clientId: 1 } }),
      Purchase.updateMany({ userId: req.userId, supplierId: party._id }, { $unset: { supplierId: 1 } })
    ]);
    res.json({ message: 'Party deleted' });
  })
);

module.exports = router;
