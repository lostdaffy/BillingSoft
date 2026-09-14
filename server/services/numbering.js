const Counter = require('../models/Counter');
const { DOC_PREFIX_KEYS, DEFAULT_PREFIXES } = require('../utils/constants');
const { financialYearLabel } = require('../utils/dates');
const { HttpError } = require('../utils/asyncHandler');

// Format: PREFIX/FY/0001, e.g. INV/26-27/0001 (14 chars, within the GST limit of 16).
const prefixFor = (user, docType) => {
  const key = DOC_PREFIX_KEYS[docType];
  const prefix = String((user.settings && user.settings[key]) || DEFAULT_PREFIXES[docType]);
  return prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || DEFAULT_PREFIXES[docType];
};

const formatNumber = (prefix, fy, seq) => `${prefix}/${fy}/${String(seq).padStart(4, '0')}`;

const counterKey = (docType, fy) => `${docType}:${fy}`;

const peekNextNumber = async ({ user, docType, date, Model, field }) => {
  const fy = financialYearLabel(date);
  const prefix = prefixFor(user, docType);
  const counter = await Counter.findOne({ userId: user._id, key: counterKey(docType, fy) }).lean();
  let seq = ((counter && counter.seq) || 0) + 1;
  for (let i = 0; i < 1000; i += 1) {
    const candidate = formatNumber(prefix, fy, seq);
    // eslint-disable-next-line no-await-in-loop
    if (!(await Model.exists({ userId: user._id, [field]: candidate }))) return { number: candidate, seq, fy, prefix };
    seq += 1;
  }
  return { number: formatNumber(prefix, fy, seq), seq, fy, prefix };
};

// Atomically reserves the next free number. Numbers already taken by manually
// numbered documents are skipped.
const takeNextNumber = async ({ user, docType, date, Model, field }) => {
  const fy = financialYearLabel(date);
  const prefix = prefixFor(user, docType);
  const filter = { userId: user._id, key: counterKey(docType, fy) };

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    let counter;
    try {
      // eslint-disable-next-line no-await-in-loop
      counter = await Counter.findOneAndUpdate(filter, { $inc: { seq: 1 } }, { upsert: true, new: true });
    } catch (error) {
      if (error.code === 11000) continue; // concurrent first insert; retry
      throw error;
    }
    const candidate = formatNumber(prefix, fy, counter.seq);
    // eslint-disable-next-line no-await-in-loop
    if (!(await Model.exists({ userId: user._id, [field]: candidate }))) return candidate;
  }
  throw new HttpError(500, 'Could not generate a document number');
};

const setNextNumber = async ({ user, docType, nextNumber, date }) => {
  const fy = financialYearLabel(date);
  const seq = Math.max(parseInt(nextNumber, 10) || 1, 1) - 1;
  await Counter.findOneAndUpdate(
    { userId: user._id, key: counterKey(docType, fy) },
    { $set: { seq } },
    { upsert: true }
  );
};

module.exports = { prefixFor, formatNumber, peekNextNumber, takeNextNumber, setNextNumber };
