import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { PARTY_TYPES, STATE_OPTIONS, isValidGstin, stateCodeFromGstin, stateName } from '../lib/constants';
import { Button, Modal, SegmentedControl, SelectInput, TextArea, TextInput } from './ui';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toForm = (party, defaults) => ({
  type: party?.type || defaults.type,
  name: party?.name || defaults.name || '',
  contactPerson: party?.contactPerson || '',
  mobile: party?.mobile || '',
  email: party?.email || '',
  gst: party?.gst || '',
  panUid: party?.panUid || '',
  address: party?.address || '',
  city: party?.city || '',
  stateCode: party?.stateCode || '',
  pincode: party?.pincode || '',
  shippingAddress: party?.shippingAddress || '',
  openingBalance: party?.openingBalance ? String(party.openingBalance) : '',
  openingBalanceType: party?.openingBalanceType || (defaults.type === 'SUPPLIER' ? 'PAYABLE' : 'RECEIVABLE'),
  creditDays: party?.creditDays ? String(party.creditDays) : '',
  notes: party?.notes || ''
});

export default function PartyFormModal({ open, onClose, party, defaultType = 'CUSTOMER', defaultName = '', onSaved }) {
  const [form, setForm] = useState(() => toForm(party, { type: defaultType, name: defaultName }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(party?._id);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const bind = (field) => ({ value: form[field], onChange: (event) => update(field, event.target.value) });

  const onGstChange = (event) => {
    const gst = event.target.value.toUpperCase().replace(/\s/g, '');
    setForm((current) => ({
      ...current,
      gst,
      ...(isValidGstin(gst) ? { stateCode: stateCodeFromGstin(gst), panUid: current.panUid || gst.slice(2, 12) } : {})
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Party name is required';
    if (form.gst && !isValidGstin(form.gst)) nextErrors.gst = 'Enter a valid 15-character GSTIN';
    if (form.email && !EMAIL_REGEX.test(form.email.trim())) nextErrors.email = 'Enter a valid email address';
    if (form.mobile && !/^[+\d][\d\s-]{6,15}$/.test(form.mobile.trim())) nextErrors.mobile = 'Enter a valid phone number';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        state: stateName(form.stateCode),
        openingBalance: Number(form.openingBalance) || 0,
        creditDays: Number(form.creditDays) || 0
      };
      const { data } = isEdit ? await api.put(`/clients/${party._id}`, payload) : await api.post('/clients', payload);
      toast.success(isEdit ? 'Party updated' : 'Party added');
      onSaved?.(data);
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit Party' : 'Add New Party'}
      description="Customers you sell to and suppliers you buy from."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="party-form" loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Party'}
          </Button>
        </>
      }
    >
      <form id="party-form" onSubmit={submit} className="space-y-5" noValidate>
        <SegmentedControl options={PARTY_TYPES} value={form.type} onChange={(value) => update('type', value)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Party Name" required autoFocus {...bind('name')} error={errors.name} className="sm:col-span-2" placeholder="e.g. Sharma Enterprises" />
          <TextInput label="Mobile Number" {...bind('mobile')} error={errors.mobile} inputMode="tel" placeholder="98XXXXXXXX" />
          <TextInput label="Email" type="email" {...bind('email')} error={errors.email} placeholder="accounts@company.com" />
          <TextInput label="GSTIN" value={form.gst} onChange={onGstChange} error={errors.gst} hint="State fills in automatically from the GSTIN" maxLength={15} placeholder="09ABCDE1234F1Z5" />
          <TextInput label="PAN" value={form.panUid} onChange={(event) => update('panUid', event.target.value.toUpperCase())} maxLength={10} />
          <TextInput label="Contact Person" {...bind('contactPerson')} />
          <TextInput label="Credit Period (days)" type="number" min="0" {...bind('creditDays')} hint="Sets the due date on new invoices" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextArea label="Billing Address" rows={2} {...bind('address')} className="sm:col-span-3" />
          <TextInput label="City" {...bind('city')} />
          <SelectInput label="State" placeholder="Select state" options={STATE_OPTIONS} {...bind('stateCode')} />
          <TextInput label="Pincode" {...bind('pincode')} inputMode="numeric" maxLength={6} />
          <TextArea label="Shipping Address (if different)" rows={2} {...bind('shippingAddress')} className="sm:col-span-3" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-800">Opening Balance</p>
          <p className="mb-3 text-xs text-slate-500">Any amount pending from before you started using this software.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Amount (₹)" type="number" min="0" step="0.01" {...bind('openingBalance')} />
            <SelectInput
              label="Type"
              options={[
                { value: 'RECEIVABLE', label: 'To Receive (party owes you)' },
                { value: 'PAYABLE', label: 'To Pay (you owe the party)' }
              ]}
              {...bind('openingBalanceType')}
            />
          </div>
        </div>

        <TextArea label="Notes" rows={2} {...bind('notes')} />
      </form>
    </Modal>
  );
}
