const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const auth = require('../middleware/auth');

const generateInvoiceNumber = async (userId) => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);

  return `INV-${timestamp}-${random}`;
};

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const convertTwoDigit = (n) => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  };
  
  const convertThreeDigit = (n) => {
    if (n < 100) return convertTwoDigit(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertTwoDigit(n % 100) : '');
  };
  
  if (num < 1000) return convertThreeDigit(num);
  if (num < 100000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertTwoDigit(thousands) + ' Thousand' + (remainder ? ' ' + convertThreeDigit(remainder) : '');
  }
  if (num < 10000000) {
    const lakhs = Math.floor(num / 100000);
    const remainder = num % 100000;
    return convertTwoDigit(lakhs) + ' Lakh' + (remainder ? ' ' + numberToWords(remainder) : '');
  }
  
  const crores = Math.floor(num / 10000000);
  const remainder = num % 10000000;
  return convertTwoDigit(crores) + ' Crore' + (remainder ? ' ' + numberToWords(remainder) : '');
};

router.get('/', auth, async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    const query = { userId: req.userId };
    if (status) query.status = status;
    
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Invoice.countDocuments(query);
    
    res.json({
      invoices,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/stats', auth, async (req, res) => {
  try {
    const totalInvoices = await Invoice.countDocuments({ userId: req.userId });
    
    const amountStats = await Invoice.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const paidAmount = amountStats.find(s => s._id === 'PAID')?.total || 0;
    const pendingAmount = amountStats.filter(s => ['SENT', 'OVERDUE'].includes(s._id))
      .reduce((sum, s) => sum + s.total, 0);
    const totalAmount = amountStats.reduce((sum, s) => sum + s.total, 0);
    
    const recentInvoices = await Invoice.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('invoiceNumber client invoiceDate totalAmount status');
    
    res.json({
      totalInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      recentInvoices
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/', auth, async (req, res) => {
  try {
    const {
      invoiceType,
      client,
      invoiceDate,
      dueDate,
      items,
      discount,
      tax,
      status,
      termsAndConditions,
      notes
    } = req.body;

    if (!client || !client.name || !client.address) {
      return res.status(400).json({ message: 'Client details are required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = subtotal - (discount || 0) + (tax || 0);
    const amountInWords = numberToWords(Math.floor(totalAmount)) + ' Rupees Only';

    const invoiceNumber = await generateInvoiceNumber(req.userId);

    const numberedItems = items.map((item, index) => ({
      ...item,
      srNo: index + 1
    }));

    const invoice = new Invoice({
      userId: req.userId,
      invoiceNumber,
      invoiceType: invoiceType || 'INVOICE',
      client,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || new Date(),
      items: numberedItems,
      subtotal,
      discount: discount || 0,
      tax: tax || 0,
      totalAmount,
      amountInWords,
      status: status || 'DRAFT',
      termsAndConditions,
      notes
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const {
      invoiceType,
      client,
      invoiceDate,
      dueDate,
      items,
      discount,
      tax,
      status,
      termsAndConditions,
      notes
    } = req.body;

    if (invoiceType) invoice.invoiceType = invoiceType;
    if (client) invoice.client = client;
    if (invoiceDate) invoice.invoiceDate = invoiceDate;
    if (dueDate) invoice.dueDate = dueDate;
    if (status) invoice.status = status;
    if (termsAndConditions !== undefined) invoice.termsAndConditions = termsAndConditions;
    if (notes !== undefined) invoice.notes = notes;

    if (items) {
      const numberedItems = items.map((item, index) => ({
        ...item,
        srNo: index + 1
      }));
      invoice.items = numberedItems;
      invoice.subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    }

    if (discount !== undefined) invoice.discount = discount;
    if (tax !== undefined) invoice.tax = tax;

    invoice.totalAmount = invoice.subtotal - invoice.discount + invoice.tax;
    invoice.amountInWords = numberToWords(Math.floor(invoice.totalAmount)) + ' Rupees Only';
    invoice.updatedAt = Date.now();

    await invoice.save();
    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
