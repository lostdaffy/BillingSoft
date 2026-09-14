import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, PencilSquareIcon, PlusIcon, ReceiptPercentIcon, TrashIcon, WalletIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import { useConfirm } from '../components/Confirm';
import { useApi, useDebouncedValue, useDocumentTitle } from '../lib/hooks';
import { PAYMENT_MODES, paymentModeLabel } from '../lib/constants';
import { formatCurrency, formatDate, formatDateNumeric, toInputDate, toNumber, todayInput } from '../lib/format';
import { makeRange, rangeLabel } from '../lib/dates';
import { downloadCsv } from '../lib/csv';
import { cx } from '../lib/cx';
import {
  Button,
  Card,
  DateRangeFilter,
  EmptyState,
  ErrorState,
  IconButton,
  Modal,
  PageHeader,
  PageLoader,
  Pagination,
  SearchInput,
  SelectInput,
  StatCard,
  TextArea,
  TextInput
} from '../components/ui';

function ExpenseModal({ expense, categories, onClose, onSaved }) {
  const isEdit = Boolean(expense?._id);
  const [form, setForm] = useState(() => ({
    category: expense?.category || '',
    amount: expense ? String(expense.amount) : '',
    gstAmount: expense?.gstAmount ? String(expense.gstAmount) : '',
    date: expense ? toInputDate(expense.date) : todayInput(),
    paymentMode: expense?.paymentMode || 'CASH',
    payee: expense?.payee || '',
    reference: expense?.reference || '',
    note: expense?.note || ''
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const bind = (field) => ({ value: form[field], onChange: (event) => setForm((current) => ({ ...current, [field]: event.target.value })) });

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.category.trim()) next.category = 'Choose or type a category';
    if (!(toNumber(form.amount) > 0)) next.amount = 'Enter an amount greater than 0';
    if (toNumber(form.gstAmount) > toNumber(form.amount)) next.gstAmount = 'GST cannot be more than the total amount';
    if (!form.date) next.date = 'Date is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload = { ...form, category: form.category.trim(), amount: toNumber(form.amount), gstAmount: toNumber(form.gstAmount) };
      if (isEdit) await api.put(`/expenses/${expense._id}`, payload);
      else await api.post('/expenses', payload);
      toast.success(isEdit ? 'Expense updated' : 'Expense added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Expense' : 'Add Expense'}
      description="Rent, salaries, bills and other business costs"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <TextInput label="Category" required autoFocus list="expense-categories" placeholder="e.g. Rent" {...bind('category')} error={errors.category} />
          <datalist id="expense-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.slice(0, 8).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setForm((current) => ({ ...current, category }))}
                className={cx(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  form.category === category ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Total Amount (₹)" required type="number" min="0" step="0.01" {...bind('amount')} error={errors.amount} />
          <TextInput label="GST Included (₹)" type="number" min="0" step="0.01" {...bind('gstAmount')} error={errors.gstAmount} hint="Counted as input tax credit" />
          <TextInput label="Date" type="date" required {...bind('date')} error={errors.date} />
          <SelectInput label="Paid Via" options={PAYMENT_MODES} {...bind('paymentMode')} />
          <TextInput label="Paid To" placeholder="Vendor / person" {...bind('payee')} />
          <TextInput label="Reference / Bill No." {...bind('reference')} />
        </div>
        <TextArea label="Note" rows={2} {...bind('note')} />
      </form>
    </Modal>
  );
}

export default function Expenses() {
  useDocumentTitle('Expenses');
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState(() => makeRange('this_month'));
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(() => (params.get('new') ? { expense: null } : null));
  const query = useDebouncedValue(search, 300);

  const filters = { from: range.from || undefined, to: range.to || undefined, category: category || undefined, q: query || undefined };
  const { data, loading, error, reload } = useApi(() => api.get('/expenses', { params: { ...filters, page, limit: 50 } }).then((res) => res.data), [
    range.from,
    range.to,
    category,
    query,
    page
  ]);
  const categories = useApi(() => api.get('/expenses/categories').then((res) => res.data), []);

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const closeModal = () => {
    setModal(null);
    if (params.get('new')) setParams({}, { replace: true });
  };

  const refresh = () => {
    reload();
    categories.reload();
  };

  const remove = async (expense) => {
    const ok = await confirm({ title: 'Delete this expense?', message: `${expense.category} · ${formatCurrency(expense.amount)} on ${formatDate(expense.date)}`, confirmText: 'Delete' });
    if (!ok) return;
    try {
      await api.delete(`/expenses/${expense._id}`);
      toast.success('Expense deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = async () => {
    try {
      const { data: all } = await api.get('/expenses', { params: { ...filters, limit: 500 } });
      downloadCsv(
        `expenses-${range.from || 'all'}-${range.to || ''}`,
        [
          { label: 'Date', value: (row) => formatDateNumeric(row.date) },
          { label: 'Category', key: 'category' },
          { label: 'Paid To', key: 'payee' },
          { label: 'Mode', value: (row) => paymentModeLabel(row.paymentMode) },
          { label: 'Reference', key: 'reference' },
          { label: 'Note', key: 'note' },
          { label: 'GST', key: 'gstAmount' },
          { label: 'Amount', key: 'amount' }
        ],
        all.expenses
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  const summary = data?.summary;
  const maxCategory = Math.max(1, ...(summary?.byCategory || []).map((row) => row.total));

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Track business spending by category"
        actions={
          <>
            {data?.expenses.length > 0 && (
              <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={exportCsv}>
                Export
              </Button>
            )}
            <Button icon={PlusIcon} onClick={() => setModal({ expense: null })}>
              Add Expense
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <DateRangeFilter value={range} onChange={resetPage(setRange)} />
        <SelectInput
          placeholder="All categories"
          options={(categories.data || []).map((value) => ({ value, label: value }))}
          value={category}
          onChange={(event) => resetPage(setCategory)(event.target.value)}
          inputClassName="sm:w-48"
        />
        <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Search payee, note, reference" className="sm:ml-auto sm:w-64" />
      </div>

      {summary && (
        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:col-span-1 lg:grid-cols-1">
            <StatCard label={`Total Expenses · ${rangeLabel(range)}`} value={formatCurrency(summary.total)} hint={`${data.pagination.total} entries`} icon={WalletIcon} tone="amber" />
            <StatCard label="GST Paid (Input Credit)" value={formatCurrency(summary.gst)} icon={ReceiptPercentIcon} tone="green" />
          </div>
          <Card title="By Category" className="lg:col-span-2">
            {summary.byCategory.length ? (
              <ul className="space-y-3">
                {summary.byCategory.slice(0, 8).map((row) => (
                  <li key={row.category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{row.category}</span>
                      <span className="text-slate-900 tabular-nums">{formatCurrency(row.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(row.total / maxCategory) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No expenses in this period.</p>
            )}
          </Card>
        </div>
      )}

      <div className="card overflow-hidden">
        {error && !data ? (
          <ErrorState error={error} onRetry={reload} className="m-4 border-0 shadow-none" />
        ) : !data ? (
          <PageLoader />
        ) : data.expenses.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No expenses found"
            description="Record rent, salaries, utility bills and other costs to see your true profit."
            action={
              <Button icon={PlusIcon} onClick={() => setModal({ expense: null })}>
                Add Expense
              </Button>
            }
          />
        ) : (
          <div className={cx('overflow-x-auto', loading && 'opacity-60')}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Paid To</th>
                  <th>Mode</th>
                  <th>Reference / Note</th>
                  <th className="text-right">Amount</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{formatDate(expense.date)}</td>
                    <td className="font-medium text-slate-900">{expense.category}</td>
                    <td>{expense.payee || '—'}</td>
                    <td>{paymentModeLabel(expense.paymentMode)}</td>
                    <td className="max-w-64 truncate text-slate-500">{[expense.reference, expense.note].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="text-right tabular-nums">
                      <p className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</p>
                      {expense.gstAmount > 0 && <p className="text-xs text-slate-500">GST {formatCurrency(expense.gstAmount)}</p>}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton icon={PencilSquareIcon} label="Edit" onClick={() => setModal({ expense })} />
                        <IconButton icon={TrashIcon} label="Delete" tone="danger" onClick={() => remove(expense)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onChange={setPage} />}
      </div>

      {modal && <ExpenseModal key={modal.expense?._id || 'new'} expense={modal.expense} categories={categories.data || []} onClose={closeModal} onSaved={refresh} />}
    </>
  );
}
