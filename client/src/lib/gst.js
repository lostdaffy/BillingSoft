import { toNumber, round2 } from './format';

const normaliseStateCode = (value) => {
  const code = String(value || '').trim();
  return /^\d$/.test(code) ? `0${code}` : code;
};

// Mirrors server/utils/gst.js so the form preview matches what the server saves.
export const calculateDocument = ({
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

  const lines = items.map((raw) => {
    const quantity = Math.max(toNumber(raw.quantity), 0);
    const rate = Math.max(toNumber(raw.rate), 0);
    const discountPercent = Math.min(Math.max(toNumber(raw.discountPercent), 0), 100);
    const taxRate = Math.max(toNumber(raw.taxRate), 0);
    const gross = quantity * rate;
    const discountAmount = (gross * discountPercent) / 100;
    const net = gross - discountAmount;
    const taxableValue = round2(pricesIncludeTax ? net / (1 + taxRate / 100) : net);
    const tax = (taxableValue * taxRate) / 100;
    const line = {
      taxableValue,
      discountAmount: round2(discountAmount),
      cgst: isInterState ? 0 : round2(tax / 2),
      sgst: isInterState ? 0 : round2(tax / 2),
      igst: isInterState ? round2(tax) : 0
    };
    line.amount = round2(line.taxableValue + line.cgst + line.sgst + line.igst);
    subtotal += line.taxableValue;
    totalDiscount += line.discountAmount;
    cgst += line.cgst;
    sgst += line.sgst;
    igst += line.igst;
    return line;
  });

  const totalTax = round2(cgst + sgst + igst);
  const beforeRound = round2(subtotal + totalTax + Math.max(toNumber(otherCharges), 0) - Math.max(toNumber(discount), 0));
  const totalAmount = Math.max(roundOff ? Math.round(beforeRound) : beforeRound, 0);

  return {
    lines,
    isInterState,
    placeOfSupply: supplyState,
    subtotal: round2(subtotal),
    totalDiscount: round2(totalDiscount),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    totalTax,
    roundOff: round2(totalAmount - beforeRound),
    totalAmount: round2(totalAmount)
  };
};

// Groups line items by HSN and GST rate for the tax summary printed on invoices.
export const taxSummary = (items = []) => {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.hsnCode || '-'}|${toNumber(item.taxRate)}`;
    const row = groups.get(key) || { hsnCode: item.hsnCode || '-', rate: toNumber(item.taxRate), taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    row.taxable = round2(row.taxable + toNumber(item.taxableValue ?? item.amount));
    row.cgst = round2(row.cgst + toNumber(item.cgst));
    row.sgst = round2(row.sgst + toNumber(item.sgst));
    row.igst = round2(row.igst + toNumber(item.igst));
    groups.set(key, row);
  }
  return [...groups.values()];
};
