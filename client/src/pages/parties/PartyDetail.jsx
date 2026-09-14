import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PrinterIcon,
  ShoppingCartIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/Confirm';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { stateLabel } from '../../lib/constants';
import { formatCurrency, formatDate, formatDateNumeric, whatsappLink } from '../../lib/format';
import { makeRange, rangeLabel, rangeParams } from '../../lib/dates';
import { downloadCsv } from '../../lib/csv';
import { PRINT_PAGE_STYLE } from '../../lib/print';
import { cx } from '../../lib/cx';
import PartyFormModal from '../../components/PartyFormModal';
import { Badge, Button, Card, DateRangeFilter, EmptyState, ErrorState, IconButton, PageHeader, PageLoader, StatCard, StatusBadge, Tabs } from '../../components/ui';

const drCr = (value) => {
  if (!value) return formatCurrency(0);
  return `${formatCurrency(Math.abs(value))} ${value > 0 ? 'Dr' : 'Cr'}`;
};

function LedgerTab({ party }) {
  const { user } = useAuth();
  const printRef = useRef(null);
  const [range, setRange] = useState(() => makeRange('this_fy'));
  const { data, loading, error, reload } = useApi(
    () => api.get(`/clients/${party._id}/ledger`, { params: rangeParams(range) }).then((res) => res.data),
    [party._id, range.from, range.to]
  );
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Ledger - ${party.name}`, pageStyle: PRINT_PAGE_STYLE });

  const exportCsv = () =>
    downloadCsv(
      `ledger-${party.name}`,
      [
        { label: 'Date', value: (row) => formatDateNumeric(row.date) },
        { label: 'Particulars', key: 'label' },
        { label: 'Ref No.', key: 'number' },
        { label: 'Debit', key: 'debit' },
        { label: 'Credit', key: 'credit' },
        { label: 'Balance', value: (row) => drCr(row.balance) }
      ],
      [{ date: range.from, label: 'Opening Balance', number: '', debit: '', credit: '', balance: data.openingBalance }, ...data.entries]
    );

  return (
    <Card
      padded={false}
      title="Account Statement"
      subtitle={rangeLabel(range)}
      actions={
        <>
          <DateRangeFilter value={range} onChange={setRange} />
          <Button variant="secondary" size="sm" icon={ArrowDownTrayIcon} onClick={exportCsv} disabled={!data}>
            CSV
          </Button>
          <Button variant="secondary" size="sm" icon={PrinterIcon} onClick={handlePrint} disabled={!data}>
            Print
          </Button>
        </>
      }
    >
      {error && !data ? (
        <ErrorState error={error} onRetry={reload} className="m-4 border-0 shadow-none" />
      ) : !data ? (
        <PageLoader />
      ) : (
        <div ref={printRef} className={cx('overflow-x-auto', loading && 'opacity-60')}>
          <div className="hidden px-4 pt-4 pb-2 print:block">
            <p className="text-lg font-bold">{user?.company?.name}</p>
            <p className="text-sm">
              Ledger of {party.name} · {rangeLabel(range)}
            </p>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th>Ref No.</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-50/60">
                <td>{range.from ? formatDate(range.from) : '—'}</td>
                <td className="font-medium">Opening Balance</td>
                <td />
                <td />
                <td />
                <td className="text-right font-medium tabular-nums">{drCr(data.openingBalance)}</td>
              </tr>
              {data.entries.map((entry, index) => (
                <tr key={`${entry.docId}-${entry.kind}-${index}`}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.label}</td>
                  <td>
                    <Link to={`/${['SALE', 'PAYMENT_IN'].includes(entry.kind) ? 'sales' : 'purchases'}/${entry.docId}`} className="text-brand-700 hover:underline">
                      {entry.number}
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">{entry.debit ? formatCurrency(entry.debit) : ''}</td>
                  <td className="text-right tabular-nums">{entry.credit ? formatCurrency(entry.credit) : ''}</td>
                  <td className="text-right tabular-nums">{drCr(entry.balance)}</td>
                </tr>
              ))}
              {data.entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No transactions in this period
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Closing Balance</td>
                <td className="text-right tabular-nums">{formatCurrency(data.totals.debit)}</td>
                <td className="text-right tabular-nums">{formatCurrency(data.totals.credit)}</td>
                <td className="text-right tabular-nums">{drCr(data.closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="px-4 py-2 text-xs text-slate-500">Dr = party owes you · Cr = you owe the party</p>
        </div>
      )}
    </Card>
  );
}

function DocumentsTab({ partyId, kind }) {
  const isSales = kind === 'sales';
  const { data, loading, error, reload } = useApi(
    () =>
      api
        .get(isSales ? '/invoices' : '/purchases', { params: { ...(isSales ? { type: 'INVOICE', clientId: partyId } : { supplierId: partyId }), limit: 100 } })
        .then((res) => (isSales ? res.data.invoices : res.data.purchases)),
    [partyId, kind]
  );

  if (loading && !data) return <PageLoader />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data.length) {
    return (
      <div className="card">
        <EmptyState icon={isSales ? DocumentTextIcon : ShoppingCartIcon} title={isSales ? 'No invoices for this party' : 'No purchase bills for this party'} />
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Number</th>
            <th>Date</th>
            <th>Due Date</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((doc) => (
            <tr key={doc._id}>
              <td>
                <Link to={`/${isSales ? 'sales' : 'purchases'}/${doc._id}`} className="font-medium text-brand-700 hover:underline">
                  {isSales ? doc.invoiceNumber : doc.billNumber || doc.purchaseNumber}
                </Link>
              </td>
              <td>{formatDate(isSales ? doc.invoiceDate : doc.billDate)}</td>
              <td>{doc.dueDate ? formatDate(doc.dueDate) : '—'}</td>
              <td className="text-right tabular-nums">{formatCurrency(doc.totalAmount)}</td>
              <td className="text-right tabular-nums">{formatCurrency(doc.balanceDue)}</td>
              <td>
                <StatusBadge status={doc.status} overdue={doc.isOverdue} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PartyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [tab, setTab] = useState('ledger');
  const [editing, setEditing] = useState(false);
  const { data: party, loading, error, reload } = useApi(() => api.get(`/clients/${id}`).then((res) => res.data), [id]);
  useDocumentTitle(party?.name || 'Party');

  if (loading && !party) return <PageLoader />;
  if (error && !party) return <ErrorState error={error} onRetry={reload} />;

  const company = user?.company || {};
  const isCustomer = party.type !== 'SUPPLIER';
  const isSupplier = party.type !== 'CUSTOMER';

  const reminder = [
    `Dear ${party.name},`,
    '',
    `This is a friendly reminder that ${formatCurrency(party.receivable)} is pending on your account with ${company.name || 'us'}.`,
    company.bankDetails?.upiId ? `You can pay via UPI: ${company.bankDetails.upiId}` : null,
    '',
    'Thank you.'
  ]
    .filter((line) => line !== null)
    .join('\n');

  const remove = async () => {
    const ok = await confirm({ title: `Delete ${party.name}?`, message: 'Existing documents keep the party details. This cannot be undone.', confirmText: 'Delete Party' });
    if (!ok) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Party deleted');
      navigate('/parties');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const tabs = [
    { value: 'ledger', label: 'Ledger' },
    isCustomer && { value: 'invoices', label: 'Invoices', count: party.invoiceCount },
    isSupplier && { value: 'purchases', label: 'Purchases', count: party.purchaseCount }
  ].filter(Boolean);

  const address = [party.address, party.city, stateLabel(party.stateCode), party.pincode].filter(Boolean).join(', ');

  return (
    <>
      <PageHeader
        backTo="/parties"
        title={party.name}
        badge={<Badge tone={party.type === 'SUPPLIER' ? 'violet' : party.type === 'BOTH' ? 'blue' : 'brand'}>{party.type === 'BOTH' ? 'Customer & Supplier' : party.type === 'SUPPLIER' ? 'Supplier' : 'Customer'}</Badge>}
        subtitle={[party.mobile, party.gst && `GSTIN ${party.gst}`].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            {isCustomer && (
              <Button icon={DocumentTextIcon} to={`/sales/new?party=${id}`}>
                New Invoice
              </Button>
            )}
            {isSupplier && (
              <Button variant={isCustomer ? 'secondary' : 'primary'} icon={ShoppingCartIcon} to={`/purchases/new?party=${id}`}>
                New Purchase
              </Button>
            )}
            {party.receivable > 0 && (
              <Button variant="whatsapp" icon={ChatBubbleLeftRightIcon} href={whatsappLink(party.mobile, reminder)} target="_blank" rel="noreferrer">
                Reminder
              </Button>
            )}
            <Button variant="secondary" icon={PencilSquareIcon} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <IconButton icon={TrashIcon} label="Delete party" tone="danger" onClick={remove} />
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isCustomer && <StatCard label="Total Sales" value={formatCurrency(party.totalSales)} hint={`${party.invoiceCount} invoices`} icon={DocumentTextIcon} tone="brand" />}
        {isCustomer && <StatCard label="To Receive" value={formatCurrency(party.receivable)} hint={`Received ${formatCurrency(party.totalReceived)}`} icon={BanknotesIcon} tone={party.receivable > 0 ? 'amber' : 'green'} />}
        {isSupplier && <StatCard label="Total Purchases" value={formatCurrency(party.totalPurchases)} hint={`${party.purchaseCount} bills`} icon={ShoppingCartIcon} tone="violet" />}
        {isSupplier && <StatCard label="To Pay" value={formatCurrency(party.payable)} hint={`Paid ${formatCurrency(party.totalPaid)}`} icon={BanknotesIcon} tone={party.payable > 0 ? 'red' : 'green'} />}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          {tab === 'ledger' && <LedgerTab party={party} />}
          {tab === 'invoices' && <DocumentsTab partyId={id} kind="sales" />}
          {tab === 'purchases' && <DocumentsTab partyId={id} kind="purchases" />}
        </div>

        <Card title="Contact Details" className="self-start">
          <dl className="space-y-3 text-sm">
            {[
              ['Contact Person', party.contactPerson],
              ['Mobile', party.mobile],
              ['Email', party.email],
              ['GSTIN', party.gst],
              ['PAN', party.panUid],
              ['Billing Address', address],
              ['Shipping Address', party.shippingAddress],
              ['Credit Period', party.creditDays ? `${party.creditDays} days` : ''],
              ['Opening Balance', party.openingBalance ? `${formatCurrency(party.openingBalance)} (${party.openingBalanceType === 'PAYABLE' ? 'to pay' : 'to receive'})` : ''],
              ['Notes', party.notes]
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="whitespace-pre-line text-slate-800">{value}</dd>
                </div>
              ))}
          </dl>
        </Card>
      </div>

      {editing && <PartyFormModal open party={party} onClose={() => setEditing(false)} onSaved={() => reload()} />}
    </>
  );
}
