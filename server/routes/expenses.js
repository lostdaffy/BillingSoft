const express = require('express');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_MODES } = require('../utils/constants');
const { toDateOnly, today, rangeFromQuery, dateFilter } = require('../utils/dates');
const { num, round2 } = require('../utils/numbers');
const { str, escapeRegex, paginate } = require('../services/documents');

const router = express.Router();
router.use(auth);

const applyExpenseBody = (expense, body = {}) => {
  if (body.category !== undefined) expense.category = str(body.category);
  if (body.amount !== undefined) expense.amount = round2(body.amount);
  if (body.gstAmount !== undefined) expense.gstAmount = Math.max(round2(body.gstAmount), 0);
  if (body.date !== undefined) {
    const date = toDateOnly(body.date);
    if (!date) throw new HttpError(400, 'Invalid date');
    expense.date = date;
  }
  if (body.paymentMode !== undefined) {
    const mode = str(body.paymentMode).toUpperCase();
    expense.paymentMode = PAYMENT_MODES.includes(mode) ? mode : 'CASH';
  }
  for (const field of ['payee', 'reference', 'note']) {
    if (body[field] !== undefined) expense[field] = str(body[field]);
  }
  if (!expense.category) throw new HttpError(400, 'Category is required');
  if (!(num(expense.amount) > 0)) throw new HttpError(400, 'Amount must be greater than 0');
  if (num(expense.gstAmount) > num(expense.amount)) throw new HttpError(400, 'GST amount cannot exceed the total amount');
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { userId: req.userId };
    const range = dateFilter(rangeFromQuery(req.query, 'none'));
    if (range) filter.date = range;
    if (str(req.query.category)) filter.category = str(req.query.category);
    if (str(req.query.q)) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ category: rx }, { payee: rx }, { reference: rx }, { note: rx }];
    }

    const { page, limit, skip } = paginate(req.query);
    const [expenses, total, summary] = await Promise.all([
      Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: '$category', total: { $sum: '$amount' }, gst: { $sum: '$gstAmount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ])
    ]);

    res.json({
      expenses,
      pagination: { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) },
      summary: {
        total: round2(summary.reduce((sum, row) => sum + row.total, 0)),
        gst: round2(summary.reduce((sum, row) => sum + row.gst, 0)),
        byCategory: summary.map((row) => ({ category: row._id, total: round2(row.total), count: row.count }))
      }
    });
  })
);

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const used = await Expense.distinct('category', { userId: req.userId });
    const all = [...new Set([...DEFAULT_EXPENSE_CATEGORIES, ...used.filter(Boolean)])];
    res.json(all.sort((a, b) => a.localeCompare(b)));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const expense = new Expense({ userId: req.userId, date: today() });
    applyExpenseBody(expense, req.body);
    await expense.save();
    res.status(201).json(expense);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.userId });
    if (!expense) throw new HttpError(404, 'Expense not found');
    applyExpenseBody(expense, req.body);
    await expense.save();
    res.json(expense);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!expense) throw new HttpError(404, 'Expense not found');
    res.json({ message: 'Expense deleted' });
  })
);

module.exports = router;
