const express = require('express');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { PAYMENT_MODES } = require('../utils/constants');
const { rangeFromQuery, dateFilter } = require('../utils/dates');
const { round2 } = require('../utils/numbers');
const { str } = require('../services/documents');

const router = express.Router();
router.use(auth);

const paymentPipeline = ({ userId, range, mode, direction, numberField, partyField, partyIdField, docType }) => {
  const paymentMatch = {};
  if (range) paymentMatch['payments.date'] = range;
  if (mode) paymentMatch['payments.mode'] = mode;
  return [
    { $match: { userId, 'payments.0': { $exists: true } } },
    { $unwind: '$payments' },
    { $match: paymentMatch },
    {
      $project: {
        _id: '$payments._id',
        docId: '$_id',
        docNumber: `$${numberField}`,
        docType,
        partyName: `$${partyField}.name`,
        partyId: `$${partyIdField}`,
        date: '$payments.date',
        amount: '$payments.amount',
        mode: '$payments.mode',
        reference: '$payments.reference',
        note: '$payments.note',
        direction: { $literal: direction }
      }
    }
  ];
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const direction = ['IN', 'OUT'].includes(req.query.direction) ? req.query.direction : 'ALL';
    const range = dateFilter(rangeFromQuery(req.query, 'fy'));
    const mode = PAYMENT_MODES.includes(req.query.mode) ? req.query.mode : null;
    const base = { userId: req.userId, range, mode };

    const [received, made] = await Promise.all([
      direction === 'OUT'
        ? []
        : Invoice.aggregate(paymentPipeline({ ...base, direction: 'IN', numberField: 'invoiceNumber', partyField: 'client', partyIdField: 'clientId', docType: '$invoiceType' })),
      direction === 'IN'
        ? []
        : Purchase.aggregate(paymentPipeline({ ...base, direction: 'OUT', numberField: 'purchaseNumber', partyField: 'supplier', partyIdField: 'supplierId', docType: 'PURCHASE' }))
    ]);

    let payments = [...received, ...made];
    const q = str(req.query.q).toLowerCase();
    if (q) {
      payments = payments.filter((p) =>
        [p.partyName, p.docNumber, p.reference].some((value) => String(value || '').toLowerCase().includes(q))
      );
    }
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const byMode = {};
    let totalIn = 0;
    let totalOut = 0;
    for (const payment of payments) {
      if (payment.direction === 'IN') totalIn += payment.amount;
      else totalOut += payment.amount;
      byMode[payment.mode] = byMode[payment.mode] || { IN: 0, OUT: 0 };
      byMode[payment.mode][payment.direction] = round2(byMode[payment.mode][payment.direction] + payment.amount);
    }

    res.json({
      payments: payments.slice(0, 1000),
      summary: { totalIn: round2(totalIn), totalOut: round2(totalOut), net: round2(totalIn - totalOut), byMode, count: payments.length }
    });
  })
);

module.exports = router;
