const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { SALES_DOC_TYPES, OPEN_INVOICE_STATUSES, QUOTE_STATUSES } = require('../utils/constants');
const { toDateOnly, today, addDays, rangeFromQuery, dateFilter } = require('../utils/dates');
const { num } = require('../utils/numbers');
const { normaliseStateCode } = require('../utils/gst');
const docs = require('../services/documents');
const { adjustStock } = require('../services/stock');
const { peekNextNumber, takeNextNumber } = require('../services/numbering');

const router = express.Router();
router.use(auth);

const LIST_FIELDS = '-items -payments -termsAndConditions -notes';
const affectsStock = (doc) => doc.invoiceType === 'INVOICE' && !['DRAFT', 'CANCELLED'].includes(doc.status);

const findOwned = async (req) => {
  const doc = await Invoice.findOne({ _id: req.params.id, userId: req.userId });
  if (!doc) throw new HttpError(404, 'Document not found');
  return doc;
};

const resolveStatus = (doc, requested) => {
  if (doc.invoiceType === 'INVOICE') {
    if (requested === 'DRAFT') {
      if (doc.payments.length) throw new HttpError(400, 'An invoice with payments cannot be saved as a draft');
      return 'DRAFT';
    }
    if (requested === undefined && ['DRAFT', 'CANCELLED'].includes(doc.status)) return doc.status;
    return docs.paymentStatus(doc);
  }
  if (requested && QUOTE_STATUSES.includes(requested) && requested !== 'CONVERTED') return requested;
  return QUOTE_STATUSES.includes(doc.status) ? doc.status : 'DRAFT';
};

const assignFields = async (doc, body, req) => {
  if (body.client !== undefined) {
    const snapshot = docs.partySnapshot(body.client);
    if (!snapshot.name) throw new HttpError(400, 'Customer name is required');
    doc.client = snapshot;
  }
  if (body.clientId !== undefined) {
    const clientId = docs.toObjectId(body.clientId);
    if (clientId && !(await Client.exists({ _id: clientId, userId: req.userId }))) {
      throw new HttpError(400, 'Selected party was not found');
    }
    doc.clientId = clientId || undefined;
  }
  for (const field of ['shippingAddress', 'poNumber', 'ewayBillNo', 'vehicleNo', 'termsAndConditions', 'notes', 'otherChargesLabel']) {
    if (body[field] !== undefined) doc[field] = docs.str(body[field]);
  }
  if (body.invoiceDate !== undefined) {
    const date = toDateOnly(body.invoiceDate);
    if (!date) throw new HttpError(400, 'Invalid document date');
    doc.invoiceDate = date;
  }
  if (body.dueDate !== undefined) doc.dueDate = toDateOnly(body.dueDate) || undefined;
  if (body.discount !== undefined) doc.discount = Math.max(num(body.discount), 0);
  if (body.otherCharges !== undefined) doc.otherCharges = Math.max(num(body.otherCharges), 0);
  if (body.pricesIncludeTax !== undefined) doc.pricesIncludeTax = Boolean(body.pricesIncludeTax);
  if (body.placeOfSupply !== undefined) doc.placeOfSupply = normaliseStateCode(body.placeOfSupply);
  else if (body.client !== undefined) doc.placeOfSupply = doc.client.stateCode;
};

const maybeCreateParty = async (doc, body, req) => {
  if (!body.saveClient || doc.clientId || !doc.client || !doc.client.name) return;
  const party = await Client.create({ userId: req.userId, type: 'CUSTOMER', ...doc.client.toObject() });
  doc.clientId = party._id;
};

const assignManualNumber = async (doc, manual, req) => {
  if (manual.length > 30) throw new HttpError(400, 'Document number is too long (max 30 characters)');
  const taken = await Invoice.exists({ userId: req.userId, invoiceNumber: manual, _id: { $ne: doc._id } });
  if (taken) throw new HttpError(409, `Number ${manual} is already used by another document`);
  doc.invoiceNumber = manual;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type = 'INVOICE', status, q, clientId } = req.query;
    const filter = { userId: req.userId };
    if (type !== 'ALL') filter.invoiceType = SALES_DOC_TYPES.includes(type) ? type : 'INVOICE';

    if (status === 'OVERDUE') {
      filter.status = { $in: OPEN_INVOICE_STATUSES };
      filter.balanceDue = { $gt: 0 };
      filter.dueDate = { $lt: today() };
    } else if (status === 'UNPAID' && filter.invoiceType === 'INVOICE') {
      filter.status = { $in: ['UNPAID', 'SENT', 'OVERDUE'] };
    } else if (status) {
      filter.status = status;
    }

    const range = dateFilter(rangeFromQuery(req.query, 'none'));
    if (range) filter.invoiceDate = range;
    const partyId = docs.toObjectId(clientId);
    if (partyId) filter.clientId = new mongoose.Types.ObjectId(partyId);
    if (docs.str(q)) {
      const rx = new RegExp(docs.escapeRegex(q), 'i');
      filter.$or = [{ invoiceNumber: rx }, { 'client.name': rx }, { 'client.mobile': rx }, { 'client.gst': rx }];
    }

    const { page, limit, skip } = docs.paginate(req.query);
    const [invoices, total, summary] = await Promise.all([
      Invoice.find(filter).sort({ invoiceDate: -1, createdAt: -1 }).skip(skip).limit(limit).select(LIST_FIELDS),
      Invoice.countDocuments(filter),
      Invoice.aggregate([
        { $match: { $and: [filter, { status: { $nin: ['DRAFT', 'CANCELLED'] } }] } },
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
      invoices,
      pagination: { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) },
      summary: totals
    });
  })
);

