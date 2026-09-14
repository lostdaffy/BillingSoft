const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { num, round2 } = require('../utils/numbers');
const { str, escapeRegex } = require('../services/documents');

const router = express.Router();
router.use(auth);

const STRING_FIELDS = ['name', 'sku', 'category', 'hsnCode', 'unit', 'description'];

const applyProductBody = (product, body = {}, { isNew }) => {
  for (const field of STRING_FIELDS) {
    if (body[field] !== undefined) product[field] = str(body[field]);
  }
  if (!product.name) throw new HttpError(400, 'Item name is required');
  if (!product.unit) product.unit = 'Nos';

  if (body.type !== undefined) product.type = body.type === 'SERVICE' ? 'SERVICE' : 'GOODS';

  if (body.defaultRate !== undefined && body.defaultRate !== '') {
    const rate = Number(body.defaultRate);
    if (!Number.isFinite(rate) || rate < 0) throw new HttpError(400, 'Sale price must be 0 or more');
    product.defaultRate = rate;
  } else if (isNew) {
    throw new HttpError(400, 'Sale price is required');
  }
  if (body.purchaseRate !== undefined) product.purchaseRate = Math.max(num(body.purchaseRate), 0);
  if (body.taxRate !== undefined) {
    const taxRate = num(body.taxRate);
    if (taxRate < 0 || taxRate > 100) throw new HttpError(400, 'GST rate must be between 0 and 100');
    product.taxRate = taxRate;
  }
  if (body.trackStock !== undefined) product.trackStock = Boolean(body.trackStock);
  if (product.type === 'SERVICE') product.trackStock = false;
  if (body.stock !== undefined && isNew) product.stock = num(body.stock);
  if (body.lowStockAlert !== undefined) product.lowStockAlert = Math.max(num(body.lowStockAlert), 0);
  if (body.isActive !== undefined) product.isActive = Boolean(body.isActive);
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { userId: req.userId };
    if (str(req.query.q)) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ name: rx }, { sku: rx }, { hsnCode: rx }, { category: rx }];
    }
    if (str(req.query.category)) filter.category = str(req.query.category);
    if (['GOODS', 'SERVICE'].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.active === 'true') filter.isActive = { $ne: false };
    if (req.query.lowStock === 'true') {
      filter.trackStock = true;
      filter.$expr = { $lte: ['$stock', '$lowStockAlert'] };
    }

    const products = await Product.find(filter).sort({ name: 1 }).lean();
    res.json(products);
  })
);

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await Product.distinct('category', { userId: req.userId });
    res.json(categories.filter(Boolean).sort((a, b) => a.localeCompare(b)));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, userId: req.userId });
    if (!product) throw new HttpError(404, 'Item not found');
    res.json(product);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const product = new Product({ userId: req.userId });
    applyProductBody(product, req.body, { isNew: true });
    await product.save();
    res.status(201).json(product);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, userId: req.userId });
    if (!product) throw new HttpError(404, 'Item not found');
    applyProductBody(product, req.body, { isNew: false });
    await product.save();
    res.json(product);
  })
);

// body: { mode: 'ADD' | 'REMOVE' | 'SET', quantity }
router.post(
  '/:id/adjust-stock',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, userId: req.userId });
    if (!product) throw new HttpError(404, 'Item not found');
    if (!product.trackStock) throw new HttpError(400, 'Stock tracking is turned off for this item');

    const quantity = num(req.body.quantity);
    const mode = str(req.body.mode).toUpperCase() || 'ADD';
    if (mode === 'SET') {
      product.stock = round2(quantity);
    } else {
      if (quantity <= 0) throw new HttpError(400, 'Enter a quantity greater than 0');
      product.stock = round2(product.stock + (mode === 'REMOVE' ? -quantity : quantity));
    }
    await product.save();
    res.json(product);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!product) throw new HttpError(404, 'Item not found');
    res.json({ message: 'Item deleted' });
  })
);

module.exports = router;
