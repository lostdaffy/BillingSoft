const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isValidAadhaar, isVerhoeffValid, maskAadhaar, normaliseAadhaar, verhoeffCheckDigit } = require('../utils/aadhaar');

test('Verhoeff matches the published example (236 -> check digit 3)', () => {
  assert.equal(verhoeffCheckDigit('236'), 3);
  assert.equal(isVerhoeffValid('2363'), true);
  assert.equal(isVerhoeffValid('2364'), false);
});

test('Aadhaar validation', () => {
  const base = '23456789012';
  const valid = base + verhoeffCheckDigit(base);
  const wrongCheck = base + ((verhoeffCheckDigit(base) + 1) % 10);

  assert.equal(isValidAadhaar(valid), true);
  assert.equal(isValidAadhaar(`${valid.slice(0, 4)} ${valid.slice(4, 8)} ${valid.slice(8)}`), true);
  assert.equal(isValidAadhaar(wrongCheck), false, 'typo in the last digit');
  assert.equal(isValidAadhaar(valid.slice(0, 11)), false, '11 digits');

  const startsWithOne = `1${base.slice(1)}`;
  assert.equal(isValidAadhaar(startsWithOne + verhoeffCheckDigit(startsWithOne)), false, 'cannot start with 1');
  assert.equal(isValidAadhaar(''), false);
});

test('Aadhaar masking and normalising', () => {
  assert.equal(normaliseAadhaar(' 2345-6789 0123 '), '234567890123');
  assert.equal(maskAadhaar('234567890123'), 'XXXX XXXX 0123');
  assert.equal(maskAadhaar('XXXX XXXX 0123'), 'XXXX XXXX 0123', 'already masked stays masked');
  assert.equal(maskAadhaar(''), '');
});
