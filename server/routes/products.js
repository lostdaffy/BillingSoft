const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// @route   GET /api/products
// @desc    Get all products for logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, hsnCode, defaultRate, description, unit } = req.body;

    if (!name || !hsnCode || !defaultRate) {
      return res.status(400).json({ 
        message: 'Name, HSN code, and default rate are required' 
      });
    }

    const product = new Product({
      userId: req.userId,
      name,
      hsnCode,
      defaultRate,
      description,
      unit
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, hsnCode, defaultRate, description, unit } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (name) product.name = name;
    if (hsnCode) product.hsnCode = hsnCode;
    if (defaultRate !== undefined) product.defaultRate = defaultRate;
    if (description !== undefined) product.description = description;
    if (unit !== undefined) product.unit = unit;

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
