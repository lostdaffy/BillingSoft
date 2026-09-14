import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BanknotesIcon, ClockIcon, EyeIcon, PencilSquareIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useApi, useDebouncedValue, useDocumentTitle } from '../../lib/hooks';
import { PURCHASE_STATUS_FILTERS } from '../../lib/constants';
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
  StatusBadge
} from '../../components/ui';

export default function PurchaseList() {
  useDocumentTitle('Purchase Bills');
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState(() => makeRange('all'));
  const [page, setPage] = useState(1);
  const query = useDebouncedValue(search, 350);

  const { data, loading, error, reload } = useApi(
    () =>
      api
        .get('/purchases', { params: { status: status || undefined, q: query || undefined, from: range.from || undefined, to: range.to || undefined, page, limit: 25 } })
        .then((res) => res.data),
    [status, query, range.from, range.to, page]
  );

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const filtered = Boolean(status || query || range.from);

  return (
    <>
      <PageHeader
        title="Purchase Bills"
        subtitle="Record supplier bills to update stock, track input GST and manage payables"
        actions={
          <Button icon={PlusIcon} to="/purchases/new">
            New Purchase
          </Button>
        }
      />

      {data?.summary && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total Purchases" value={formatCurrency(data.summary.totalAmount)} hint={`${data.summary.count} bills`} icon={ShoppingCartIcon} tone="violet" />
          <StatCard label="Paid" value={formatCurrency(data.summary.amountPaid)} icon={BanknotesIcon} tone="green" />
          <StatCard label="To Pay" value={formatCurrency(data.summary.balanceDue)} icon={ClockIcon} tone="amber" />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto">
            <SegmentedControl size="sm" options={PURCHASE_STATUS_FILTERS} value={status} onChange={resetPage(setStatus)} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Search bill no., supplier" className="sm:w-64" />
            <DateRangeFilter value={range} onChange={resetPage(setRange)} />
          </div>
        </div>

        {error && !data ? (
          <ErrorState error={error} onRetry={reload} className="m-4 border-0 shadow-none" />
        ) : !data ? (
          <PageLoader />
        ) : data.purchases.length === 0 ? (
          <EmptyState
            icon={ShoppingCartIcon}
            title={filtered ? 'No matching bills' : 'No purchase bills yet'}
            description={filtered ? 'Try changing the filters or search.' : 'Record bills from your suppliers to keep stock and payables up to date.'}
            action={
              !filtered && (
                <Button icon={PlusIcon} to="/purchases/new">
                  Record Purchase
                </Button>
              )
            }
          />
        ) : (
          <div className={cx('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Due Date</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {data.purchases.map((purchase) => (
                  <tr key={purchase._id} className="row-link" onClick={() => navigate(`/purchases/${purchase._id}`)}>
                    <td>
                      <p className="font-semibold text-slate-900">{purchase.billNumber || '—'}</p>
                      <p className="text-xs text-slate-500">{purchase.purchaseNumber}</p>
                    </td>
                    <td>{formatDate(purchase.billDate)}</td>
                    <td>
                      <p className="max-w-56 truncate font-medium text-slate-800">{purchase.supplier?.name}</p>
                      {purchase.supplier?.gst && <p className="text-xs text-slate-500">{purchase.supplier.gst}</p>}
                    </td>
                    <td className={purchase.isOverdue ? 'text-rose-600' : ''}>
                      {purchase.dueDate ? formatDate(purchase.dueDate) : '—'}
                      {purchase.isOverdue && <p className="text-xs">{Math.abs(daysFromToday(purchase.dueDate))} days overdue</p>}
                    </td>
                    <td className="text-right font-medium tabular-nums">{formatCurrency(purchase.totalAmount)}</td>
                    <td className="text-right tabular-nums">{purchase.balanceDue > 0 && purchase.status !== 'CANCELLED' ? formatCurrency(purchase.balanceDue) : '—'}</td>
                    <td>
                      <StatusBadge status={purchase.status} overdue={purchase.isOverdue} />
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <IconButton icon={EyeIcon} label="View" to={`/purchases/${purchase._id}`} />
                        {purchase.status !== 'CANCELLED' && <IconButton icon={PencilSquareIcon} label="Edit" to={`/purchases/${purchase._id}/edit`} />}
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
    </>
  );
}
