const express = require('express');
const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { toDateOnly, today, rangeFromQuery, dateFilter } = require('../utils/dates');
const { num } = require('../utils/numbers');
const docs = require('../services/documents');
const { adjustStock } = require('../services/stock');
const { peekNextNumber, takeNextNumber } = require('../services/numbering');

const router = express.Router();
router.use(auth);

const affectsStock = (doc) => doc.status !== 'CANCELLED';

const findOwned = async (req) => {
  const doc = await Purchase.findOne({ _id: req.params.id, userId: req.userId });
  if (!doc) throw new HttpError(404, 'Purchase not found');
  return doc;
};

const assignFields = async (doc, body, req) => {
  if (body.supplier !== undefined) {
    const snapshot = docs.partySnapshot(body.supplier);
    if (!snapshot.name) throw new HttpError(400, 'Supplier name is required');
    doc.supplier = snapshot;
    doc.placeOfSupply = snapshot.stateCode;
  }
  if (body.supplierId !== undefined) {
    const supplierId = docs.toObjectId(body.supplierId);
    if (supplierId && !(await Client.exists({ _id: supplierId, userId: req.userId }))) {
      throw new HttpError(400, 'Selected supplier was not found');
    }
    doc.supplierId = supplierId || undefined;
  }
  for (const field of ['billNumber', 'notes', 'otherChargesLabel']) {
    if (body[field] !== undefined) doc[field] = docs.str(body[field]);
  }
  if (body.billDate !== undefined) {
    const date = toDateOnly(body.billDate);
    if (!date) throw new HttpError(400, 'Invalid bill date');
    doc.billDate = date;
  }
  if (body.dueDate !== undefined) doc.dueDate = toDateOnly(body.dueDate) || undefined;
  if (body.discount !== undefined) doc.discount = Math.max(num(body.discount), 0);
  if (body.otherCharges !== undefined) doc.otherCharges = Math.max(num(body.otherCharges), 0);
  if (body.pricesIncludeTax !== undefined) doc.pricesIncludeTax = Boolean(body.pricesIncludeTax);
};

const maybeCreateSupplier = async (doc, body, req) => {
  if (!body.saveSupplier || doc.supplierId || !doc.supplier || !doc.supplier.name) return;
  const party = await Client.create({ userId: req.userId, type: 'SUPPLIER', ...doc.supplier.toObject() });
  doc.supplierId = party._id;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q, supplierId } = req.query;
    const filter = { userId: req.userId };
    if (status === 'OVERDUE') {
      filter.status = { $in: ['UNPAID', 'PARTIAL'] };
      filter.balanceDue = { $gt: 0 };
      filter.dueDate = { $lt: today() };
    } else if (status) {
      filter.status = status;
    }
    const range = dateFilter(rangeFromQuery(req.query, 'none'));
    if (range) filter.billDate = range;
    const partyId = docs.toObjectId(supplierId);
    if (partyId) filter.supplierId = new mongoose.Types.ObjectId(partyId);
    if (docs.str(q)) {
      const rx = new RegExp(docs.escapeRegex(q), 'i');
      filter.$or = [{ purchaseNumber: rx }, { billNumber: rx }, { 'supplier.name': rx }, { 'supplier.gst': rx }];
    }

    const { page, limit, skip } = docs.paginate(req.query);
    const [purchases, total, summary] = await Promise.all([
      Purchase.find(filter).sort({ billDate: -1, createdAt: -1 }).skip(skip).limit(limit).select('-items -payments -notes'),
      Purchase.countDocuments(filter),
      Purchase.aggregate([
        { $match: { $and: [filter, { status: { $ne: 'CANCELLED' } }] } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            amountPaid: { $sum: '$amountPaid' },
            balanceDue: { $sum: '$balanceDue' }
          }
        }
      ])
    ]);

    const { _id, ...totals } = summary[0] || { _id: null, count: 0, totalAmount: 0, amountPaid: 0, balanceDue: 0 };
    res.json({
      purchases,
      pagination: { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) },
      summary: totals
    });
  })
);

