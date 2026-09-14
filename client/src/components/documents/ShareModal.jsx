import { useState } from 'react';
import toast from 'react-hot-toast';
import { ChatBubbleLeftRightIcon, ClipboardDocumentIcon, EnvelopeIcon, LinkIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { SALES_TYPES } from '../../lib/constants';
import { formatCurrency, formatDate, whatsappLink } from '../../lib/format';
import { Button, Modal } from '../ui';

export default function ShareModal({ open, onClose, invoice, company, onTokenChange }) {
  const [token, setToken] = useState(invoice.shareToken || '');
  const [busy, setBusy] = useState(false);
  const typeLabel = SALES_TYPES[invoice.invoiceType]?.label || 'Invoice';
  const url = token ? `${window.location.origin}/share/${token}` : '';

  const message = [
    `Dear ${invoice.client?.name || 'Customer'},`,
    '',
    `Please find ${typeLabel.toLowerCase()} ${invoice.invoiceNumber} dated ${formatDate(invoice.invoiceDate)} for ${formatCurrency(invoice.totalAmount)}.`,
    invoice.invoiceType === 'INVOICE' && invoice.balanceDue > 0
      ? `Balance due: ${formatCurrency(invoice.balanceDue)}${invoice.dueDate ? ` (due ${formatDate(invoice.dueDate)})` : ''}.`
      : null,
    url ? `\nView & download: ${url}` : null,
    '',
    'Thank you,',
    company?.name
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n');

  const createLink = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/invoices/${invoice._id}/share`);
      setToken(data.token);
      onTokenChange?.(data.token);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const disableLink = async () => {
    setBusy(true);
    try {
      await api.delete(`/invoices/${invoice._id}/share`);
      setToken('');
      onTokenChange?.('');
      toast.success('Share link disabled');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy automatically. Please select and copy.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share with Customer" description={`${typeLabel} ${invoice.invoiceNumber}`}>
      {!token ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <LinkIcon className="size-6" />
          </div>
          <p className="mx-auto max-w-sm text-sm text-slate-600">
            Create a secure link your customer can open to view, print or download this {typeLabel.toLowerCase()}. No login needed.
          </p>
          <Button className="mt-5" icon={LinkIcon} loading={busy} onClick={createLink}>
            Create Share Link
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">Share link</label>
            <div className="flex gap-2">
              <input readOnly value={url} className="input font-mono text-xs" onFocus={(event) => event.target.select()} />
              <Button variant="secondary" icon={ClipboardDocumentIcon} onClick={() => copy(url, 'Link')}>
                Copy
              </Button>
            </div>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea readOnly rows={8} className="input text-xs leading-relaxed" value={message} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="whatsapp" icon={ChatBubbleLeftRightIcon} href={whatsappLink(invoice.client?.mobile, message)} target="_blank" rel="noreferrer">
              Send on WhatsApp
            </Button>
            {invoice.client?.email && (
              <Button
                variant="secondary"
                icon={EnvelopeIcon}
                href={`mailto:${invoice.client.email}?subject=${encodeURIComponent(`${typeLabel} ${invoice.invoiceNumber} from ${company?.name || ''}`)}&body=${encodeURIComponent(message)}`}
              >
                Email
              </Button>
            )}
            <Button variant="secondary" icon={ClipboardDocumentIcon} onClick={() => copy(message, 'Message')}>
              Copy Message
            </Button>
          </div>
          <button type="button" disabled={busy} onClick={disableLink} className="text-xs font-medium text-rose-600 hover:underline">
            Disable this link
          </button>
        </div>
      )}
    </Modal>
  );
}
