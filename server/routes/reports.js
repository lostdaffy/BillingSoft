const express = require('express');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { OPEN_INVOICE_STATUSES } = require('../utils/constants');
const { today, rangeFromQuery, dateFilter } = require('../utils/dates');
const { num, round2 } = require('../utils/numbers');

const router = express.Router();
router.use(auth);

const salesMatch = (userId, range) => {
  const match = { userId, invoiceType: 'INVOICE', status: { $nin: ['DRAFT', 'CANCELLED'] } };
  const dates = dateFilter(range);
  if (dates) match.invoiceDate = dates;
  return match;
};

const purchaseMatch = (userId, range) => {
  const match = { userId, status: { $ne: 'CANCELLED' } };
  const dates = dateFilter(range);
  if (dates) match.billDate = dates;
  return match;
};

const rangeInfo = (range) => ({
  from: range.from,
  to: range.toExclusive ? new Date(range.toExclusive.getTime() - 86400000) : null
});

const addInto = (map, key, seed, values) => {
  const row = map.get(key) || { ...seed };
  for (const [field, value] of Object.entries(values)) row[field] = round2(num(row[field]) + num(value));
  map.set(key, row);
};

const sumBy = (rows, field) => round2(rows.reduce((sum, row) => sum + num(row[field]), 0));

const docTotals = [
  {
    $group: {
      _id: null,
      count: { $sum: 1 },
      taxable: { $sum: '$subtotal' },
      cgst: { $sum: '$cgst' },
      sgst: { $sum: '$sgst' },
      igst: { $sum: '$igst' },
      tax: { $sum: '$totalTax' },
      total: { $sum: '$totalAmount' },
      paid: { $sum: '$amountPaid' },
      balance: { $sum: '$balanceDue' }
    }
  }
];

const cleanTotals = (rows) => {
  const row = rows[0] || {};
  return ['count', 'taxable', 'cgst', 'sgst', 'igst', 'tax', 'total', 'paid', 'balance'].reduce(
    (out, key) => ({ ...out, [key]: round2(row[key] || 0) }),
    {}
  );
};

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query);
    const dates = dateFilter(range);
    const userId = req.userId;

    const [sales, purchases, expenses, received, paidOut, cogs] = await Promise.all([
      Invoice.aggregate([{ $match: salesMatch(userId, range) }, ...docTotals]),
      Purchase.aggregate([{ $match: purchaseMatch(userId, range) }, ...docTotals]),
      Expense.aggregate([
        { $match: { userId, ...(dates && { date: dates }) } },
        { $group: { _id: null, total: { $sum: '$amount' }, gst: { $sum: '$gstAmount' }, count: { $sum: 1 } } }
      ]),
      Invoice.aggregate([
        { $match: { userId, invoiceType: 'INVOICE' } },
        { $unwind: '$payments' },
        { $match: dates ? { 'payments.date': dates } : {} },
        { $group: { _id: null, total: { $sum: '$payments.amount' } } }
      ]),
      Purchase.aggregate([
        { $match: { userId } },
        { $unwind: '$payments' },
        { $match: dates ? { 'payments.date': dates } : {} },
        { $group: { _id: null, total: { $sum: '$payments.amount' } } }
      ]),
      // Cost of goods sold estimated from each item's purchase price.
      Invoice.aggregate([
        { $match: salesMatch(userId, range) },
        { $unwind: '$items' },
        { $match: { 'items.productId': { $exists: true, $ne: null } } },
        { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $group: { _id: null, total: { $sum: { $multiply: ['$items.quantity', '$product.purchaseRate'] } } } }
      ])
    ]);

    const salesTotals = cleanTotals(sales);
    const purchaseTotals = cleanTotals(purchases);
    const expenseRow = expenses[0] || {};
    const expenseTotal = round2(expenseRow.total || 0);
    const expenseGst = round2(expenseRow.gst || 0);
    const costOfGoods = round2((cogs[0] && cogs[0].total) || 0);
    const grossProfit = round2(salesTotals.taxable - costOfGoods);
    const netExpenses = round2(expenseTotal - expenseGst);

    res.json({
      range: rangeInfo(range),
      sales: { ...salesTotals, received: round2((received[0] && received[0].total) || 0) },
      purchases: { ...purchaseTotals, paidOut: round2((paidOut[0] && paidOut[0].total) || 0) },
      expenses: { total: expenseTotal, gst: expenseGst, net: netExpenses, count: expenseRow.count || 0 },
      profit: {
        salesTaxable: salesTotals.taxable,
        costOfGoods,
        grossProfit,
        expenses: netExpenses,
        netProfit: round2(grossProfit - netExpenses)
      },
      gst: {
        output: salesTotals.tax,
        input: round2(purchaseTotals.tax + expenseGst),
        net: round2(salesTotals.tax - purchaseTotals.tax - expenseGst)
      }
    });
  })
);

