const { calculateDocument, normaliseStateCode, stateCodeFromGstin } = require('../utils/gst');
const { num, round2, amountToWords } = require('../utils/numbers');
const { toDateOnly, today } = require('../utils/dates');
const { HttpError } = require('../utils/asyncHandler');
const { PAYMENT_MODES } = require('../utils/constants');

const str = (value) => (value === undefined || value === null ? '' : String(value).trim());

const toObjectId = (value) => (/^[a-f\d]{24}$/i.test(str(value)) ? str(value) : undefined);

const escapeRegex = (value) => str(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const paginate = (query = {}) => {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 500);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
};

const partySnapshot = (input = {}) => {
  const gst = str(input.gst || input.gstin).toUpperCase();
  return {
    name: str(input.name),
    address: str(input.address),
    city: str(input.city),
    state: str(input.state),
    stateCode: normaliseStateCode(input.stateCode) || stateCodeFromGstin(gst),
    pincode: str(input.pincode),
    mobile: str(input.mobile),
    email: str(input.email).toLowerCase(),
    gst,
    panUid: str(input.panUid).toUpperCase(),
    aadhaar: str(input.aadhaar)
  };
};

const sanitizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && str(item.description))
    .map((item) => ({
      productId: toObjectId(item.productId),
      description: str(item.description),
      hsnCode: str(item.hsnCode),
      unit: str(item.unit) || 'Nos',
      quantity: num(item.quantity),
      rate: num(item.rate),
      discountPercent: num(item.discountPercent),
      taxRate: num(item.taxRate)
    }));
};

const plainItems = (doc) => (doc.items || []).map((item) => (item.toObject ? item.toObject() : { ...item }));

const applyPaymentTotals = (doc) => {
  const paid = round2((doc.payments || []).reduce((sum, payment) => sum + num(payment.amount), 0));
  doc.amountPaid = paid;
  doc.balanceDue = round2(Math.max(num(doc.totalAmount) - paid, 0));
};

const applyTotals = (doc, items, user) => {
  const result = calculateDocument({
    items,
    companyStateCode: user.company && user.company.stateCode,
    placeOfSupply: doc.placeOfSupply,
    pricesIncludeTax: Boolean(doc.pricesIncludeTax),
    discount: doc.discount,
    otherCharges: doc.otherCharges,
    roundOff: !(user.settings && user.settings.roundOff === false)
  });

  doc.items = result.items;
  doc.isInterState = result.isInterState;
  doc.placeOfSupply = result.placeOfSupply;
  doc.subtotal = result.subtotal;
  doc.totalDiscount = result.totalDiscount;
  doc.cgst = result.cgst;
  doc.sgst = result.sgst;
  doc.igst = result.igst;
  doc.totalTax = result.totalTax;
  doc.discount = result.discount;
  doc.otherCharges = result.otherCharges;
  doc.roundOff = result.roundOff;
  doc.totalAmount = result.totalAmount;
  doc.amountInWords = amountToWords(result.totalAmount);
  applyPaymentTotals(doc);
};

const paymentStatus = (doc) => {
  if (num(doc.amountPaid) <= 0) return 'UNPAID';
  if (num(doc.amountPaid) + 0.005 >= num(doc.totalAmount)) return 'PAID';
  return 'PARTIAL';
};

const parsePayment = (body = {}, balanceDue) => {
  const amount = round2(body.amount);
  if (amount <= 0) throw new HttpError(400, 'Enter a valid payment amount');
  if (amount > round2(balanceDue) + 0.01) {
    throw new HttpError(400, `Payment of ${amount} is more than the balance due (${round2(balanceDue)})`);
  }
  const mode = str(body.mode).toUpperCase();
  return {
    amount,
    date: toDateOnly(body.date) || today(),
    mode: PAYMENT_MODES.includes(mode) ? mode : 'CASH',
    reference: str(body.reference),
    note: str(body.note)
  };
};

// Brings a v1 document (flat tax, PAID status with no payment rows) into the
// v2 shape before it is modified, so recalculation does not change its meaning.
const upgradeLegacyDocument = (doc) => {
  if (num(doc.tax) > 0 && num(doc.totalTax) === 0 && num(doc.otherCharges) === 0) {
    doc.otherCharges = num(doc.tax);
    doc.otherChargesLabel = 'Tax';
    doc.tax = 0;
  }
  if (doc.status === 'PAID' && (!doc.payments || doc.payments.length === 0)) {
    doc.payments = [
      {
        amount: num(doc.totalAmount),
        date: doc.updatedAt || doc.invoiceDate || new Date(),
        mode: 'OTHER',
        note: 'Marked as paid before upgrade'
      }
    ];
    applyPaymentTotals(doc);
  }
};

module.exports = {
  str,
  toObjectId,
  escapeRegex,
  paginate,
  partySnapshot,
  sanitizeItems,
  plainItems,
  applyTotals,
  applyPaymentTotals,
  paymentStatus,
  parsePayment,
  upgradeLegacyDocument
};
