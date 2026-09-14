import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import {
  ArrowUturnLeftIcon,
  BanknotesIcon,
  DocumentDuplicateIcon,
  EllipsisHorizontalIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PrinterIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/Confirm';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { paymentModeLabel, stateLabel } from '../../lib/constants';
import { formatCurrency, formatDate } from '../../lib/format';
import { PRINT_PAGE_STYLE, safeFileName } from '../../lib/print';
import DocumentPreview, { PreviewFrame } from '../../components/documents/DocumentPreview';
import PaymentModal from '../../components/documents/PaymentModal';
import { Button, Card, Dropdown, ErrorState, IconButton, PageHeader, PageLoader, StatusBadge } from '../../components/ui';

function DetailRow({ label, value, strong, className }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'} ${className || ''}`}>{value}</dd>
    </div>
  );
}

export default function PurchaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const printRef = useRef(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: doc, loading, error, reload } = useApi(() => api.get(`/purchases/${id}`).then((res) => res.data), [id]);
  const title = doc ? `Purchase ${doc.billNumber || doc.purchaseNumber}` : 'Purchase';
  useDocumentTitle(title);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: safeFileName(doc?.purchaseNumber), pageStyle: PRINT_PAGE_STYLE });

  if (loading && !doc) return <PageLoader />;
  if (error && !doc) return <ErrorState error={error} onRetry={reload} />;

  const cancelled = doc.status === 'CANCELLED';
  const canPay = !cancelled && doc.balanceDue > 0;

  const run = async (request, successMessage) => {
    setBusy(true);
    try {
      const response = await request();
      toast.success(successMessage);
      return response;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    if (status === 'CANCELLED') {
      const ok = await confirm({ title: 'Cancel this purchase?', message: 'Stock added by this bill will be reduced again.', confirmText: 'Cancel Bill' });
      if (!ok) return;
    }
    if (await run(() => api.patch(`/purchases/${id}/status`, { status }), status === 'CANCELLED' ? 'Purchase cancelled' : 'Purchase restored')) reload();
  };

  const remove = async () => {
    const ok = await confirm({ title: 'Delete this purchase bill?', message: 'The bill and its payments will be deleted and stock will be reduced.', confirmText: 'Delete' });
    if (!ok) return;
    if (await run(() => api.delete(`/purchases/${id}`), 'Purchase deleted')) navigate('/purchases');
  };

  const deletePayment = async (payment) => {
    const ok = await confirm({ title: 'Delete this payment?', message: `${formatCurrency(payment.amount)} paid on ${formatDate(payment.date)} will be removed.`, confirmText: 'Delete Payment' });
    if (!ok) return;
    if (await run(() => api.delete(`/purchases/${id}/payments/${payment._id}`), 'Payment deleted')) reload();
  };

  return (
    <>
      <PageHeader
        backTo="/purchases"
        title={title}
        badge={<StatusBadge status={doc.status} overdue={doc.isOverdue} />}
        subtitle={`${doc.supplier?.name || ''} · ${formatDate(doc.billDate)}`}
        actions={
          <>
            {canPay && (
              <Button variant="success" icon={BanknotesIcon} onClick={() => setPaymentOpen(true)}>
                Record Payment
              </Button>
            )}
            {!cancelled && (
              <Button variant="secondary" icon={PencilSquareIcon} to={`/purchases/${id}/edit`}>
                Edit
              </Button>
            )}
            <Button variant="secondary" icon={PrinterIcon} onClick={handlePrint}>
              Print
            </Button>
            <Dropdown
              trigger={({ toggle }) => <Button variant="secondary" icon={EllipsisHorizontalIcon} onClick={toggle} aria-label="More actions" />}
              items={[
                { label: 'Duplicate', icon: DocumentDuplicateIcon, to: `/purchases/new?duplicate=${id}` },
                !cancelled && { label: 'Cancel Bill', icon: NoSymbolIcon, danger: true, onClick: () => setStatus('CANCELLED') },
                cancelled && { label: 'Restore Bill', icon: ArrowUturnLeftIcon, onClick: () => setStatus('UNPAID') },
                { divider: true },
                { label: 'Delete', icon: TrashIcon, danger: true, onClick: remove }
              ]}
            />
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-100/70 p-3 sm:p-6">
          <PreviewFrame>
            <DocumentPreview printRef={printRef} doc={doc} kind="PURCHASE" company={user?.company} settings={user?.settings} />
          </PreviewFrame>
        </div>

        <div className="space-y-5">
          <Card title="Payment Summary">
            <dl className="space-y-2">
              <DetailRow label="Bill Total" value={formatCurrency(doc.totalAmount)} />
              <DetailRow label="Paid" value={formatCurrency(doc.amountPaid)} className="text-emerald-700" />
              <div className="border-t border-slate-100 pt-2">
                <DetailRow label="Balance to Pay" value={formatCurrency(doc.balanceDue)} strong />
              </div>
            </dl>
            {canPay && (
              <Button variant="success" icon={BanknotesIcon} className="mt-4 w-full" onClick={() => setPaymentOpen(true)}>
                Record Payment
              </Button>
            )}
          </Card>

          <Card title="Payment History" padded={false}>
            {doc.payments?.length ? (
              <ul className="divide-y divide-slate-100">
                {doc.payments.map((payment) => (
                  <li key={payment._id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDate(payment.date)} · {paymentModeLabel(payment.mode)}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                      </p>
                    </div>
                    <IconButton icon={TrashIcon} tone="danger" label="Delete payment" onClick={() => deletePayment(payment)} disabled={busy} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-slate-500">No payments recorded yet.</p>
            )}
          </Card>

          <Card title="Details">
            <dl className="space-y-2">
              <DetailRow
                label="Supplier"
                value={
                  doc.supplierId ? (
                    <Link to={`/parties/${doc.supplierId}`} className="font-medium text-brand-700 hover:underline">
                      {doc.supplier?.name}
                    </Link>
                  ) : (
                    doc.supplier?.name
                  )
                }
              />
              <DetailRow label="Supplier Bill No." value={doc.billNumber || '—'} />
              <DetailRow label="Internal Ref." value={doc.purchaseNumber} />
              <DetailRow label="Supplier State" value={stateLabel(doc.supplier?.stateCode) || '—'} />
              <DetailRow label="Input GST" value={formatCurrency(doc.totalTax)} />
              <DetailRow label="Due Date" value={doc.dueDate ? formatDate(doc.dueDate) : '—'} />
            </dl>
          </Card>
        </div>
      </div>

      {paymentOpen && (
        <PaymentModal
          open
          onClose={() => setPaymentOpen(false)}
          endpoint={`/purchases/${id}/payments`}
          balanceDue={doc.balanceDue}
          partyName={doc.supplier?.name}
          direction="OUT"
          onSaved={() => reload()}
        />
      )}
    </>
  );
}
