import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CubeIcon, ExclamationTriangleIcon, PlusIcon, TrashIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/hooks';
import { calculateDocument } from '../../lib/gst';
import { cx } from '../../lib/cx';
import {
  GST_RATE_OPTIONS,
  PAYMENT_MODES,
  SALES_TYPES,
  STATE_OPTIONS,
  UNITS,
  isValidGstin,
  stateCodeFromGstin,
  stateName
} from '../../lib/constants';
import { addDaysInput, amountToWords, formatAmount, formatCurrency, formatNumber, toInputDate, toNumber, todayInput } from '../../lib/format';
import { Badge, Button, Card, Checkbox, Combobox, Field, IconButton, SelectInput, TextArea, TextInput, Toggle } from '../ui';
import PartyFormModal from '../PartyFormModal';
import ItemFormModal from '../ItemFormModal';

let rowSeed = 0;
const newRowKey = () => {
  rowSeed += 1;
  return `row-${rowSeed}`;
};

const ROW_GRID =
  'md:grid-cols-[minmax(0,2.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.85fr)_minmax(0,1.1fr)_minmax(0,0.75fr)_minmax(0,0.9fr)_minmax(0,1.15fr)_2rem]';

const SALES_TYPE_OPTIONS = Object.entries(SALES_TYPES).map(([value, meta]) => ({ value, label: meta.label }));

const blankItem = () => ({ key: newRowKey(), productId: '', description: '', hsnCode: '', unit: 'Nos', quantity: '1', rate: '', discountPercent: '', taxRate: '0' });

const itemFromDoc = (item) => ({
  key: newRowKey(),
  productId: item.productId ? String(item.productId) : '',
  description: item.description || '',
  hsnCode: item.hsnCode || '',
  unit: item.unit || 'Nos',
  quantity: String(item.quantity ?? 1),
  rate: item.rate === undefined || item.rate === null ? '' : String(item.rate),
  discountPercent: toNumber(item.discountPercent) ? String(item.discountPercent) : '',
  taxRate: String(item.taxRate ?? 0)
});

const partyFields = (party = {}) => ({
  name: party.name || '',
  mobile: party.mobile || '',
  email: party.email || '',
  gst: party.gst || '',
  address: party.address || '',
  city: party.city || '',
  stateCode: party.stateCode || '',
  pincode: party.pincode || ''
});

function buildInitialState({ mode, doc, docType, settings, party, isEdit }) {
  const isSale = mode === 'SALE';
  const source = doc || {};
  const type = isSale ? source.invoiceType || docType || 'INVOICE' : 'PURCHASE';
  const date = isEdit ? toInputDate(isSale ? source.invoiceDate : source.billDate) : todayInput();
  const partySource = party || (isSale ? source.client : source.supplier);
  const creditDays = toNumber(party?.creditDays);

  let dueDate = '';
  if (isEdit) dueDate = toInputDate(source.dueDate);
  else if (type === 'INVOICE') dueDate = addDaysInput(date, creditDays || toNumber(settings.defaultDueDays ?? 15));
  else if (isSale) dueDate = addDaysInput(date, 15);
  else if (creditDays) dueDate = addDaysInput(date, creditDays);

  return {
    docType: type,
    number: isEdit ? (isSale ? source.invoiceNumber : source.purchaseNumber) || '' : '',
    billNumber: isEdit ? source.billNumber || '' : '',
    date,
    dueDate,
    partyId: party?._id || (isSale ? source.clientId : source.supplierId) || '',
    party: partyFields(partySource),
    saveParty: false,
    shippingAddress: source.shippingAddress || party?.shippingAddress || '',
    showShipping: Boolean(source.shippingAddress || party?.shippingAddress),
    placeOfSupply: source.placeOfSupply || partySource?.stateCode || '',
    items: source.items?.length ? [...source.items.map(itemFromDoc), blankItem()] : [blankItem()],
    pricesIncludeTax: source.pricesIncludeTax ?? Boolean(settings.pricesIncludeTax),
    discount: toNumber(source.discount) ? String(source.discount) : '',
    otherCharges: toNumber(source.otherCharges) ? String(source.otherCharges) : '',
    otherChargesLabel: source.otherChargesLabel || 'Other Charges',
    poNumber: source.poNumber || '',
    ewayBillNo: source.ewayBillNo || '',
    vehicleNo: source.vehicleNo || '',
    showExtra: Boolean(source.poNumber || source.ewayBillNo || source.vehicleNo),
    notes: source.notes ?? (isSale ? settings.defaultNotes || '' : ''),
    termsAndConditions: source.termsAndConditions ?? (isSale ? settings.defaultTerms || '' : ''),
    payment: { enabled: false, amount: '', mode: 'CASH', reference: '' }
  };
}

