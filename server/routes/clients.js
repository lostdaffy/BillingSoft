const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const auth = require('../middleware/auth');

// @route   GET /api/clients
// @desc    Get all clients for logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const clients = await Client.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/clients/:id
// @desc    Get single client
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/clients
// @desc    Create new client
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, address, aadhaar, panUid, mobile, email, stateCode, gst } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: 'Name and address are required' });
    }

    const client = new Client({
      userId: req.userId,
      name,
      address,
      aadhaar,
      panUid,
      mobile,
      email,
      stateCode,
      gst
    });

    await client.save();
    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update client
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, address, aadhaar, panUid, mobile, email, stateCode, gst } = req.body;

    const client = await Client.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (name) client.name = name;
    if (address) client.address = address;
    if (aadhaar !== undefined) client.aadhaar = aadhaar;
    if (panUid !== undefined) client.panUid = panUid;
    if (mobile !== undefined) client.mobile = mobile;
    if (email !== undefined) client.email = email;
    if (stateCode !== undefined) client.stateCode = stateCode;
    if (gst !== undefined) client.gst = gst;

    await client.save();
    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/clients/:id
// @desc    Delete client
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
