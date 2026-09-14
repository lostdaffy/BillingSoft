const SALES_DOC_TYPES = ['INVOICE', 'QUOTATION', 'ESTIMATE', 'PROFORMA'];

const DOC_PREFIX_KEYS = {
  INVOICE: 'invoicePrefix',
  QUOTATION: 'quotationPrefix',
  ESTIMATE: 'estimatePrefix',
  PROFORMA: 'proformaPrefix',
  PURCHASE: 'purchasePrefix'
};

const DEFAULT_PREFIXES = {
  INVOICE: 'INV',
  QUOTATION: 'QT',
  ESTIMATE: 'EST',
  PROFORMA: 'PI',
  PURCHASE: 'PUR'
};

// Invoice lifecycle: DRAFT -> UNPAID -> PARTIAL -> PAID (or CANCELLED).
// Quotation lifecycle: DRAFT -> SENT -> ACCEPTED / DECLINED -> CONVERTED.
// SENT and OVERDUE on an INVOICE are legacy values from v1 and are normalised on save.
const SALES_STATUSES = ['DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED', 'SENT', 'ACCEPTED', 'DECLINED', 'CONVERTED', 'OVERDUE'];
const OPEN_INVOICE_STATUSES = ['UNPAID', 'PARTIAL', 'SENT', 'OVERDUE'];
const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'CONVERTED'];

const PURCHASE_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'];

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK', 'CHEQUE', 'CARD', 'OTHER'];

const PARTY_TYPES = ['CUSTOMER', 'SUPPLIER', 'BOTH'];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Electricity',
  'Transport & Freight',
  'Office Supplies',
  'Internet & Phone',
  'Marketing',
  'Repairs & Maintenance',
  'Travel',
  'Bank Charges',
  'Professional Fees',
  'Miscellaneous'
];

module.exports = {
  SALES_DOC_TYPES,
  DOC_PREFIX_KEYS,
  DEFAULT_PREFIXES,
  SALES_STATUSES,
  OPEN_INVOICE_STATUSES,
  QUOTE_STATUSES,
  PURCHASE_STATUSES,
  PAYMENT_MODES,
  PARTY_TYPES,
  DEFAULT_EXPENSE_CATEGORIES
};
