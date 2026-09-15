export const STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' }
];

export const STATE_OPTIONS = STATES.map((s) => ({ value: s.code, label: `${s.code} - ${s.name}` }));

export const stateName = (code) => STATES.find((s) => s.code === String(code || '').padStart(2, '0'))?.name || '';

export const stateLabel = (code) => {
  const name = stateName(code);
  return name ? `${name} (${String(code).padStart(2, '0')})` : code || '';
};

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const isValidGstin = (value) => GSTIN_REGEX.test(String(value || '').trim().toUpperCase());
export const stateCodeFromGstin = (value) => (/^\d{2}/.test(String(value || '')) ? String(value).slice(0, 2) : '');

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];
export const GST_RATE_OPTIONS = GST_RATES.map((rate) => ({ value: String(rate), label: `${rate}%` }));

export const UNITS = ['Nos', 'Pcs', 'Box', 'Kg', 'Gm', 'Ltr', 'Ml', 'Mtr', 'Cm', 'Ft', 'Sq.Ft', 'Sq.Mtr', 'Dozen', 'Pair', 'Set', 'Bag', 'Bundle', 'Roll', 'Packet', 'Carton', 'Ton', 'Quintal', 'Hour', 'Day', 'Month', 'Job'];

export const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' }
];

export const paymentModeLabel = (mode) => PAYMENT_MODES.find((m) => m.value === mode)?.label || mode;

export const SALES_TYPES = {
  INVOICE: { label: 'Invoice', plural: 'Invoices', printTitle: 'TAX INVOICE', prefixKey: 'invoicePrefix' },
  QUOTATION: { label: 'Quotation', plural: 'Quotations', printTitle: 'QUOTATION', prefixKey: 'quotationPrefix' },
  ESTIMATE: { label: 'Estimate', plural: 'Estimates', printTitle: 'ESTIMATE', prefixKey: 'estimatePrefix' },
  PROFORMA: { label: 'Proforma Invoice', plural: 'Proforma Invoices', printTitle: 'PROFORMA INVOICE', prefixKey: 'proformaPrefix' }
};

export const QUOTE_TYPES = ['QUOTATION', 'ESTIMATE', 'PROFORMA'];

// What the user picks at the top of the sales form. A "Bill" is a normal invoice in the
// INCLUSIVE tax mode: final prices only, total printed as inclusive of all taxes.
export const DOCUMENT_CHOICES = [
  { key: 'TAX_INVOICE', docType: 'INVOICE', taxMode: 'GST', label: 'Tax Invoice', description: 'With GST breakup' },
  { key: 'BILL', docType: 'INVOICE', taxMode: 'INCLUSIVE', label: 'Bill (Without Tax)', description: 'Total incl. of all taxes' },
  { key: 'QUOTATION', docType: 'QUOTATION', label: 'Quotation', description: 'Price offer' },
  { key: 'ESTIMATE', docType: 'ESTIMATE', label: 'Estimate', description: 'Approximate cost' },
  { key: 'PROFORMA', docType: 'PROFORMA', label: 'Proforma Invoice', description: 'Before final invoice' }
];

export const documentLabel = (doc) =>
  doc?.invoiceType === 'INVOICE' && doc?.taxMode === 'INCLUSIVE' ? 'Bill' : SALES_TYPES[doc?.invoiceType]?.label || 'Invoice';

export const STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'gray' },
  UNPAID: { label: 'Unpaid', tone: 'amber' },
  PARTIAL: { label: 'Partly Paid', tone: 'blue' },
  PAID: { label: 'Paid', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
  SENT: { label: 'Sent', tone: 'blue' },
  ACCEPTED: { label: 'Accepted', tone: 'green' },
  DECLINED: { label: 'Declined', tone: 'red' },
  CONVERTED: { label: 'Converted', tone: 'violet' },
  OVERDUE: { label: 'Overdue', tone: 'red' }
};

export const INVOICE_STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partly Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID', label: 'Paid' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export const QUOTE_STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'CONVERTED', label: 'Converted' }
];

export const PURCHASE_STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partly Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export const PARTY_TYPES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'BOTH', label: 'Customer & Supplier' }
];
