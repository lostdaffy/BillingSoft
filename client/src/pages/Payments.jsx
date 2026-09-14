import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownTrayIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon, ArrowsRightLeftIcon, ScaleIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import { useApi, useDebouncedValue, useDocumentTitle } from '../lib/hooks';
import { PAYMENT_MODES, paymentModeLabel } from '../lib/constants';
import { formatCurrency, formatDate, formatDateNumeric } from '../lib/format';
import { makeRange, rangeLabel, rangeParams } from '../lib/dates';
import { downloadCsv } from '../lib/csv';
import { cx } from '../lib/cx';
import { Badge, Button, DateRangeFilter, EmptyState, ErrorState, PageHeader, PageLoader, SearchInput, SelectInput, StatCard, Tabs } from '../components/ui';

export default function Payments() {
  useDocumentTitle('Payments');
  const [direction, setDirection] = useState('ALL');
  const [range, setRange] = useState(() => makeRange('this_month'));
  const [mode, setMode] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search, 300);

  const { data, loading, error, reload } = useApi(
    () => api.get('/payments', { params: { direction, mode: mode || undefined, q: query || undefined, ...rangeParams(range) } }).then((res) => res.data),
    [direction, mode, query, range.from, range.to]
  );

  const exportCsv = () =>
    downloadCsv(
      `payments-${range.from || 'all'}`,
      [
        { label: 'Date', value: (row) => formatDateNumeric(row.date) },
        { label: 'Type', value: (row) => (row.direction === 'IN' ? 'Received' : 'Paid') },
        { label: 'Party', key: 'partyName' },
        { label: 'Against', key: 'docNumber' },
        { label: 'Mode', value: (row) => paymentModeLabel(row.mode) },
        { label: 'Reference', key: 'reference' },
        { label: 'Amount', key: 'amount' }
      ],
      data.payments
    );

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Money received from customers and paid to suppliers"
        actions={
          data?.payments.length > 0 && (
            <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={exportCsv}>
              Export
            </Button>
          )
        }
      />

      {data && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatCard label={`Received · ${rangeLabel(range)}`} value={formatCurrency(data.summary.totalIn)} icon={ArrowTrendingUpIcon} tone="green" />
          <StatCard label="Paid to Suppliers" value={formatCurrency(data.summary.totalOut)} icon={ArrowTrendingDownIcon} tone="red" />
          <StatCard label="Net Cash Flow" value={formatCurrency(data.summary.net)} icon={ScaleIcon} tone={data.summary.net >= 0 ? 'brand' : 'amber'} />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-2 pb-3 xl:flex-row xl:items-end xl:justify-between">
          <Tabs
            className="border-b-0"
            tabs={[
              { value: 'ALL', label: 'All' },
              { value: 'IN', label: 'Received' },
              { value: 'OUT', label: 'Paid' }
            ]}
            value={direction}
            onChange={setDirection}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <DateRangeFilter value={range} onChange={setRange} />
            <SelectInput placeholder="All modes" options={PAYMENT_MODES} value={mode} onChange={(event) => setMode(event.target.value)} inputClassName="sm:w-40" />
            <SearchInput value={search} onChange={setSearch} placeholder="Party, number, reference" className="sm:w-56" />
          </div>
        </div>

        {error && !data ? (
          <ErrorState error={error} onRetry={reload} className="m-4 border-0 shadow-none" />
        ) : !data ? (
          <PageLoader />
        ) : data.payments.length === 0 ? (
          <EmptyState icon={ArrowsRightLeftIcon} title="No payments in this period" description="Payments you record on invoices and purchase bills appear here." />
        ) : (
          <div className={cx('overflow-x-auto', loading && 'opacity-60')}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>Against</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{formatDate(payment.date)}</td>
                    <td>{payment.direction === 'IN' ? <Badge tone="green">Received</Badge> : <Badge tone="red">Paid</Badge>}</td>
                    <td>
                      {payment.partyId ? (
                        <Link to={`/parties/${payment.partyId}`} className="font-medium text-slate-900 hover:text-brand-700">
                          {payment.partyName}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-900">{payment.partyName}</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/${payment.direction === 'IN' ? 'sales' : 'purchases'}/${payment.docId}`} className="text-brand-700 hover:underline">
                        {payment.docNumber}
                      </Link>
                    </td>
                    <td>{paymentModeLabel(payment.mode)}</td>
                    <td className="text-slate-500">{payment.reference || '—'}</td>
                    <td className={cx('text-right font-semibold tabular-nums', payment.direction === 'IN' ? 'text-emerald-700' : 'text-rose-600')}>
                      {payment.direction === 'IN' ? '+' : '-'} {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
