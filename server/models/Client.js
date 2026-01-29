const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  aadhaar: {
    type: String,
    default: ''
  },
  panUid: {
    type: String,
    default: ''
  },
  mobile: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  stateCode: {
    type: String,
    default: ''
  },
  gst: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
clientSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Client', clientSchema);
