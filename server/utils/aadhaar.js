// Aadhaar numbers are 12 digits, never start with 0 or 1, and end with a
// Verhoeff check digit, so most typos are caught before saving.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

const normaliseAadhaar = (value) => String(value || '').replace(/\D/g, '');

const isVerhoeffValid = (digits) => {
  let check = 0;
  String(digits)
    .split('')
    .reverse()
    .forEach((digit, index) => {
      check = D[check][P[index % 8][Number(digit)]];
    });
  return check === 0;
};

const verhoeffCheckDigit = (digits) => {
  let check = 0;
  String(digits)
    .split('')
    .reverse()
    .forEach((digit, index) => {
      check = D[check][P[(index + 1) % 8][Number(digit)]];
    });
  return INV[check];
};

const isValidAadhaar = (value) => {
  const digits = normaliseAadhaar(value);
  return /^[2-9]\d{11}$/.test(digits) && isVerhoeffValid(digits);
};

// Shown wherever the document can leave the business (print, share link).
const maskAadhaar = (value) => {
  const digits = normaliseAadhaar(value);
  return digits.length >= 4 ? `XXXX XXXX ${digits.slice(-4)}` : '';
};

module.exports = { normaliseAadhaar, isVerhoeffValid, verhoeffCheckDigit, isValidAadhaar, maskAadhaar };