router.get(
  '/next-number',
  asyncHandler(async (req, res) => {
    const docType = SALES_DOC_TYPES.includes(req.query.type) ? req.query.type : 'INVOICE';
    const next = await peekNextNumber({
      user: req.user,
      docType,
      date: toDateOnly(req.query.date),
      Model: Invoice,
      field: 'invoiceNumber'
    });
    res.json({ number: next.number });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await Invoice.findOne({ _id: req.params.id, userId: req.userId })
      .populate('convertedTo', 'invoiceNumber invoiceType')
      .populate('convertedFrom', 'invoiceNumber invoiceType');
    if (!doc) throw new HttpError(404, 'Document not found');
    res.json(doc);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const invoiceType = SALES_DOC_TYPES.includes(body.invoiceType) ? body.invoiceType : 'INVOICE';
    const items = docs.sanitizeItems(body.items);
    if (!body.client || !docs.str(body.client.name)) throw new HttpError(400, 'Customer name is required');
    if (!items.length) throw new HttpError(400, 'Add at least one item');

    const settings = req.user.settings || {};
    const doc = new Invoice({
      userId: req.userId,
      invoiceType,
      invoiceDate: today(),
      pricesIncludeTax: Boolean(settings.pricesIncludeTax),
      termsAndConditions: settings.defaultTerms || '',
      notes: settings.defaultNotes || ''
    });
    await assignFields(doc, body, req);
    if (body.dueDate === undefined && invoiceType === 'INVOICE') {
      doc.dueDate = addDays(doc.invoiceDate, num(settings.defaultDueDays));
    }

    docs.applyTotals(doc, items, req.user);

    const requestedStatus = body.status || (invoiceType === 'INVOICE' ? 'UNPAID' : 'DRAFT');
    const initial = body.initialPayment;
    if (invoiceType === 'INVOICE' && requestedStatus !== 'DRAFT' && initial && num(initial.amount) > 0) {
      doc.payments.push(docs.parsePayment({ date: doc.invoiceDate, ...initial }, doc.totalAmount));
      docs.applyPaymentTotals(doc);
    }
    doc.status = resolveStatus(doc, requestedStatus);

    // Validate before reserving a number so a rejected save does not leave a gap in the series.
    const manual = docs.str(body.invoiceNumber);
    doc.invoiceNumber = manual || 'PENDING';
    await doc.validate();
    if (manual) {
      await assignManualNumber(doc, manual, req);
    } else {
      doc.invoiceNumber = await takeNextNumber({ user: req.user, docType: invoiceType, date: doc.invoiceDate, Model: Invoice, field: 'invoiceNumber' });
    }
    await maybeCreateParty(doc, body, req);

    await doc.save();
    if (affectsStock(doc)) await adjustStock(req.userId, doc.items, -1);
    res.status(201).json(doc);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const doc = await findOwned(req);
    if (doc.status === 'CONVERTED') throw new HttpError(400, 'This document was converted to an invoice and can no longer be edited');
    if (doc.status === 'CANCELLED') throw new HttpError(400, 'Cancelled documents cannot be edited. Restore it first.');

    docs.upgradeLegacyDocument(doc);
    const wasAffectingStock = affectsStock(doc);
    const previousItems = docs.plainItems(doc);

    await assignFields(doc, body, req);
    const items = body.items !== undefined ? docs.sanitizeItems(body.items) : previousItems;
    if (!items.length) throw new HttpError(400, 'Add at least one item');
    docs.applyTotals(doc, items, req.user);
    if (doc.amountPaid > doc.totalAmount + 0.01) {
      throw new HttpError(400, `Total cannot be less than the amount already received (${doc.amountPaid}). Remove payments first.`);
    }
    doc.status = resolveStatus(doc, body.status);

    const manual = docs.str(body.invoiceNumber);
    if (manual && manual !== doc.invoiceNumber) await assignManualNumber(doc, manual, req);
    await maybeCreateParty(doc, body, req);

    await doc.save();
    if (wasAffectingStock) await adjustStock(req.userId, previousItems, 1);
    if (affectsStock(doc)) await adjustStock(req.userId, doc.items, -1);
    res.json(doc);
  })
);

