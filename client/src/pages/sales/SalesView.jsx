import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import {
  ArrowUturnLeftIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  DocumentDuplicateIcon,
  EllipsisHorizontalIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  InformationCircleIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  PrinterIcon,
  ShareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/Confirm';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { SALES_TYPES, paymentModeLabel, stateLabel } from '../../lib/constants';
import { daysFromToday, formatCurrency, formatDate, whatsappLink } from '../../lib/format';
import { PRINT_PAGE_STYLE, safeFileName } from '../../lib/print';
import DocumentPreview, { PreviewFrame } from '../../components/documents/DocumentPreview';
import PaymentModal from '../../components/documents/PaymentModal';
import ShareModal from '../../components/documents/ShareModal';
import { Button, Card, Dropdown, ErrorState, IconButton, PageHeader, PageLoader, StatusBadge } from '../../components/ui';

function DetailRow({ label, value, strong, className }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'} ${className || ''}`}>{value}</dd>
    </div>
  );
}

function Banner({ tone = 'blue', children }) {
  const tones = {
    blue: 'border-sky-200 bg-sky-50 text-sky-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-rose-200 bg-rose-50 text-rose-900'
  };
  return (
    <div className={`mb-4 flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm ${tones[tone]}`}>
      <InformationCircleIcon className="size-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export default function SalesView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const printRef = useRef(null);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: doc, loading, error, reload } = useApi(() => api.get(`/invoices/${id}`).then((res) => res.data), [id]);
  useDocumentTitle(doc?.invoiceNumber || 'Document');
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: safeFileName(doc?.invoiceNumber), pageStyle: PRINT_PAGE_STYLE });

  if (loading && !doc) return <PageLoader />;
  if (error && !doc) return <ErrorState error={error} onRetry={reload} />;

  const company = user?.company || {};
  const meta = SALES_TYPES[doc.invoiceType] || SALES_TYPES.INVOICE;
  const isInvoice = doc.invoiceType === 'INVOICE';
  const listPath = isInvoice ? '/sales' : '/quotations';
  const editable = !['CONVERTED', 'CANCELLED'].includes(doc.status);
  const canRecordPayment = isInvoice && !['CANCELLED', 'PAID'].includes(doc.status) && doc.balanceDue > 0;
  const canConvert = !isInvoice && !doc.convertedTo && !['CONVERTED', 'DECLINED'].includes(doc.status);

  const run = async (request, successMessage) => {
    setBusy(true);
    try {
      const response = await request();
      if (successMessage) toast.success(successMessage);
      return response;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status, successMessage, confirmation) => {
    if (confirmation && !(await confirm(confirmation))) return;
    if (await run(() => api.patch(`/invoices/${id}/status`, { status }), successMessage)) reload();
  };

  const convert = async () => {
    const ok = await confirm({
      title: 'Convert to invoice?',
      message: `A new tax invoice will be created from ${doc.invoiceNumber} with today's date. Stock will be updated.`,
      confirmText: 'Convert',
      tone: 'primary'
    });
    if (!ok) return;
    const response = await run(() => api.post(`/invoices/${id}/convert`), 'Invoice created');
    if (response) navigate(`/sales/${response.data._id}`);
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${doc.invoiceNumber}?`,
      message: 'This permanently deletes the document and its payment records. Any stock it used will be restored.',
      confirmText: 'Delete'
    });
    if (!ok) return;
    if (await run(() => api.delete(`/invoices/${id}`), 'Document deleted')) navigate(listPath);
  };

  const deletePayment = async (payment) => {
    const ok = await confirm({
      title: 'Delete this payment?',
      message: `${formatCurrency(payment.amount)} received on ${formatDate(payment.date)} will be removed.`,
      confirmText: 'Delete Payment'
    });
    if (!ok) return;
    if (await run(() => api.delete(`/invoices/${id}/payments/${payment._id}`), 'Payment deleted')) reload();
  };

  const reminderText = [
    `Dear ${doc.client?.name},`,
    '',
    `This is a gentle reminder that ${formatCurrency(doc.balanceDue)} is pending against invoice ${doc.invoiceNumber} dated ${formatDate(doc.invoiceDate)}${doc.dueDate ? `, due on ${formatDate(doc.dueDate)}` : ''}.`,
    company.bankDetails?.upiId ? `You can pay via UPI: ${company.bankDetails.upiId}` : null,
    '',
    'Thank you,',
    company.name
  ]
    .filter((line) => line !== null)
    .join('\n');

  const dueDays = doc.dueDate ? daysFromToday(doc.dueDate) : null;
  let dueText = '';
  if (dueDays !== null && doc.balanceDue > 0 && !['DRAFT', 'CANCELLED'].includes(doc.status)) {
    if (dueDays < 0) dueText = `Overdue by ${Math.abs(dueDays)} day(s)`;
    else if (dueDays === 0) dueText = 'Due today';
    else dueText = `Due in ${dueDays} day(s) on ${formatDate(doc.dueDate)}`;
  }

  const moreActions = [
    { label: 'Duplicate', icon: DocumentDuplicateIcon, to: `/sales/new?duplicate=${id}` },
    canConvert && { label: 'Convert to Invoice', icon: DocumentCheckIcon, onClick: convert },
    !isInvoice && doc.status === 'DRAFT' && { label: 'Mark as Sent', icon: PaperAirplaneIcon, onClick: () => changeStatus('SENT', 'Marked as sent') },
    !isInvoice && ['DRAFT', 'SENT', 'DECLINED'].includes(doc.status) && { label: 'Mark as Accepted', icon: HandThumbUpIcon, onClick: () => changeStatus('ACCEPTED', 'Marked as accepted') },
    !isInvoice && ['DRAFT', 'SENT', 'ACCEPTED'].includes(doc.status) && { label: 'Mark as Declined', icon: HandThumbDownIcon, onClick: () => changeStatus('DECLINED', 'Marked as declined') },
    isInvoice && doc.status === 'DRAFT' && { label: 'Finalise Invoice', icon: CheckCircleIcon, onClick: () => changeStatus('UNPAID', 'Invoice finalised') },
    isInvoice && doc.status === 'UNPAID' && !doc.payments?.length && { label: 'Move Back to Draft', icon: ArrowUturnLeftIcon, onClick: () => changeStatus('DRAFT', 'Moved to draft') },
    isInvoice &&
      ['UNPAID', 'PARTIAL', 'PAID'].includes(doc.status) && {
        label: 'Cancel Invoice',
        icon: NoSymbolIcon,
        danger: true,
        onClick: () =>
          changeStatus('CANCELLED', 'Invoice cancelled', {
            title: 'Cancel this invoice?',
            message: 'It stays in your records marked as cancelled and any stock it used is restored.',
            confirmText: 'Cancel Invoice'
          })
      },
    isInvoice && doc.status === 'CANCELLED' && { label: 'Restore Invoice', icon: ArrowUturnLeftIcon, onClick: () => changeStatus('UNPAID', 'Invoice restored') },
    { divider: true },
    { label: 'Delete', icon: TrashIcon, danger: true, onClick: remove }
  ];

  return (
    <>
      <PageHeader
        backTo={listPath}
        title={`${meta.label} ${doc.invoiceNumber}`}
        badge={<StatusBadge status={doc.status} overdue={doc.isOverdue} />}
        subtitle={`${doc.client?.name || ''} · ${formatDate(doc.invoiceDate)}`}
        actions={
          <>
            {canRecordPayment && (
              <Button variant="success" icon={BanknotesIcon} onClick={() => setModal('payment')}>
                Record Payment
              </Button>
            )}
            {canConvert && (
              <Button variant="soft" icon={DocumentCheckIcon} onClick={convert} loading={busy}>
                Convert to Invoice
              </Button>
            )}
            {editable && (
              <Button variant="secondary" icon={PencilSquareIcon} to={`/sales/${id}/edit`}>
                Edit
              </Button>
            )}
            <Button variant="secondary" icon={PrinterIcon} onClick={handlePrint}>
              Print / PDF
            </Button>
            {doc.status !== 'DRAFT' && (
              <Button variant="secondary" icon={ShareIcon} onClick={() => setModal('share')}>
                Share
              </Button>
            )}
            <Dropdown trigger={({ toggle }) => <Button variant="secondary" icon={EllipsisHorizontalIcon} onClick={toggle} aria-label="More actions" />} items={moreActions} />
          </>
        }
      />

      {doc.convertedTo?.invoiceNumber && (
        <Banner>
          Converted to invoice{' '}
          <Link to={`/sales/${doc.convertedTo._id}`} className="font-semibold underline">
            {doc.convertedTo.invoiceNumber}
          </Link>
        </Banner>
      )}
      {doc.convertedFrom?.invoiceNumber && (
        <Banner>
          Created from {SALES_TYPES[doc.convertedFrom.invoiceType]?.label?.toLowerCase() || 'quotation'}{' '}
          <Link to={`/sales/${doc.convertedFrom._id}`} className="font-semibold underline">
            {doc.convertedFrom.invoiceNumber}
          </Link>
        </Banner>
      )}
      {isInvoice && doc.status === 'DRAFT' && <Banner tone="amber">This invoice is a draft. Finalise it to update stock and include it in reports.</Banner>}
      {doc.status === 'CANCELLED' && <Banner tone="red">This invoice is cancelled and excluded from reports.</Banner>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 sm:p-6">
          <PreviewFrame>
            <DocumentPreview printRef={printRef} doc={doc} company={company} settings={user?.settings} />
          </PreviewFrame>
        </div>

        <div className="space-y-5">
          {isInvoice && (
            <Card title="Payment Summary">
              <dl className="space-y-2">
                <DetailRow label="Invoice Total" value={formatCurrency(doc.totalAmount)} />
                <DetailRow label="Received" value={formatCurrency(doc.amountPaid)} className="text-emerald-700" />
                <div className="border-t border-slate-100 pt-2">
                  <DetailRow label="Balance Due" value={formatCurrency(doc.balanceDue)} strong />
                </div>
              </dl>
              {dueText && <p className={`mt-2 text-xs ${doc.isOverdue ? 'font-medium text-rose-600' : 'text-slate-500'}`}>{dueText}</p>}
              {canRecordPayment && doc.status !== 'DRAFT' && (
                <div className="mt-4 grid gap-2">
                  <Button variant="success" icon={BanknotesIcon} onClick={() => setModal('payment')}>
                    Record Payment
                  </Button>
                  <Button variant="whatsapp" icon={ChatBubbleLeftRightIcon} href={whatsappLink(doc.client?.mobile, reminderText)} target="_blank" rel="noreferrer">
                    Send Reminder
                  </Button>
                </div>
              )}
            </Card>
          )}

          {isInvoice && (
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
                        {payment.note && <p className="truncate text-xs text-slate-500">{payment.note}</p>}
                      </div>
                      <IconButton icon={TrashIcon} tone="danger" label="Delete payment" onClick={() => deletePayment(payment)} disabled={busy} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-center text-sm text-slate-500">No payments recorded yet.</p>
              )}
            </Card>
          )}

          <Card title="Details">
            <dl className="space-y-2">
              <DetailRow
                label="Customer"
                value={
                  doc.clientId ? (
                    <Link to={`/parties/${doc.clientId}`} className="font-medium text-brand-700 hover:underline">
                      {doc.client?.name}
                    </Link>
                  ) : (
                    doc.client?.name
                  )
                }
              />
              {doc.client?.mobile && <DetailRow label="Mobile" value={doc.client.mobile} />}
              <DetailRow label="Place of Supply" value={stateLabel(doc.placeOfSupply) || '—'} />
              <DetailRow label="GST Type" value={doc.isInterState ? 'IGST' : 'CGST + SGST'} />
              <DetailRow label="Created" value={formatDate(doc.createdAt)} />
              <DetailRow label="Last Updated" value={formatDate(doc.updatedAt)} />
            </dl>
          </Card>
        </div>
      </div>

      {modal === 'payment' && (
        <PaymentModal open onClose={() => setModal(null)} endpoint={`/invoices/${id}/payments`} balanceDue={doc.balanceDue} partyName={doc.client?.name} direction="IN" onSaved={() => reload()} />
      )}
      {modal === 'share' && <ShareModal open onClose={() => setModal(null)} invoice={doc} company={company} onTokenChange={() => reload()} />}
    </>
  );
}
