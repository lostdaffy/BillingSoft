const express = require('express');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { OPEN_INVOICE_STATUSES } = require('../utils/constants');
const { today, addDays, financialYearRange, financialYearLabel } = require('../utils/dates');
const { round2 } = require('../utils/numbers');

const router = express.Router();
router.use(auth);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const first = (rows, field = 'total') => round2((rows[0] && rows[0][field]) || 0);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const now = today();
    const tomorrow = addDays(now, 1);
    const fy = financialYearRange(now);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    const sales = { userId, invoiceType: 'INVOICE', status: { $nin: ['DRAFT', 'CANCELLED'] } };
    const purchases = { userId, status: { $ne: 'CANCELLED' } };

    const salesTotal = (from, to) =>
      Invoice.aggregate([
        { $match: { ...sales, invoiceDate: { $gte: from, $lt: to } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]);
    const receivedTotal = (from, to) =>
      Invoice.aggregate([
        { $match: sales },
        { $unwind: '$payments' },
        { $match: { 'payments.date': { $gte: from, $lt: to } } },
        { $group: { _id: null, total: { $sum: '$payments.amount' } } }
      ]);
    const byMonth = (Model, match, dateField, valueField, unwind) =>
      Model.aggregate([
        { $match: match },
        ...(unwind ? [{ $unwind: `$${unwind}` }] : []),
        { $match: { [dateField]: { $gte: chartStart, $lt: nextMonthStart } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: `$${dateField}` } }, total: { $sum: `$${valueField}` } } }
      ]);

    const [
      todaySales,
      monthSales,
      fySales,
      monthReceived,
      fyReceived,
      receivable,
      overdue,
      payable,
      monthPurchases,
      monthExpenses,
      monthlySales,
      monthlyReceived,
      monthlyExpenses,
      recentInvoices,
      overdueInvoices,
      lowStock,
      topCustomers,
      openQuotations,
      partyCount,
      itemCount
    ] = await Promise.all([
      salesTotal(now, tomorrow),
      salesTotal(monthStart, nextMonthStart),
      salesTotal(fy.from, fy.to),
      receivedTotal(monthStart, nextMonthStart),
      receivedTotal(fy.from, fy.to),
      Invoice.aggregate([
        { $match: { ...sales, balanceDue: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$balanceDue' }, count: { $sum: 1 } } }
      ]),
      Invoice.aggregate([
        { $match: { ...sales, status: { $in: OPEN_INVOICE_STATUSES }, balanceDue: { $gt: 0 }, dueDate: { $lt: now } } },
        { $group: { _id: null, total: { $sum: '$balanceDue' }, count: { $sum: 1 } } }
      ]),
      Purchase.aggregate([
        { $match: { ...purchases, balanceDue: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$balanceDue' }, count: { $sum: 1 } } }
      ]),
      Purchase.aggregate([
        { $match: { ...purchases, billDate: { $gte: monthStart, $lt: nextMonthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Expense.aggregate([
        { $match: { userId, date: { $gte: monthStart, $lt: nextMonthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      byMonth(Invoice, sales, 'invoiceDate', 'totalAmount'),
      byMonth(Invoice, sales, 'payments.date', 'payments.amount', 'payments'),
      byMonth(Expense, { userId }, 'date', 'amount'),
      Invoice.find({ userId, invoiceType: 'INVOICE' })
        .sort({ invoiceDate: -1, createdAt: -1 })
        .limit(6)
        .select('invoiceNumber invoiceType client.name invoiceDate dueDate totalAmount balanceDue amountPaid status'),
      Invoice.find({ ...sales, status: { $in: OPEN_INVOICE_STATUSES }, balanceDue: { $gt: 0 }, dueDate: { $lt: now } })
        .sort({ dueDate: 1 })
        .limit(5)
        .select('invoiceNumber invoiceType client.name client.mobile invoiceDate dueDate totalAmount balanceDue amountPaid status'),
      Product.find({ userId, trackStock: true, isActive: { $ne: false }, $expr: { $lte: ['$stock', '$lowStockAlert'] } })
        .sort({ stock: 1 })
        .limit(6)
        .select('name stock lowStockAlert unit')
        .lean(),
      Invoice.aggregate([
        { $match: { ...sales, invoiceDate: { $gte: fy.from, $lt: fy.to } } },
        { $group: { _id: { $ifNull: ['$clientId', '$client.name'] }, name: { $first: '$client.name' }, clientId: { $first: '$clientId' }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]),
      Invoice.countDocuments({ userId, invoiceType: { $in: ['QUOTATION', 'ESTIMATE', 'PROFORMA'] }, status: { $in: ['DRAFT', 'SENT', 'ACCEPTED'] } }),
      Client.countDocuments({ userId }),
      Product.countDocuments({ userId })
    ]);

    const toMap = (rows) => new Map(rows.map((row) => [row._id, round2(row.total)]));
    const salesMap = toMap(monthlySales);
    const receivedMap = toMap(monthlyReceived);
    const expenseMap = toMap(monthlyExpenses);
    const monthly = [];
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(Date.UTC(chartStart.getUTCFullYear(), chartStart.getUTCMonth() + i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      monthly.push({
        month: key,
        label: `${MONTH_NAMES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`,
        sales: salesMap.get(key) || 0,
        received: receivedMap.get(key) || 0,
        expenses: expenseMap.get(key) || 0
      });
    }

    res.json({
      financialYear: financialYearLabel(now),
      today: { sales: first(todaySales), invoices: first(todaySales, 'count') },
      month: {
        sales: first(monthSales),
        invoices: first(monthSales, 'count'),
        received: first(monthReceived),
        purchases: first(monthPurchases),
        expenses: first(monthExpenses)
      },
      year: { sales: first(fySales), invoices: first(fySales, 'count'), received: first(fyReceived) },
      receivable: { amount: first(receivable), count: first(receivable, 'count') },
      overdue: { amount: first(overdue), count: first(overdue, 'count') },
      payable: { amount: first(payable), count: first(payable, 'count') },
      monthly,
      recentInvoices,
      overdueInvoices,
      lowStock,
      topCustomers: topCustomers.map((row) => ({ name: row.name, clientId: row.clientId, total: round2(row.total), count: row.count })),
      counts: { openQuotations, parties: partyCount, items: itemCount }
    });
  })
);

module.exports = router;
