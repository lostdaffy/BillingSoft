const { num, round2 } = require('./numbers');

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const isValidGstin = (gstin) => GSTIN_REGEX.test(String(gstin || '').trim().toUpperCase());

const stateCodeFromGstin = (gstin) => {
  const value = String(gstin || '').trim();
  return /^\d{2}/.test(value) ? value.slice(0, 2) : '';
};

const normaliseStateCode = (value) => {
  const code = String(value || '').trim();
  return /^\d$/.test(code) ? `0${code}` : code;
};

/**
 * Single source of truth for document maths (sales invoices and purchase bills).
 * Line: gross = qty x rate, less line discount %, then GST on the taxable value
 * (or GST extracted from it when prices include tax). Intra-state tax splits into
 * CGST + SGST; inter-state tax is IGST.
 */
const calculateDocument = ({
  items = [],
  companyStateCode = '',
  placeOfSupply = '',
  pricesIncludeTax = false,
  discount = 0,
  otherCharges = 0,
  roundOff = true
}) => {
  const companyState = normaliseStateCode(companyStateCode);
  const supplyState = normaliseStateCode(placeOfSupply) || companyState;
  const isInterState = Boolean(companyState && supplyState && companyState !== supplyState);

  let subtotal = 0;
  let totalDiscount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const lines = items.map((raw, index) => {
    const quantity = Math.max(num(raw.quantity), 0);
    const rate = Math.max(num(raw.rate), 0);
    const discountPercent = Math.min(Math.max(num(raw.discountPercent), 0), 100);
    const taxRate = Math.max(num(raw.taxRate), 0);

    const gross = quantity * rate;
    const discountAmount = (gross * discountPercent) / 100;
    const net = gross - discountAmount;
    const taxableValue = round2(pricesIncludeTax ? net / (1 + taxRate / 100) : net);
    const tax = (taxableValue * taxRate) / 100;

    const line = {
      srNo: index + 1,
      description: String(raw.description || '').trim(),
      hsnCode: String(raw.hsnCode || '').trim(),
      unit: String(raw.unit || 'Nos').trim() || 'Nos',
      quantity,
      rate,
      discountPercent,
      discountAmount: round2(discountAmount),
      taxRate,
      taxableValue,
      cgst: isInterState ? 0 : round2(tax / 2),
      sgst: isInterState ? 0 : round2(tax / 2),
      igst: isInterState ? round2(tax) : 0
    };
    if (raw.productId) line.productId = raw.productId;
    line.amount = round2(line.taxableValue + line.cgst + line.sgst + line.igst);

    subtotal += line.taxableValue;
    totalDiscount += line.discountAmount;
    cgst += line.cgst;
    sgst += line.sgst;
    igst += line.igst;
    return line;
  });

  const totalTax = round2(cgst + sgst + igst);
  const additionalDiscount = Math.max(num(discount), 0);
  const charges = Math.max(num(otherCharges), 0);
  const beforeRound = round2(subtotal + totalTax + charges - additionalDiscount);
  const totalAmount = Math.max(roundOff ? Math.round(beforeRound) : beforeRound, 0);

  return {
    items: lines,
    isInterState,
    placeOfSupply: supplyState,
    subtotal: round2(subtotal),
    totalDiscount: round2(totalDiscount),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    totalTax,
    discount: additionalDiscount,
    otherCharges: charges,
    roundOff: round2(totalAmount - beforeRound),
    totalAmount: round2(totalAmount)
  };
};

module.exports = { GSTIN_REGEX, isValidGstin, stateCodeFromGstin, normaliseStateCode, calculateDocument };