function Cell({ label, children, className }) {
  return (
    <div className={className}>
      <span className="label md:sr-only">{label}</span>
      {children}
    </div>
  );
}

function SummaryLine({ label, value, className }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 text-sm', className)}>
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

export default function DocumentForm({ mode, doc, docType, party, isEdit = false }) {
  const isSale = mode === 'SALE';
  const navigate = useNavigate();
  const { user } = useAuth();
  const company = user?.company || {};
  const settings = user?.settings || {};

  const [form, setForm] = useState(() => buildInitialState({ mode, doc, docType, settings, party, isEdit }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState('');
  const [partyModal, setPartyModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);

  const parties = useApi(() => api.get('/clients', { params: { type: isSale ? 'CUSTOMER' : 'SUPPLIER' } }).then((res) => res.data), [isSale]);
  const products = useApi(() => api.get('/products', { params: { active: 'true' } }).then((res) => res.data), []);
  const nextNumber = useApi(
    () =>
      isEdit
        ? Promise.resolve(null)
        : api.get(isSale ? '/invoices/next-number' : '/purchases/next-number', { params: { type: form.docType, date: form.date } }).then((res) => res.data.number),
    [isEdit, isSale, form.docType, form.date]
  );

  const typeMeta = SALES_TYPES[form.docType] || SALES_TYPES.INVOICE;
  const isInvoice = isSale && form.docType === 'INVOICE';
  const isQuote = isSale && !isInvoice;
  const originalNumber = isEdit ? (isSale ? doc.invoiceNumber : doc.purchaseNumber) : '';
  const placeOfSupply = isSale ? form.placeOfSupply : form.party.stateCode;
  const partyLabel = isSale ? 'Customer' : 'Supplier';

  const totals = useMemo(
    () =>
      calculateDocument({
        items: form.items,
        companyStateCode: company.stateCode,
        placeOfSupply,
        pricesIncludeTax: form.pricesIncludeTax,
        discount: form.discount,
        otherCharges: form.otherCharges,
        roundOff: settings.roundOff !== false
      }),
    [form.items, company.stateCode, placeOfSupply, form.pricesIncludeTax, form.discount, form.otherCharges, settings.roundOff]
  );

  const productById = useMemo(() => new Map((products.data || []).map((product) => [product._id, product])), [products.data]);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setPayment = (patch) => setForm((current) => ({ ...current, payment: { ...current.payment, ...patch } }));

  const setPartyField = (field, value) =>
    setForm((current) => {
      const nextParty = { ...current.party, [field]: value };
      const next = { ...current, party: nextParty };
      if (field === 'gst') {
        nextParty.gst = value.toUpperCase().replace(/\s/g, '');
        if (isValidGstin(nextParty.gst)) {
          nextParty.stateCode = stateCodeFromGstin(nextParty.gst);
          next.placeOfSupply = nextParty.stateCode;
        }
      }
      if (field === 'stateCode') next.placeOfSupply = value;
      return next;
    });

  const onDateChange = (value) =>
    setForm((current) => {
      if (!value || !current.date || !current.dueDate) return { ...current, date: value };
      const gap = Math.round((new Date(current.dueDate) - new Date(current.date)) / 86400000);
      return { ...current, date: value, dueDate: addDaysInput(value, Math.max(gap, 0)) };
    });

  const partyOptions = useMemo(() => {
    const query = form.party.name.trim().toLowerCase();
    const list = parties.data || [];
    const matches = query ? list.filter((p) => [p.name, p.mobile, p.gst].some((value) => String(value || '').toLowerCase().includes(query))) : list;
    return matches.slice(0, 8);
  }, [parties.data, form.party.name]);

  const selectParty = (selected) =>
    setForm((current) => ({
      ...current,
      partyId: selected._id,
      party: partyFields(selected),
      saveParty: false,
      placeOfSupply: selected.stateCode || '',
      shippingAddress: selected.shippingAddress || current.shippingAddress,
      showShipping: Boolean(selected.shippingAddress) || current.showShipping,
      dueDate: !isEdit && selected.creditDays && (isInvoice || !isSale) ? addDaysInput(current.date, selected.creditDays) : current.dueDate
    }));

  const updateItem = (key, patch) => setForm((current) => ({ ...current, items: current.items.map((item) => (item.key === key ? { ...item, ...patch } : item)) }));

  const removeItem = (key) =>
    setForm((current) => {
      const remaining = current.items.filter((item) => item.key !== key);
      return { ...current, items: remaining.length ? remaining : [blankItem()] };
    });

  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, blankItem()] }));

  const applyProduct = (key, product) =>
    setForm((current) => {
      const items = current.items.map((item) =>
        item.key === key
          ? {
              ...item,
              productId: product._id,
              description: product.name,
              hsnCode: product.hsnCode || '',
              unit: product.unit || 'Nos',
              rate: String(isSale ? product.defaultRate ?? '' : product.purchaseRate || product.defaultRate || ''),
              taxRate: String(product.taxRate ?? 0)
            }
          : item
      );
      const isLast = items[items.length - 1].key === key;
      return { ...current, items: isLast ? [...items, blankItem()] : items };
    });

  const productOptionsFor = (text) => {
    const query = text.trim().toLowerCase();
    const list = products.data || [];
    const matches = query ? list.filter((p) => [p.name, p.sku, p.hsnCode].some((value) => String(value || '').toLowerCase().includes(query))) : list;
    return matches.slice(0, 8);
  };

  const filledItems = form.items.filter((item) => item.description.trim());

  const validate = () => {
    const next = {};
    if (!form.party.name.trim()) next.partyName = `${partyLabel} name is required`;
    if (form.party.gst && !isValidGstin(form.party.gst)) next.partyGst = 'Enter a valid 15-character GSTIN';
    if (!form.date) next.date = 'Date is required';
    if (form.dueDate && form.date && form.dueDate < form.date) next.dueDate = 'Cannot be before the document date';
    if (!filledItems.length) next.items = 'Add at least one item';
    else if (filledItems.some((item) => !(toNumber(item.quantity) > 0))) next.items = 'Quantity must be more than 0 for every item';
    if (form.payment.enabled && toNumber(form.payment.amount) > totals.totalAmount + 0.01) next.payment = 'Payment cannot be more than the total amount';
    setErrors(next);
    const messages = Object.values(next);
    if (messages.length) toast.error(messages[0]);
    return messages.length === 0;
  };

  const buildPayload = (status) => {
    const items = filledItems.map((item) => ({
      productId: item.productId || undefined,
      description: item.description.trim(),
      hsnCode: item.hsnCode.trim(),
      unit: item.unit.trim() || 'Nos',
      quantity: toNumber(item.quantity),
      rate: toNumber(item.rate),
      discountPercent: toNumber(item.discountPercent),
      taxRate: toNumber(item.taxRate)
    }));
    const partyPayload = { ...form.party, name: form.party.name.trim(), state: stateName(form.party.stateCode) };
    const payment =
      !isEdit && (isInvoice || !isSale) && form.payment.enabled && toNumber(form.payment.amount) > 0 && status !== 'DRAFT'
        ? { initialPayment: { amount: toNumber(form.payment.amount), mode: form.payment.mode, reference: form.payment.reference } }
        : {};
    const common = {
      items,
      pricesIncludeTax: form.pricesIncludeTax,
      discount: toNumber(form.discount),
      otherCharges: toNumber(form.otherCharges),
      otherChargesLabel: form.otherChargesLabel.trim() || 'Other Charges',
      notes: form.notes,
      dueDate: form.dueDate || null,
      ...payment
    };

    if (!isSale) {
      return { ...common, billNumber: form.billNumber.trim(), billDate: form.date, supplierId: form.partyId || null, supplier: partyPayload, saveSupplier: !form.partyId && form.saveParty };
    }

    const manualNumber = form.number.trim();
    return {
      ...common,
      invoiceType: form.docType,
      ...(manualNumber && manualNumber !== originalNumber ? { invoiceNumber: manualNumber } : {}),
      invoiceDate: form.date,
      clientId: form.partyId || null,
      client: partyPayload,
      saveClient: !form.partyId && form.saveParty,
      placeOfSupply: form.placeOfSupply,
      shippingAddress: form.showShipping ? form.shippingAddress : '',
      poNumber: form.poNumber,
      ewayBillNo: form.ewayBillNo,
      vehicleNo: form.vehicleNo,
      termsAndConditions: form.termsAndConditions,
      ...(status ? { status } : {})
    };
  };

  const save = async (status) => {
    if (!validate()) return;
    setSaving(status || 'SAVE');
    try {
      const base = isSale ? '/invoices' : '/purchases';
      const payload = buildPayload(status);
      const { data } = isEdit ? await api.put(`${base}/${doc._id}`, payload) : await api.post(base, payload);
      toast.success(isEdit ? 'Changes saved' : `${isSale ? typeMeta.label : 'Purchase bill'} ${isSale ? data.invoiceNumber : data.billNumber || data.purchaseNumber} saved`);
      navigate(`${isSale ? '/sales' : '/purchases'}/${data._id}`, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving('');
    }
  };

  let actions;
  if (!isSale) {
    actions = (
      <Button loading={Boolean(saving)} onClick={() => save()}>
        {isEdit ? 'Save Changes' : 'Save Bill'}
      </Button>
    );
  } else if (isInvoice && (!isEdit || doc.status === 'DRAFT')) {
    actions = (
      <>
        <Button variant="secondary" loading={saving === 'DRAFT'} disabled={Boolean(saving)} onClick={() => save('DRAFT')}>
          Save Draft
        </Button>
        <Button loading={saving === 'UNPAID'} disabled={Boolean(saving)} onClick={() => save('UNPAID')}>
          {isEdit ? 'Save & Finalise' : 'Save Invoice'}
        </Button>
      </>
    );
  } else if (isQuote && !isEdit) {
    actions = (
      <>
        <Button variant="secondary" loading={saving === 'DRAFT'} disabled={Boolean(saving)} onClick={() => save('DRAFT')}>
          Save Draft
        </Button>
        <Button loading={saving === 'SENT'} disabled={Boolean(saving)} onClick={() => save('SENT')}>
          Save & Mark Sent
        </Button>
      </>
    );
  } else {
    actions = (
      <Button loading={Boolean(saving)} onClick={() => save()}>
        Save Changes
      </Button>
    );
  }

  const rateOptionsFor = (value) => (GST_RATE_OPTIONS.some((option) => option.value === value) ? GST_RATE_OPTIONS : [...GST_RATE_OPTIONS, { value, label: `${value}%` }]);

  return (
    <div className="pb-28">
      {!company.stateCode && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-amber-600" />
          <p>
            Your business state / GSTIN is not set, so all sales are treated as intra-state (CGST + SGST).{' '}
            <Link to="/settings" className="font-semibold underline">
              Update business profile
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title={isSale ? 'Bill To' : 'Supplier Details'} className="lg:col-span-2" actions={form.partyId ? <Badge tone="green">Saved party</Badge> : null}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`${partyLabel} Name`} required error={errors.partyName} className="sm:col-span-2">
              <div className="relative">
                <Combobox
                  value={form.party.name}
                  onChange={(value) => setForm((current) => ({ ...current, partyId: '', party: { ...current.party, name: value } }))}
                  onSelect={selectParty}
                  options={partyOptions}
                  placeholder={`Search saved ${partyLabel.toLowerCase()}s or type a new name`}
                  error={errors.partyName}
                  inputClassName="pr-9"
                  renderOption={(option) => (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{option.name}</p>
                        <p className="truncate text-xs text-slate-500">{[option.mobile, option.gst, option.city].filter(Boolean).join(' · ') || 'No contact details'}</p>
                      </div>
                      {isSale && option.receivable > 0 && <span className="shrink-0 text-xs font-medium text-amber-700">Due {formatCurrency(option.receivable)}</span>}
                      {!isSale && option.payable > 0 && <span className="shrink-0 text-xs font-medium text-amber-700">To pay {formatCurrency(option.payable)}</span>}
                    </div>
                  )}
                  footer={(close) => (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                      onClick={() => {
                        close();
                        setPartyModal({ name: form.party.name });
                      }}
                    >
                      <UserPlusIcon className="size-4" />
                      Add new {partyLabel.toLowerCase()}
                      {form.party.name.trim() ? ` "${form.party.name.trim()}"` : ''}
                    </button>
                  )}
                />
                {(form.partyId || form.party.name) && (
                  <button
                    type="button"
                    aria-label="Clear"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    onClick={() => setForm((current) => ({ ...current, partyId: '', party: partyFields(), placeOfSupply: '' }))}
                  >
                    <XMarkIcon className="size-4" />
                  </button>
                )}
              </div>
            </Field>
            <TextInput label="Mobile" value={form.party.mobile} onChange={(event) => setPartyField('mobile', event.target.value)} inputMode="tel" />
            <TextInput
              label="GSTIN"
              value={form.party.gst}
              onChange={(event) => setPartyField('gst', event.target.value)}
              maxLength={15}
              error={errors.partyGst}
              placeholder={isSale ? 'Leave blank for B2C / unregistered' : 'Supplier GSTIN'}
            />
            <TextArea label="Address" rows={2} value={form.party.address} onChange={(event) => setPartyField('address', event.target.value)} className="sm:col-span-2" />
            <SelectInput label="State" placeholder="Select state" options={STATE_OPTIONS} value={form.party.stateCode} onChange={(event) => setPartyField('stateCode', event.target.value)} />
            <TextInput label="Email" type="email" value={form.party.email} onChange={(event) => setPartyField('email', event.target.value)} />
            {!form.partyId && form.party.name.trim() && (
              <Checkbox
                className="sm:col-span-2"
                checked={form.saveParty}
                onChange={(value) => set('saveParty', value)}
                label={`Save "${form.party.name.trim()}" as a ${partyLabel.toLowerCase()} for next time`}
              />
            )}
            {isSale && (
              <div className="sm:col-span-2">
                {form.showShipping ? (
                  <TextArea label="Shipping Address" rows={2} value={form.shippingAddress} onChange={(event) => set('shippingAddress', event.target.value)} />
                ) : (
                  <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => set('showShipping', true)}>
                    + Add a different shipping address
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card title={isSale ? `${typeMeta.label} Details` : 'Bill Details'}>
          <div className="space-y-4">
            {isSale && !isEdit && <SelectInput label="Document Type" options={SALES_TYPE_OPTIONS} value={form.docType} onChange={(event) => set('docType', event.target.value)} />}
            {isSale ? (
              <TextInput
                label={`${typeMeta.label} Number`}
                value={form.number}
                onChange={(event) => set('number', event.target.value)}
                placeholder={nextNumber.data || 'Auto-generated'}
                hint={isEdit ? undefined : 'Leave blank to use the next number automatically'}
              />
            ) : (
              <TextInput
                label="Supplier Bill Number"
                value={form.billNumber}
                onChange={(event) => set('billNumber', event.target.value)}
                placeholder="As printed on the supplier's bill"
                hint={isEdit ? `Internal ref: ${doc.purchaseNumber}` : nextNumber.data ? `Internal ref: ${nextNumber.data}` : undefined}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <TextInput label={isSale ? 'Date' : 'Bill Date'} type="date" required value={form.date} onChange={(event) => onDateChange(event.target.value)} error={errors.date} />
              <TextInput label={isQuote ? 'Valid Till' : 'Due Date'} type="date" value={form.dueDate} min={form.date} onChange={(event) => set('dueDate', event.target.value)} error={errors.dueDate} />
            </div>
            {isSale && (
              <SelectInput
                label="Place of Supply"
                placeholder={company.stateCode ? `Same as business (${stateName(company.stateCode)})` : 'Select state'}
                options={STATE_OPTIONS}
                value={form.placeOfSupply}
                onChange={(event) => set('placeOfSupply', event.target.value)}
              />
            )}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              GST type: <span className="font-semibold text-slate-900">{totals.isInterState ? 'IGST (inter-state)' : 'CGST + SGST (intra-state)'}</span>
            </div>
            <Toggle label="Prices include GST" description="Turn on if the rates you enter already include tax" checked={form.pricesIncludeTax} onChange={(value) => set('pricesIncludeTax', value)} />
          </div>
        </Card>
      </div>

      <Card title="Items" className="mt-5" padded={false} actions={<span className="text-xs text-slate-500">{filledItems.length} item(s)</span>}>
        <div className={cx('hidden gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase md:grid', ROW_GRID)}>
          <span>Item</span>
          <span>HSN/SAC</span>
          <span className="text-right">Qty</span>
          <span>Unit</span>
          <span className="text-right">Rate (₹)</span>
          <span className="text-right">Disc %</span>
          <span>GST</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        <div className="divide-y divide-slate-100">
          {form.items.map((item, index) => {
            const line = totals.lines[index];
            const product = item.productId ? productById.get(item.productId) : null;
            const lowStock = isInvoice && product?.trackStock && toNumber(item.quantity) > toNumber(product.stock);
            const lineTax = line ? line.cgst + line.sgst + line.igst : 0;
            return (
              <div key={item.key} className={cx('grid grid-cols-2 gap-2 px-4 py-3 md:items-start', ROW_GRID)}>
                <Cell label={`Item ${index + 1}`} className="col-span-2 md:col-span-1">
                  <Combobox
                    value={item.description}
                    onChange={(value) => updateItem(item.key, { description: value, productId: '' })}
                    onSelect={(selected) => applyProduct(item.key, selected)}
                    options={productOptionsFor(item.description)}
                    placeholder="Search or type item name"
                    renderOption={(option) => (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{option.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            {[option.hsnCode && `HSN ${option.hsnCode}`, `GST ${option.taxRate}%`, option.trackStock ? `Stock ${formatNumber(option.stock)} ${option.unit}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-slate-700">{formatCurrency(isSale ? option.defaultRate : option.purchaseRate || option.defaultRate)}</span>
                      </div>
                    )}
                    footer={(close) => (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                        onClick={() => {
                          close();
                          setItemModal({ name: item.description, rowKey: item.key });
                        }}
                      >
                        <CubeIcon className="size-4" />
                        Create new item{item.description.trim() ? ` "${item.description.trim()}"` : ''}
                      </button>
                    )}
                  />
                  {product && (
                    <p className={cx('mt-1 text-xs', lowStock ? 'font-medium text-amber-700' : 'text-slate-500')}>
                      {product.trackStock ? `${lowStock ? 'Only ' : 'In stock: '}${formatNumber(product.stock)} ${product.unit}${lowStock ? ' in stock' : ''}` : 'Saved item'}
                    </p>
                  )}
                </Cell>
                <Cell label="HSN/SAC">
                  <input className="input" value={item.hsnCode} onChange={(event) => updateItem(item.key, { hsnCode: event.target.value })} />
                </Cell>
                <Cell label="Qty">
                  <input className="input text-right" type="number" min="0" step="any" inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} />
                </Cell>
                <Cell label="Unit">
                  <input className="input" list="document-units" value={item.unit} onChange={(event) => updateItem(item.key, { unit: event.target.value })} />
                </Cell>
                <Cell label="Rate (₹)">
                  <input className="input text-right" type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={item.rate} onChange={(event) => updateItem(item.key, { rate: event.target.value })} />
                </Cell>
                <Cell label="Disc %">
                  <input className="input text-right" type="number" min="0" max="100" step="any" inputMode="decimal" placeholder="0" value={item.discountPercent} onChange={(event) => updateItem(item.key, { discountPercent: event.target.value })} />
                </Cell>
                <Cell label="GST">
                  <select className="input pr-6" value={item.taxRate} onChange={(event) => updateItem(item.key, { taxRate: event.target.value })}>
                    {rateOptionsFor(item.taxRate).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Cell>
                <div className="col-span-2 flex items-center justify-between md:col-span-1 md:block md:pt-2 md:text-right">
                  <span className="label mb-0 md:sr-only">Amount</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatAmount(line?.amount)}</p>
                    {lineTax > 0 && <p className="text-[11px] text-slate-500">incl. GST {formatAmount(lineTax)}</p>}
                  </div>
                </div>
                <div className="col-span-2 flex justify-end md:col-span-1 md:pt-1">
                  <IconButton icon={TrashIcon} label="Remove item" tone="danger" onClick={() => removeItem(item.key)} />
                </div>
              </div>
            );
          })}
        </div>
        <datalist id="document-units">
          {UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <Button variant="soft" size="sm" icon={PlusIcon} onClick={addItem}>
            Add Row
          </Button>
          {errors.items && <p className="text-xs text-rose-600">{errors.items}</p>}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {!isEdit && (isInvoice || !isSale) && (
            <Card title={isSale ? 'Payment Received' : 'Payment Made'}>
              <Toggle
                label={isSale ? 'Customer has paid (fully or partly)' : 'I have paid this bill (fully or partly)'}
                checked={form.payment.enabled}
                onChange={(value) => setPayment({ enabled: value, amount: value && !form.payment.amount ? String(totals.totalAmount) : form.payment.amount })}
              />
              {form.payment.enabled && (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <TextInput label="Amount (₹)" type="number" min="0" step="0.01" value={form.payment.amount} onChange={(event) => setPayment({ amount: event.target.value })} error={errors.payment} />
                    <SelectInput label="Mode" options={PAYMENT_MODES} value={form.payment.mode} onChange={(event) => setPayment({ mode: event.target.value })} />
                    <TextInput label="Reference" placeholder="UTR / cheque no." value={form.payment.reference} onChange={(event) => setPayment({ reference: event.target.value })} />
                  </div>
                  <button type="button" onClick={() => setPayment({ amount: String(totals.totalAmount) })} className="mt-2 text-xs font-medium text-brand-700 hover:underline">
                    Use full amount ({formatCurrency(totals.totalAmount)})
                  </button>
                </>
              )}
            </Card>
          )}

          {isSale && (
            <Card title="Transport & Reference" actions={!form.showExtra && <Button variant="ghost" size="sm" onClick={() => set('showExtra', true)}>Add details</Button>}>
              {form.showExtra ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextInput label="PO Number" value={form.poNumber} onChange={(event) => set('poNumber', event.target.value)} />
                  <TextInput label="E-Way Bill No." value={form.ewayBillNo} onChange={(event) => set('ewayBillNo', event.target.value)} />
                  <TextInput label="Vehicle No." value={form.vehicleNo} onChange={(event) => set('vehicleNo', event.target.value.toUpperCase())} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">Optional: customer PO number, e-way bill and vehicle number.</p>
              )}
            </Card>
          )}

          <Card title={isSale ? 'Notes & Terms' : 'Notes'}>
            <div className="grid gap-4">
              <TextArea label="Notes" rows={2} value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder={isSale ? 'Visible on the document' : 'Internal notes'} />
              {isSale && <TextArea label="Terms & Conditions" rows={4} value={form.termsAndConditions} onChange={(event) => set('termsAndConditions', event.target.value)} />}
            </div>
          </Card>
        </div>

        <Card title="Summary" className="self-start lg:sticky lg:top-20">
          <div className="space-y-2.5">
            <SummaryLine label={totals.totalTax ? 'Taxable Amount' : 'Subtotal'} value={formatAmount(totals.subtotal)} />
            {totals.totalDiscount > 0 && <p className="-mt-1 text-right text-[11px] text-emerald-700">after item discounts of {formatCurrency(totals.totalDiscount)}</p>}
            {totals.isInterState ? (
              <SummaryLine label="IGST" value={formatAmount(totals.igst)} />
            ) : (
              <>
                <SummaryLine label="CGST" value={formatAmount(totals.cgst)} />
                <SummaryLine label="SGST" value={formatAmount(totals.sgst)} />
              </>
            )}
            <div className="flex items-center gap-2">
              <input className="input h-8 min-w-0 flex-1 text-xs" value={form.otherChargesLabel} onChange={(event) => set('otherChargesLabel', event.target.value)} aria-label="Other charges label" />
              <input className="input h-8 w-28 text-right text-xs" type="number" min="0" step="0.01" placeholder="0.00" value={form.otherCharges} onChange={(event) => set('otherCharges', event.target.value)} aria-label="Other charges amount" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-600">Additional Discount</span>
              <input className="input h-8 w-28 text-right text-xs" type="number" min="0" step="0.01" placeholder="0.00" value={form.discount} onChange={(event) => set('discount', event.target.value)} aria-label="Additional discount" />
            </div>
            {totals.roundOff !== 0 && <SummaryLine label="Round Off" value={formatAmount(totals.roundOff)} />}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-base font-semibold text-slate-900">Total</span>
              <span className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(totals.totalAmount)}</span>
            </div>
            <p className="text-xs text-slate-500">{amountToWords(totals.totalAmount)}</p>
            {isEdit && toNumber(doc.amountPaid) > 0 && (
              <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                <SummaryLine label={isSale ? 'Already Received' : 'Already Paid'} value={formatAmount(doc.amountPaid)} />
                <SummaryLine label="Balance" value={formatAmount(Math.max(totals.totalAmount - toNumber(doc.amountPaid), 0))} />
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Total Amount</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(totals.totalAmount)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </span>
            {actions}
          </div>
        </div>
      </div>

      {partyModal && (
        <PartyFormModal
          open
          onClose={() => setPartyModal(null)}
          defaultType={isSale ? 'CUSTOMER' : 'SUPPLIER'}
          defaultName={partyModal.name}
          onSaved={(saved) => {
            parties.setData((list) => [...(list || []), saved]);
            selectParty(saved);
          }}
        />
      )}
      {itemModal && (
        <ItemFormModal
          open
          onClose={() => setItemModal(null)}
          defaultName={itemModal.name}
          defaultTaxRate={company.gstin ? '18' : '0'}
          onSaved={(saved) => {
            products.setData((list) => [...(list || []), saved]);
            applyProduct(itemModal.rowKey, saved);
          }}
        />
      )}
    </div>
  );
}
