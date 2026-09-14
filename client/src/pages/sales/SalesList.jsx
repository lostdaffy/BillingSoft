import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BanknotesIcon, ClockIcon, DocumentDuplicateIcon, DocumentTextIcon, EyeIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useApi, useDebouncedValue, useDocumentTitle } from '../../lib/hooks';
import { INVOICE_STATUS_FILTERS, QUOTE_STATUS_FILTERS, QUOTE_TYPES, SALES_TYPES } from '../../lib/constants';
import { daysFromToday, formatCurrency, formatDate } from '../../lib/format';
import { makeRange } from '../../lib/dates';
import { cx } from '../../lib/cx';
import {
  Button,
  DateRangeFilter,
  EmptyState,
  ErrorState,
  IconButton,
  PageHeader,
  PageLoader,
  Pagination,
  SearchInput,
  SegmentedControl,
  StatCard,
  StatusBadge,
  Tabs
} from '../../components/ui';

export default function SalesList({ kind }) {
  const isInvoices = kind === 'invoices';
  const navigate = useNavigate();
  const [type, setType] = useState(isInvoices ? 'INVOICE' : 'QUOTATION');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState(() => makeRange('all'));
  const [page, setPage] = useState(1);
  const query = useDebouncedValue(search, 350);
  const meta = SALES_TYPES[type];

  useDocumentTitle(isInvoices ? 'Invoices' : 'Quotations & Estimates');

  const { data, loading, error, reload } = useApi(
    () =>
      api
        .get('/invoices', {
          params: { type, status: status || undefined, q: query || undefined, from: range.from || undefined, to: range.to || undefined, page, limit: 25 }
        })
        .then((res) => res.data),
    [type, status, query, range.from, range.to, page]
  );

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={isInvoices ? 'Sales Invoices' : 'Quotations & Estimates'}
        subtitle={isInvoices ? 'Create GST invoices, record payments and follow up on dues' : 'Send quotations, estimates and proforma invoices, then convert them to invoices'}
        actions={
          <Button icon={PlusIcon} to={isInvoices ? '/sales/new' : `/sales/new?type=${type}`}>
            New {meta.label}
          </Button>
        }
      />

      {isInvoices && data?.summary && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total Billed" value={formatCurrency(data.summary.totalAmount)} hint={`${data.summary.count} invoices (excl. drafts)`} icon={DocumentTextIcon} tone="brand" />
          <StatCard label="Received" value={formatCurrency(data.summary.amountPaid)} icon={BanknotesIcon} tone="green" />
          <StatCard label="Outstanding" value={formatCurrency(data.summary.balanceDue)} icon={ClockIcon} tone="amber" />
        </div>
      )}

      {!isInvoices && (
        <Tabs
          className="mb-4"
          tabs={QUOTE_TYPES.map((value) => ({ value, label: SALES_TYPES[value].plural }))}
          value={type}
          onChange={(value) => {
            setType(value);
            setStatus('');
            setPage(1);
          }}
        />
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto">
            <SegmentedControl size="sm" options={isInvoices ? INVOICE_STATUS_FILTERS : QUOTE_STATUS_FILTERS} value={status} onChange={resetPage(setStatus)} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Search number, party, GSTIN" className="sm:w-64" />
            <DateRangeFilter value={range} onChange={resetPage(setRange)} />
          </div>
        </div>

        {error && !data ? (
          <ErrorState error={error} onRetry={reload} className="m-4 border-0 shadow-none" />
        ) : !data ? (
          <PageLoader />
        ) : data.invoices.length === 0 ? (
          <EmptyState
            icon={isInvoices ? DocumentTextIcon : DocumentDuplicateIcon}
            title={status || query || range.from ? 'No matching documents' : `No ${meta.plural.toLowerCase()} yet`}
            description={status || query || range.from ? 'Try changing the filters or search.' : `Create your first ${meta.label.toLowerCase()} to see it here.`}
            action={
              !(status || query || range.from) && (
                <Button icon={PlusIcon} to={isInvoices ? '/sales/new' : `/sales/new?type=${type}`}>
                  Create {meta.label}
                </Button>
              )
            }
          />
        ) : (
          <>
          <ul className={cx('divide-y divide-slate-100 md:hidden', loading && 'opacity-60')}>
            {data.invoices.map((invoice) => (
              <li key={invoice._id}>
                <button type="button" onClick={() => navigate(`/sales/${invoice._id}`)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left active:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{invoice.client?.name}</p>
                    <p className="text-xs text-slate-500">
                      {invoice.invoiceNumber} · {formatDate(invoice.invoiceDate)}
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge status={invoice.status} overdue={invoice.isOverdue} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-slate-900 tabular-nums">{formatCurrency(invoice.totalAmount)}</p>
                    {isInvoices && invoice.balanceDue > 0 && !['DRAFT', 'CANCELLED'].includes(invoice.status) && (
                      <p className="text-xs text-amber-700">Due {formatCurrency(invoice.balanceDue)}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className={cx('hidden overflow-x-auto transition-opacity md:block', loading && 'opacity-60')}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th>{isInvoices ? 'Due Date' : 'Valid Till'}</th>
                  <th className="text-right">Amount</th>
                  {isInvoices && <th className="text-right">Balance</th>}
                  <th>Status</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => {
                  const open = !['DRAFT', 'CANCELLED'].includes(invoice.status);
                  return (
                    <tr key={invoice._id} className="row-link" onClick={() => navigate(`/sales/${invoice._id}`)}>
                      <td className="font-semibold text-slate-900">{invoice.invoiceNumber}</td>
                      <td>{formatDate(invoice.invoiceDate)}</td>
                      <td>
                        <p className="max-w-56 truncate font-medium text-slate-800">{invoice.client?.name}</p>
                        {invoice.client?.gst && <p className="text-xs text-slate-500">{invoice.client.gst}</p>}
                      </td>
                      <td className={invoice.isOverdue ? 'text-rose-600' : ''}>
                        {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                        {invoice.isOverdue && <p className="text-xs">{Math.abs(daysFromToday(invoice.dueDate))} days overdue</p>}
                      </td>
                      <td className="text-right font-medium tabular-nums">{formatCurrency(invoice.totalAmount)}</td>
                      {isInvoices && <td className="text-right tabular-nums">{open && invoice.balanceDue > 0 ? formatCurrency(invoice.balanceDue) : '—'}</td>}
                      <td>
                        <StatusBadge status={invoice.status} overdue={invoice.isOverdue} />
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <IconButton icon={EyeIcon} label="View" to={`/sales/${invoice._id}`} />
                          {!['CONVERTED', 'CANCELLED'].includes(invoice.status) && <IconButton icon={PencilSquareIcon} label="Edit" to={`/sales/${invoice._id}/edit`} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onChange={setPage} />}
      </div>
    </>
  );
}
