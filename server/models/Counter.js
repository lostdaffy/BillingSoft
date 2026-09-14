const mongoose = require('mongoose');

// Atomic per-user sequence, keyed like "INVOICE:26-27".
const counterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

counterSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);