router.get(
  '/next-number',
  asyncHandler(async (req, res) => {
    const next = await peekNextNumber({
      user: req.user,
      docType: 'PURCHASE',
      date: toDateOnly(req.query.date),
      Model: Purchase,
      field: 'purchaseNumber'
    });
    res.json({ number: next.number });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await findOwned(req));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const items = docs.sanitizeItems(body.items);
    if (!body.supplier || !docs.str(body.supplier.name)) throw new HttpError(400, 'Supplier name is required');
    if (!items.length) throw new HttpError(400, 'Add at least one item');

    const doc = new Purchase({
      userId: req.userId,
      billDate: today(),
      pricesIncludeTax: Boolean(req.user.settings && req.user.settings.pricesIncludeTax)
    });
    await assignFields(doc, body, req);
    docs.applyTotals(doc, items, req.user);

    const initial = body.initialPayment;
    if (initial && num(initial.amount) > 0) {
      doc.payments.push(docs.parsePayment({ date: doc.billDate, ...initial }, doc.totalAmount));
      docs.applyPaymentTotals(doc);
    }
    doc.status = docs.paymentStatus(doc);

    doc.purchaseNumber = 'PENDING';
    await doc.validate();
    doc.purchaseNumber = await takeNextNumber({ user: req.user, docType: 'PURCHASE', date: doc.billDate, Model: Purchase, field: 'purchaseNumber' });
    await maybeCreateSupplier(doc, body, req);

    await doc.save();
    await adjustStock(req.userId, doc.items, 1);
    res.status(201).json(doc);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const doc = await findOwned(req);
    if (doc.status === 'CANCELLED') throw new HttpError(400, 'Cancelled purchases cannot be edited. Restore it first.');

    const previousItems = docs.plainItems(doc);
    await assignFields(doc, body, req);
    const items = body.items !== undefined ? docs.sanitizeItems(body.items) : previousItems;
    if (!items.length) throw new HttpError(400, 'Add at least one item');
    docs.applyTotals(doc, items, req.user);
    if (doc.amountPaid > doc.totalAmount + 0.01) {
      throw new HttpError(400, `Total cannot be less than the amount already paid (${doc.amountPaid}). Remove payments first.`);
    }
    doc.status = docs.paymentStatus(doc);
    await maybeCreateSupplier(doc, body, req);

    await doc.save();
    await adjustStock(req.userId, previousItems, -1);
    await adjustStock(req.userId, doc.items, 1);
    res.json(doc);
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    const status = docs.str(req.body.status).toUpperCase();
    if (!['CANCELLED', 'UNPAID'].includes(status)) throw new HttpError(400, 'Status must be CANCELLED or UNPAID');
    if (status === 'CANCELLED' && doc.payments.length) {
      throw new HttpError(400, 'Delete the recorded payments before cancelling this purchase');
    }

    const wasAffectingStock = affectsStock(doc);
    doc.status = status === 'CANCELLED' ? 'CANCELLED' : docs.paymentStatus(doc);
    await doc.save();
    if (wasAffectingStock && !affectsStock(doc)) await adjustStock(req.userId, doc.items, -1);
    if (!wasAffectingStock && affectsStock(doc)) await adjustStock(req.userId, doc.items, 1);
    res.json(doc);
  })
);

router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    if (doc.status === 'CANCELLED') throw new HttpError(400, 'Cannot record a payment on a cancelled purchase');
    doc.payments.push(docs.parsePayment(req.body, doc.balanceDue));
    docs.applyPaymentTotals(doc);
    doc.status = docs.paymentStatus(doc);
    await doc.save();
    res.status(201).json(doc);
  })
);

router.delete(
  '/:id/payments/:paymentId',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    const payment = doc.payments.id(req.params.paymentId);
    if (!payment) throw new HttpError(404, 'Payment not found');
    payment.deleteOne();
    docs.applyPaymentTotals(doc);
    if (doc.status !== 'CANCELLED') doc.status = docs.paymentStatus(doc);
    await doc.save();
    res.json(doc);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    const reverseStock = affectsStock(doc);
    await doc.deleteOne();
    if (reverseStock) await adjustStock(req.userId, doc.items, -1);
    res.json({ message: 'Purchase deleted' });
  })
);

module.exports = router;
