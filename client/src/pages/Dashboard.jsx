import { Link } from 'react-router-dom';
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { cx } from '../lib/cx';
import { daysFromToday, formatCompactCurrency, formatCurrency, formatDate, formatNumber, whatsappLink } from '../lib/format';
import BarChart from '../components/BarChart';
import { Button, Card, EmptyState, ErrorState, PageLoader, StatCard, StatusBadge } from '../components/ui';

function SetupChecklist({ steps }) {
  const done = steps.filter((step) => step.done).length;
  return (
    <Card title="Get started" subtitle={`${done} of ${steps.length} steps complete`}>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.label}>
            <Link to={step.to} className={cx('flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-50', step.done ? 'text-slate-400' : 'text-slate-800')}>
              <CheckCircleIcon className={cx('size-5 shrink-0', step.done ? 'text-emerald-500' : 'text-slate-300')} />
              <span className={step.done ? 'line-through' : 'font-medium'}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard').then((res) => res.data), []);

  if (loading && !data) return <PageLoader label="Loading dashboard..." />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const company = user?.company || {};
  const firstName = (user?.name || '').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const steps = [
    { label: 'Add GSTIN, address and state', to: '/settings', done: Boolean(company.stateCode && company.address) },
    { label: 'Add bank / UPI details for payments', to: '/settings?tab=bank', done: Boolean(company.bankDetails?.accountNumber || company.bankDetails?.upiId) },
    { label: 'Add your first item', to: '/items?new=1', done: data.counts.items > 0 },
    { label: 'Add your first customer', to: '/parties?new=1', done: data.counts.parties > 0 },
    { label: 'Create your first invoice', to: '/sales/new', done: data.recentInvoices.length > 0 }
  ];
  const setupPending = steps.some((step) => !step.done);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {company.name || 'Your business'} · Financial Year 20{data.financialYear}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={DocumentTextIcon} to="/sales/new">
            New Invoice
          </Button>
          <Button variant="secondary" icon={ShoppingCartIcon} to="/purchases/new">
            Purchase
          </Button>
          <Button variant="secondary" icon={WalletIcon} to="/expenses?new=1">
            Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Today's Sales" value={formatCurrency(data.today.sales)} hint={`${data.today.invoices} invoice(s)`} icon={ArrowTrendingUpIcon} tone="brand" to="/sales" />
        <StatCard label="This Month" value={formatCurrency(data.month.sales)} hint={`${data.month.invoices} invoices`} icon={DocumentTextIcon} tone="violet" to="/reports?tab=sales" />
        <StatCard label="Received (Month)" value={formatCurrency(data.month.received)} hint={`FY ${formatCompactCurrency(data.year.received)}`} icon={BanknotesIcon} tone="green" to="/payments" />
        <StatCard
          label="To Receive"
          value={formatCurrency(data.receivable.amount)}
          hint={data.overdue.count ? `${formatCurrency(data.overdue.amount)} overdue` : `${data.receivable.count} open invoices`}
          icon={ClockIcon}
          tone={data.overdue.count ? 'red' : 'amber'}
          to="/reports?tab=receivables"
        />
        <StatCard label="To Pay" value={formatCurrency(data.payable.amount)} hint={`${data.payable.count} unpaid bills`} icon={ArrowTrendingDownIcon} tone="blue" to="/reports?tab=payables" />
        <StatCard label="Expenses (Month)" value={formatCurrency(data.month.expenses)} hint={`Purchases ${formatCompactCurrency(data.month.purchases)}`} icon={WalletIcon} tone="gray" to="/expenses" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card
          title="Sales, Collections & Expenses"
          subtitle="Last 12 months"
          className="xl:col-span-2"
          actions={
            <span className="text-xs text-slate-500">
              FY sales <span className="font-semibold text-slate-900">{formatCurrency(data.year.sales)}</span>
            </span>
          }
        >
          <BarChart
            data={data.monthly}
            series={[
              { key: 'sales', label: 'Sales', color: '#6366f1' },
              { key: 'received', label: 'Received', color: '#10b981' },
              { key: 'expenses', label: 'Expenses', color: '#f59e0b' }
            ]}
          />
        </Card>

        {setupPending ? (
          <SetupChecklist steps={steps} />
        ) : (
          <Card title="Top Customers" subtitle="This financial year" padded={false}>
            {data.topCustomers.length ? (
              <ul className="divide-y divide-slate-100">
                {data.topCustomers.map((customer, index) => (
                  <li key={customer.name} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{index + 1}</span>
                      <div className="min-w-0">
                        {customer.clientId ? (
                          <Link to={`/parties/${customer.clientId}`} className="block truncate text-sm font-medium text-slate-900 hover:text-brand-700">
                            {customer.name}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium text-slate-900">{customer.name}</p>
                        )}
                        <p className="text-xs text-slate-500">{customer.count} invoices</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(customer.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No sales yet" description="Your best customers will appear here." />
            )}
          </Card>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card title="Recent Invoices" className="xl:col-span-2" padded={false} actions={<Button variant="ghost" size="sm" to="/sales">View all</Button>}>
          {data.recentInvoices.length ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentInvoices.map((invoice) => (
                    <tr key={invoice._id}>
                      <td>
                        <Link to={`/sales/${invoice._id}`} className="font-medium text-brand-700 hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="max-w-48 truncate">{invoice.client?.name}</td>
                      <td>{formatDate(invoice.invoiceDate)}</td>
                      <td className="text-right font-medium tabular-nums">{formatCurrency(invoice.totalAmount)}</td>
                      <td>
                        <StatusBadge status={invoice.status} overdue={invoice.isOverdue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={DocumentTextIcon} title="No invoices yet" description="Create your first GST invoice in under a minute." action={<Button to="/sales/new">Create Invoice</Button>} />
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Overdue Payments" padded={false} actions={data.overdue.count > 0 && <span className="text-xs font-semibold text-rose-600">{formatCurrency(data.overdue.amount)}</span>}>
            {data.overdueInvoices.length ? (
              <ul className="divide-y divide-slate-100">
                {data.overdueInvoices.map((invoice) => (
                  <li key={invoice._id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <Link to={`/sales/${invoice._id}`} className="block truncate text-sm font-medium text-slate-900 hover:text-brand-700">
                        {invoice.client?.name}
                      </Link>
                      <p className="text-xs text-rose-600">
                        {formatCurrency(invoice.balanceDue)} · {Math.abs(daysFromToday(invoice.dueDate))} days late
                      </p>
                    </div>
                    <a
                      href={whatsappLink(
                        invoice.client?.mobile,
                        `Dear ${invoice.client?.name},\n\nThis is a gentle reminder that ${formatCurrency(invoice.balanceDue)} is pending against invoice ${invoice.invoiceNumber} dated ${formatDate(invoice.invoiceDate)}, which was due on ${formatDate(invoice.dueDate)}.\n\nThank you,\n${company.name || ''}`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                      title="Send WhatsApp reminder"
                    >
                      <ChatBubbleLeftRightIcon className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500">
                <CheckCircleIcon className="size-5 text-emerald-500" /> No overdue invoices. Great job!
              </p>
            )}
          </Card>

          <Card title="Low Stock" padded={false} actions={<Button variant="ghost" size="sm" to="/items">Items</Button>}>
            {data.lowStock.length ? (
              <ul className="divide-y divide-slate-100">
                {data.lowStock.map((item) => (
                  <li key={item._id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-800">
                      <ExclamationTriangleIcon className={cx('size-4 shrink-0', item.stock <= 0 ? 'text-rose-500' : 'text-amber-500')} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className={cx('text-sm font-semibold tabular-nums', item.stock <= 0 ? 'text-rose-600' : 'text-amber-700')}>
                      {formatNumber(item.stock)} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500">
                <CubeIcon className="size-5 text-slate-400" /> All items are well stocked.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