router.get(
  '/sales',
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query);
    const rows = await Invoice.find(salesMatch(req.userId, range))
      .sort({ invoiceDate: 1, invoiceNumber: 1 })
      .select('invoiceNumber invoiceDate dueDate client.name client.gst placeOfSupply subtotal cgst sgst igst totalTax totalAmount amountPaid balanceDue status')
      .lean();
    res.json({
      range: rangeInfo(range),
      rows,
      totals: {
        count: rows.length,
        taxable: sumBy(rows, 'subtotal'),
        cgst: sumBy(rows, 'cgst'),
        sgst: sumBy(rows, 'sgst'),
        igst: sumBy(rows, 'igst'),
        tax: sumBy(rows, 'totalTax'),
        total: sumBy(rows, 'totalAmount'),
        paid: sumBy(rows, 'amountPaid'),
        balance: sumBy(rows, 'balanceDue')
      }
    });
  })
);

router.get(
  '/purchases',
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query);
    const rows = await Purchase.find(purchaseMatch(req.userId, range))
      .sort({ billDate: 1 })
      .select('purchaseNumber billNumber billDate dueDate supplier.name supplier.gst placeOfSupply subtotal cgst sgst igst totalTax totalAmount amountPaid balanceDue status')
      .lean();
    res.json({
      range: rangeInfo(range),
      rows,
      totals: {
        count: rows.length,
        taxable: sumBy(rows, 'subtotal'),
        cgst: sumBy(rows, 'cgst'),
        sgst: sumBy(rows, 'sgst'),
        igst: sumBy(rows, 'igst'),
        tax: sumBy(rows, 'totalTax'),
        total: sumBy(rows, 'totalAmount'),
        paid: sumBy(rows, 'amountPaid'),
        balance: sumBy(rows, 'balanceDue')
      }
    });
  })
);

// GSTR-1 style output summary plus input tax from purchases and expenses.
router.get(
  '/gst',
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query);
    const dates = dateFilter(range);
    const [sales, purchases, expenseGst] = await Promise.all([
      Invoice.find(salesMatch(req.userId, range))
        .sort({ invoiceDate: 1 })
        .select('invoiceNumber invoiceDate client placeOfSupply items subtotal cgst sgst igst totalTax totalAmount')
        .lean(),
      Purchase.find(purchaseMatch(req.userId, range))
        .sort({ billDate: 1 })
        .select('purchaseNumber billNumber billDate supplier placeOfSupply items subtotal cgst sgst igst totalTax totalAmount')
        .lean(),
      Expense.aggregate([
        { $match: { userId: req.userId, ...(dates && { date: dates }) } },
        { $group: { _id: null, total: { $sum: '$gstAmount' } } }
      ])
    ]);

    const b2b = [];
    const b2c = new Map();
    const hsn = new Map();
    const rateWise = new Map();
    const taxFields = (item) => ({ taxable: item.taxableValue, cgst: item.cgst, sgst: item.sgst, igst: item.igst });

    for (const invoice of sales) {
      const gstin = (invoice.client && invoice.client.gst) || '';
      if (gstin) {
        b2b.push({
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          partyName: invoice.client.name,
          gstin,
          placeOfSupply: invoice.placeOfSupply,
          taxable: invoice.subtotal,
          cgst: invoice.cgst,
          sgst: invoice.sgst,
          igst: invoice.igst,
          tax: invoice.totalTax,
          total: invoice.totalAmount
        });
      }
      for (const item of invoice.items || []) {
        const rate = num(item.taxRate);
        addInto(rateWise, String(rate), { rate }, taxFields(item));
        if (!gstin) {
          addInto(b2c, `${invoice.placeOfSupply || ''}|${rate}`, { placeOfSupply: invoice.placeOfSupply || '', rate }, taxFields(item));
        }
        const hsnKey = `${item.hsnCode || ''}|${rate}|${item.unit || ''}`;
        if (!hsn.has(hsnKey)) hsn.set(hsnKey, { hsnCode: item.hsnCode || '', description: item.description, unit: item.unit || '', rate });
        addInto(hsn, hsnKey, {}, { quantity: item.quantity, ...taxFields(item), total: item.amount });
      }
    }

    const purchaseB2b = purchases.map((purchase) => ({
      purchaseNumber: purchase.purchaseNumber,
      billNumber: purchase.billNumber,
      billDate: purchase.billDate,
      partyName: purchase.supplier && purchase.supplier.name,
      gstin: (purchase.supplier && purchase.supplier.gst) || '',
      taxable: purchase.subtotal,
      cgst: purchase.cgst,
      sgst: purchase.sgst,
      igst: purchase.igst,
      tax: purchase.totalTax,
      total: purchase.totalAmount
    }));

    const totalsOf = (rows) => ({
      taxable: sumBy(rows, 'taxable'),
      cgst: sumBy(rows, 'cgst'),
      sgst: sumBy(rows, 'sgst'),
      igst: sumBy(rows, 'igst')
    });
    const withTax = (totals) => ({ ...totals, tax: round2(totals.cgst + totals.sgst + totals.igst) });

    const output = withTax(totalsOf([...rateWise.values()]));
    const input = withTax(totalsOf(purchaseB2b));
    const otherInput = round2((expenseGst[0] && expenseGst[0].total) || 0);

    res.json({
      range: rangeInfo(range),
      output,
      input: { ...input, expenses: otherInput, total: round2(input.tax + otherInput) },
      netPayable: {
        cgst: round2(output.cgst - input.cgst),
        sgst: round2(output.sgst - input.sgst),
        igst: round2(output.igst - input.igst),
        total: round2(output.tax - input.tax - otherInput)
      },
      b2b,
      b2c: [...b2c.values()].sort((a, b) => a.placeOfSupply.localeCompare(b.placeOfSupply) || a.rate - b.rate),
      hsn: [...hsn.values()].sort((a, b) => a.hsnCode.localeCompare(b.hsnCode)),
      rateWise: [...rateWise.values()].sort((a, b) => a.rate - b.rate),
      purchases: purchaseB2b
    });
  })
);

