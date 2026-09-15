import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { BanknotesIcon, LinkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { documentLabel } from '../lib/constants';
import { formatCurrency, formatDate } from '../lib/format';
import { PRINT_PAGE_STYLE, safeFileName } from '../lib/print';
import { APP_NAME } from '../config';
import DocumentPreview, { PreviewFrame } from '../components/documents/DocumentPreview';
import { Avatar, Button, PageLoader, StatusBadge } from '../components/ui';

export default function PublicInvoice() {
  const { token } = useParams();
  const printRef = useRef(null);
  const { data, loading, error } = useApi(() => api.get(`/public/invoices/${token}`).then((res) => res.data), [token]);
  const invoice = data?.invoice;
  const company = data?.company || {};

  useDocumentTitle(invoice ? `${invoice.invoiceNumber} - ${company.name}` : 'Invoice');
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: safeFileName(invoice?.invoiceNumber), pageStyle: PRINT_PAGE_STYLE });

  if (loading) return <PageLoader className="min-h-screen" label="Loading document..." />;

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
          <LinkIcon className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Link not available</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{error?.message || 'This link is invalid or has expired. Please ask the sender for a new link.'}</p>
      </div>
    );
  }

  const typeLabel = documentLabel(invoice);
  const upiId = company.bankDetails?.upiId;
  const payable = invoice.balanceDue > 0 ? invoice.balanceDue : 0;
  const canPay = invoice.invoiceType === 'INVOICE' && upiId && payable > 0 && data.settings?.showUpiQr !== false && invoice.status !== 'CANCELLED';
  const upiUrl = canPay ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(company.name || '')}&am=${payable.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoice.invoiceNumber)}` : '';

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={company.name} src={company.logo} className="size-10 shrink-0 text-sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{company.name}</p>
              <p className="truncate text-xs text-slate-500">
                {typeLabel} {invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {canPay && (
              <Button variant="success" icon={BanknotesIcon} href={upiUrl} className="md:hidden">
                Pay
              </Button>
            )}
            <Button icon={PrinterIcon} onClick={handlePrint}>
              <span className="hidden sm:inline">Download / Print</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6">
        {invoice.invoiceType === 'INVOICE' && (
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Invoice Total</p>
              <p className="font-semibold text-slate-900">{formatCurrency(invoice.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Paid</p>
              <p className="font-semibold text-emerald-700">{formatCurrency(invoice.amountPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Balance Due</p>
              <p className="font-semibold text-slate-900">{formatCurrency(invoice.balanceDue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : 'Status'}</p>
              <StatusBadge status={invoice.status} overdue={invoice.isOverdue} />
            </div>
          </div>
        )}
        <PreviewFrame>
          <DocumentPreview printRef={printRef} doc={invoice} company={company} settings={data.settings} />
        </PreviewFrame>
        <p className="mt-6 text-center text-xs text-slate-400">Powered by {APP_NAME}</p>
      </main>
    </div>
  );
}
