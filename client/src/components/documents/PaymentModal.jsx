import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { PAYMENT_MODES } from '../../lib/constants';
import { formatCurrency, todayInput } from '../../lib/format';
import { Button, Modal, SelectInput, TextArea, TextInput } from '../ui';

export default function PaymentModal({ open, onClose, endpoint, balanceDue = 0, partyName, direction = 'IN', onSaved }) {
  const [form, setForm] = useState({
    amount: balanceDue > 0 ? String(balanceDue) : '',
    date: todayInput(),
    mode: 'CASH',
    reference: '',
    note: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const bind = (field) => ({ value: form[field], onChange: (event) => setForm((current) => ({ ...current, [field]: event.target.value })) });

  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) return setError('Enter an amount greater than 0');
    if (amount > balanceDue + 0.01) return setError(`Cannot be more than the balance due (${formatCurrency(balanceDue)})`);
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post(endpoint, { ...form, amount });
      toast.success(direction === 'IN' ? 'Payment received recorded' : 'Payment made recorded');
      onSaved?.(data);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={direction === 'IN' ? 'Record Payment Received' : 'Record Payment Made'}
      description={`${partyName || ''} · Balance due ${formatCurrency(balanceDue)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" variant="success" loading={saving}>
            Save Payment
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <TextInput label="Amount (₹)" type="number" step="0.01" min="0" autoFocus required {...bind('amount')} error={error} />
        <TextInput label="Payment Date" type="date" required {...bind('date')} />
        <SelectInput label="Payment Mode" options={PAYMENT_MODES} {...bind('mode')} />
        <TextInput label="Reference No." placeholder="UTR / cheque number" {...bind('reference')} />
        <TextArea label="Note" rows={2} className="sm:col-span-2" {...bind('note')} />
      </form>
    </Modal>
  );
}