const AGE_BUCKETS = [
  { key: 'current', label: 'Not due', max: 0 },
  { key: 'd1_30', label: '1-30 days', max: 30 },
  { key: 'd31_60', label: '31-60 days', max: 60 },
  { key: 'd61_90', label: '61-90 days', max: 90 },
  { key: 'd90plus', label: '90+ days', max: Infinity }
];

const bucketFor = (dueDate, now) => {
  if (!dueDate) return 'current';
  const days = Math.floor((now - new Date(dueDate)) / 86400000);
  return AGE_BUCKETS.find((bucket) => days <= bucket.max).key;
};

router.get(
  '/outstanding',
  asyncHandler(async (req, res) => {
    const type = req.query.type === 'payable' ? 'payable' : 'receivable';
    const now = today();
    const isReceivable = type === 'receivable';

    const [documents, openingParties] = await Promise.all([
      isReceivable
        ? Invoice.find({ userId: req.userId, invoiceType: 'INVOICE', status: { $in: OPEN_INVOICE_STATUSES }, balanceDue: { $gt: 0 } })
            .select('invoiceNumber invoiceDate dueDate client clientId totalAmount amountPaid balanceDue')
            .lean()
        : Purchase.find({ userId: req.userId, status: { $in: ['UNPAID', 'PARTIAL'] }, balanceDue: { $gt: 0 } })
            .select('purchaseNumber billNumber billDate dueDate supplier supplierId totalAmount amountPaid balanceDue')
            .lean(),
      Client.find({ userId: req.userId, openingBalance: { $gt: 0 }, openingBalanceType: isReceivable ? 'RECEIVABLE' : 'PAYABLE' })
        .select('name mobile openingBalance')
        .lean()
    ]);

    const parties = new Map();
    const seed = (key, name, mobile, partyId) => {
      if (!parties.has(key)) {
        parties.set(key, {
          partyId,
          name,
          mobile: mobile || '',
          documents: [],
          count: 0,
          balance: 0,
          current: 0,
          d1_30: 0,
          d31_60: 0,
          d61_90: 0,
          d90plus: 0
        });
      }
      return parties.get(key);
    };

    for (const party of openingParties) {
      const row = seed(String(party._id), party.name, party.mobile, party._id);
      row.balance = round2(row.balance + party.openingBalance);
      row.current = round2(row.current + party.openingBalance);
      row.documents.push({ number: 'Opening Balance', balanceDue: party.openingBalance });
    }

    for (const doc of documents) {
      const partyInfo = isReceivable ? doc.client : doc.supplier;
      const partyId = isReceivable ? doc.clientId : doc.supplierId;
      const key = partyId ? String(partyId) : `name:${(partyInfo && partyInfo.name) || 'Unknown'}`;
      const row = seed(key, (partyInfo && partyInfo.name) || 'Unknown', partyInfo && partyInfo.mobile, partyId);
      const bucket = bucketFor(doc.dueDate, now);
      row.count += 1;
      row.balance = round2(row.balance + doc.balanceDue);
      row[bucket] = round2(row[bucket] + doc.balanceDue);
      row.documents.push({
        docId: doc._id,
        number: isReceivable ? doc.invoiceNumber : doc.billNumber || doc.purchaseNumber,
        date: isReceivable ? doc.invoiceDate : doc.billDate,
        dueDate: doc.dueDate,
        totalAmount: doc.totalAmount,
        balanceDue: doc.balanceDue,
        overdueDays: doc.dueDate ? Math.max(Math.floor((now - new Date(doc.dueDate)) / 86400000), 0) : 0
      });
    }

    const rows = [...parties.values()].sort((a, b) => b.balance - a.balance);
    const totals = AGE_BUCKETS.reduce((out, bucket) => ({ ...out, [bucket.key]: sumBy(rows, bucket.key) }), { balance: sumBy(rows, 'balance') });
    res.json({ type, buckets: AGE_BUCKETS.map(({ key, label }) => ({ key, label })), rows, totals });
  })
);