// Invoices: DRAFT (back to draft), UNPAID (finalise / restore), CANCELLED.
// Quotations: DRAFT, SENT, ACCEPTED, DECLINED.
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    const status = docs.str(req.body.status).toUpperCase();
    docs.upgradeLegacyDocument(doc);
    const wasAffectingStock = affectsStock(doc);

    if (doc.invoiceType === 'INVOICE') {
      if (!['DRAFT', 'UNPAID', 'CANCELLED'].includes(status)) throw new HttpError(400, 'Invalid status for an invoice');
      if (status !== 'UNPAID' && doc.payments.length) {
        throw new HttpError(400, 'Delete the recorded payments before changing this invoice to draft or cancelled');
      }
      doc.status = status === 'UNPAID' ? docs.paymentStatus(doc) : status;
    } else {
      if (doc.status === 'CONVERTED') throw new HttpError(400, 'This document has already been converted');
      if (!['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'].includes(status)) throw new HttpError(400, 'Invalid status');
      doc.status = status;
    }

    await doc.save();
    const nowAffectingStock = affectsStock(doc);
    if (wasAffectingStock && !nowAffectingStock) await adjustStock(req.userId, doc.items, 1);
    if (!wasAffectingStock && nowAffectingStock) await adjustStock(req.userId, doc.items, -1);
    res.json(doc);
  })
);

router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    if (doc.invoiceType !== 'INVOICE') throw new HttpError(400, 'Payments can only be recorded against invoices');
    if (doc.status === 'CANCELLED') throw new HttpError(400, 'Cannot record a payment on a cancelled invoice');

    docs.upgradeLegacyDocument(doc);
    const wasAffectingStock = affectsStock(doc);
    doc.payments.push(docs.parsePayment(req.body, doc.balanceDue));
    docs.applyPaymentTotals(doc);
    doc.status = docs.paymentStatus(doc);

    await doc.save();
    if (!wasAffectingStock && affectsStock(doc)) await adjustStock(req.userId, doc.items, -1);
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
    if (!['DRAFT', 'CANCELLED'].includes(doc.status)) doc.status = docs.paymentStatus(doc);
    await doc.save();
    res.json(doc);
  })
);

router.post(
  '/:id/convert',
  asyncHandler(async (req, res) => {
    const source = await findOwned(req);
    if (source.invoiceType === 'INVOICE') throw new HttpError(400, 'This document is already an invoice');
    if (source.convertedTo) throw new HttpError(400, 'This document has already been converted');

    const settings = req.user.settings || {};
    const invoiceDate = today();
    const invoice = new Invoice({
      userId: req.userId,
      invoiceType: 'INVOICE',
      clientId: source.clientId,
      client: source.client.toObject(),
      shippingAddress: source.shippingAddress,
      placeOfSupply: source.placeOfSupply,
      pricesIncludeTax: source.pricesIncludeTax,
      discount: source.discount,
      otherCharges: source.otherCharges,
      otherChargesLabel: source.otherChargesLabel,
      poNumber: source.poNumber,
      termsAndConditions: settings.defaultTerms || source.termsAndConditions,
      notes: source.notes,
      invoiceDate,
      dueDate: addDays(invoiceDate, num(settings.defaultDueDays)),
      convertedFrom: source._id
    });
    docs.applyTotals(invoice, docs.plainItems(source), req.user);
    invoice.status = 'UNPAID';
    invoice.invoiceNumber = await takeNextNumber({ user: req.user, docType: 'INVOICE', date: invoiceDate, Model: Invoice, field: 'invoiceNumber' });
    await invoice.save();
    await adjustStock(req.userId, invoice.items, -1);

    source.status = 'CONVERTED';
    source.convertedTo = invoice._id;
    await source.save();

    res.status(201).json(invoice);
  })
);

router.post(
  '/:id/share',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    if (doc.status === 'DRAFT') throw new HttpError(400, 'Finalise the document before sharing it');
    if (!doc.shareToken) {
      doc.shareToken = crypto.randomBytes(16).toString('hex');
      await doc.save();
    }
    res.json({ token: doc.shareToken });
  })
);

router.delete(
  '/:id/share',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    doc.shareToken = undefined;
    await doc.save();
    res.json({ message: 'Share link disabled' });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await findOwned(req);
    const restoreStock = affectsStock(doc);
    await doc.deleteOne();
    if (restoreStock) await adjustStock(req.userId, doc.items, 1);
    if (doc.convertedFrom) {
      await Invoice.updateOne({ _id: doc.convertedFrom, userId: req.userId }, { $set: { status: 'ACCEPTED' }, $unset: { convertedTo: 1 } });
    }
    if (doc.convertedTo) {
      await Invoice.updateOne({ _id: doc.convertedTo, userId: req.userId }, { $unset: { convertedFrom: 1 } });
    }
    res.json({ message: 'Document deleted' });
  })
);

module.exports = router;