router.get(
  '/items',
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query);
    const groupStage = {
      $group: {
        _id: { $ifNull: ['$items.productId', '$items.description'] },
        name: { $first: '$items.description' },
        hsnCode: { $first: '$items.hsnCode' },
        unit: { $first: '$items.unit' },
        quantity: { $sum: '$items.quantity' },
        taxable: { $sum: '$items.taxableValue' },
        amount: { $sum: '$items.amount' }
      }
    };
    const [sold, bought] = await Promise.all([
      Invoice.aggregate([{ $match: salesMatch(req.userId, range) }, { $unwind: '$items' }, groupStage]),
      Purchase.aggregate([{ $match: purchaseMatch(req.userId, range) }, { $unwind: '$items' }, groupStage])
    ]);

    const rows = new Map();
    for (const row of sold) {
      rows.set(String(row._id), { key: String(row._id), name: row.name, hsnCode: row.hsnCode, unit: row.unit, soldQty: round2(row.quantity), salesTaxable: round2(row.taxable), salesAmount: round2(row.amount), purchasedQty: 0, purchaseAmount: 0 });
    }
    for (const row of bought) {
      const existing = rows.get(String(row._id)) || { key: String(row._id), name: row.name, hsnCode: row.hsnCode, unit: row.unit, soldQty: 0, salesTaxable: 0, salesAmount: 0 };
      rows.set(String(row._id), { ...existing, purchasedQty: round2(row.quantity), purchaseAmount: round2(row.amount) });
    }

    const list = [...rows.values()].sort((a, b) => b.salesAmount - a.salesAmount);
    res.json({
      range: rangeInfo(range),
      rows: list,
      totals: { salesTaxable: sumBy(list, 'salesTaxable'), salesAmount: sumBy(list, 'salesAmount'), purchaseAmount: sumBy(list, 'purchaseAmount') }
    });
  })
);

router.get(
  '/stock',
  asyncHandler(async (req, res) => {
    const products = await Product.find({ userId: req.userId, trackStock: true }).sort({ name: 1 }).lean();
    const rows = products.map((product) => ({
      _id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      stock: product.stock,
      lowStockAlert: product.lowStockAlert,
      purchaseRate: product.purchaseRate,
      saleRate: product.defaultRate,
      stockValue: round2(Math.max(product.stock, 0) * num(product.purchaseRate)),
      saleValue: round2(Math.max(product.stock, 0) * num(product.defaultRate)),
      isLow: product.stock <= product.lowStockAlert
    }));
    res.json({
      rows,
      totals: {
        items: rows.length,
        lowStock: rows.filter((row) => row.isLow).length,
        stockValue: sumBy(rows, 'stockValue'),
        saleValue: sumBy(rows, 'saleValue')
      }
    });
  })
);

router.get(
  '/expenses',
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query);
    const dates = dateFilter(range);
    const match = { userId: req.userId, ...(dates && { date: dates }) };
    const [byCategory, rows] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$category', total: { $sum: '$amount' }, gst: { $sum: '$gstAmount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Expense.find(match).sort({ date: 1 }).lean()
    ]);
    res.json({
      range: rangeInfo(range),
      byCategory: byCategory.map((row) => ({ category: row._id, total: round2(row.total), gst: round2(row.gst), count: row.count })),
      rows,
      totals: { total: sumBy(rows, 'amount'), gst: sumBy(rows, 'gstAmount'), count: rows.length }
    });
  })
);

module.exports = router;
