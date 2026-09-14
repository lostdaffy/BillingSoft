import { Fragment, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  PrinterIcon,
  ReceiptPercentIcon,
  ScaleIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/hooks';
import { stateLabel } from '../../lib/constants';
import { formatCurrency, formatDate, formatDateNumeric, formatNumber, whatsappLink } from '../../lib/format';
import { rangeLabel, rangeParams } from '../../lib/dates';
import { downloadCsv } from '../../lib/csv';
import { PRINT_PAGE_STYLE } from '../../lib/print';
import { cx } from '../../lib/cx';
import { Badge, Button, EmptyState, ErrorState, PageLoader, StatCard, StatusBadge } from '../../components/ui';

function useReport(path, range, params = {}) {
  const extra = JSON.stringify(params);
  return useApi(() => api.get(path, { params: { ...(range ? rangeParams(range) : {}), ...params } }).then((res) => res.data), [path, range?.from, range?.to, extra]);
}

function ReportShell({ title, subtitle, onExport, actions, children, className }) {
  const { user } = useAuth();
  const ref = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: ref, documentTitle: title, pageStyle: PRINT_PAGE_STYLE });

  return (
    <section className={cx('card overflow-hidden', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          {onExport && (
            <Button size="sm" variant="secondary" icon={ArrowDownTrayIcon} onClick={onExport}>
              CSV
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={PrinterIcon} onClick={handlePrint}>
            Print
          </Button>
        </div>
      </header>
      <div ref={ref}>
        <div className="hidden px-5 pt-5 pb-3 print:block">
          <p className="text-lg font-bold text-slate-900">{user?.company?.name}</p>
          {user?.company?.gstin && <p className="text-xs text-slate-600">GSTIN {user.company.gstin}</p>}
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {title}
            {subtitle ? ` · ${subtitle}` : ''}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

function Loading({ state }) {
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  return <PageLoader />;
}

const Money = ({ value, className }) => <td className={cx('text-right tabular-nums', className)}>{formatCurrency(value)}</td>;

/* ------------------------------------------------------------- Profit & Loss */

export function ProfitLossReport({ range }) {
  const state = useReport('/reports/summary', range);
  const { data } = state;
  if (!data) return <Loading state={state} />;
  const { sales, purchases, expenses, profit, gst } = data;
  const period = rangeLabel(range);

  return (
    <div className={cx('space-y-5', state.loading && 'opacity-60')}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sales (excl. GST)" value={formatCurrency(sales.taxable)} hint={`${sales.count} invoices`} icon={ReceiptPercentIcon} tone="brand" />
        <StatCard label="Gross Profit" value={formatCurrency(profit.grossProfit)} icon={ScaleIcon} tone={profit.grossProfit >= 0 ? 'green' : 'red'} />
        <StatCard label="Net Profit" value={formatCurrency(profit.netProfit)} icon={BanknotesIcon} tone={profit.netProfit >= 0 ? 'green' : 'red'} />
        <StatCard label="Net GST Payable" value={formatCurrency(gst.net)} icon={ShoppingCartIcon} tone={gst.net > 0 ? 'amber' : 'green'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportShell title="Profit & Loss Statement" subtitle={period}>
          <table className="data-table">
            <tbody>
              <tr>
                <td>Sales (taxable value)</td>
                <Money value={profit.salesTaxable} />
              </tr>
              <tr>
                <td>
                  Less: Cost of goods sold
                  <p className="text-xs text-slate-500">Quantity sold x item purchase price</p>
                </td>
                <td className="text-right tabular-nums">- {formatCurrency(profit.costOfGoods)}</td>
              </tr>
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td>Gross Profit</td>
                <Money value={profit.grossProfit} />
              </tr>
              <tr>
                <td>Less: Expenses (excluding GST)</td>
                <td className="text-right tabular-nums">- {formatCurrency(profit.expenses)}</td>
              </tr>
              <tr className="text-base font-bold">
                <td>Net Profit</td>
                <Money value={profit.netProfit} className={profit.netProfit < 0 ? 'text-rose-600' : 'text-emerald-700'} />
              </tr>
            </tbody>
          </table>
          <p className="flex items-start gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <InformationCircleIcon className="size-4 shrink-0" />
            Management estimate. Keep purchase prices updated on items for an accurate cost of goods sold.
          </p>
        </ReportShell>

        <ReportShell title="Cash Flow & GST" subtitle={period}>
          <table className="data-table">
            <tbody>
              <tr>
                <td>Sales invoiced (incl. GST)</td>
                <Money value={sales.total} />
              </tr>
              <tr>
                <td>Payments received</td>
                <Money value={sales.received} className="text-emerald-700" />
              </tr>
              <tr>
                <td>Purchases billed (incl. GST)</td>
                <Money value={purchases.total} />
              </tr>
              <tr>
                <td>Payments made to suppliers</td>
                <Money value={purchases.paidOut} className="text-rose-600" />
              </tr>
              <tr>
                <td>Expenses paid</td>
                <Money value={expenses.total} className="text-rose-600" />
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td>Output GST on sales</td>
                <Money value={gst.output} />
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td>Input GST (purchases + expenses)</td>
                <Money value={gst.input} />
              </tr>
              <tr className="font-bold">
                <td>{gst.net >= 0 ? 'Net GST payable' : 'GST credit available'}</td>
                <Money value={Math.abs(gst.net)} />
              </tr>
            </tbody>
          </table>
        </ReportShell>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Sales / Purchase register */

export function RegisterReport({ kind, range }) {
  const isSales = kind === 'sales';
  const state = useReport(isSales ? '/reports/sales' : '/reports/purchases', range);
  const { data } = state;
  if (!data) return <Loading state={state} />;

  const title = isSales ? 'Sales Register' : 'Purchase Register';
  const party = (row) => (isSales ? row.client : row.supplier) || {};
  const number = (row) => (isSales ? row.invoiceNumber : row.billNumber || row.purchaseNumber);
  const date = (row) => (isSales ? row.invoiceDate : row.billDate);

  const exportCsv = () =>
    downloadCsv(
      `${kind}-register-${range.from || 'all'}`,
      [
        { label: 'Date', value: (row) => formatDateNumeric(date(row)) },
        { label: isSales ? 'Invoice No.' : 'Bill No.', value: number },
        ...(!isSales ? [{ label: 'Internal Ref.', key: 'purchaseNumber' }] : []),
        { label: 'Party', value: (row) => party(row).name },
        { label: 'GSTIN', value: (row) => party(row).gst },
        { label: 'Place of Supply', value: (row) => stateLabel(row.placeOfSupply) },
        { label: 'Taxable Value', key: 'subtotal' },
        { label: 'CGST', key: 'cgst' },
        { label: 'SGST', key: 'sgst' },
        { label: 'IGST', key: 'igst' },
        { label: 'Total', key: 'totalAmount' },
        { label: isSales ? 'Received' : 'Paid', key: 'amountPaid' },
        { label: 'Balance', key: 'balanceDue' },
        { label: 'Status', key: 'status' }
      ],
      data.rows
    );

  return (
    <ReportShell title={title} subtitle={`${rangeLabel(range)} · ${data.totals.count} documents`} onExport={exportCsv} className={state.loading ? 'opacity-60' : ''}>
      {data.rows.length === 0 ? (
        <EmptyState title="No documents in this period" />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>{isSales ? 'Invoice No.' : 'Bill No.'}</th>
                <th>Party</th>
                <th>GSTIN</th>
                <th className="text-right">Taxable</th>
                <th className="text-right">CGST</th>
                <th className="text-right">SGST</th>
                <th className="text-right">IGST</th>
                <th className="text-right">Total</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row._id}>
                  <td>{formatDate(date(row))}</td>
                  <td>
                    <Link to={`/${isSales ? 'sales' : 'purchases'}/${row._id}`} className="font-medium text-brand-700 hover:underline">
                      {number(row)}
                    </Link>
                  </td>
                  <td className="max-w-52 truncate">{party(row).name}</td>
                  <td className="font-mono text-xs">{party(row).gst || '—'}</td>
                  <Money value={row.subtotal} />
                  <Money value={row.cgst} />
                  <Money value={row.sgst} />
                  <Money value={row.igst} />
                  <Money value={row.totalAmount} className="font-medium text-slate-900" />
                  <Money value={row.balanceDue} />
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <Money value={data.totals.taxable} />
                <Money value={data.totals.cgst} />
                <Money value={data.totals.sgst} />
                <Money value={data.totals.igst} />
                <Money value={data.totals.total} />
                <Money value={data.totals.balance} />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* ---------------------------------------------------------------------- GST */

function TaxColumns({ row }) {
  return (
    <>
      <Money value={row.taxable} />
      <Money value={row.cgst} />
      <Money value={row.sgst} />
      <Money value={row.igst} />
    </>
  );
}

const TAX_HEADERS = (
  <>
    <th className="text-right">Taxable</th>
    <th className="text-right">CGST</th>
    <th className="text-right">SGST</th>
    <th className="text-right">IGST</th>
  </>
);

export function GstReport({ range }) {
  const state = useReport('/reports/gst', range);
  const { data } = state;
  if (!data) return <Loading state={state} />;
  const period = rangeLabel(range);
  const { output, input, netPayable } = data;
  const fileSuffix = range.from || 'all';

  const taxColumns = [
    { label: 'Taxable Value', key: 'taxable' },
    { label: 'CGST', key: 'cgst' },
    { label: 'SGST', key: 'sgst' },
    { label: 'IGST', key: 'igst' }
  ];

  return (
    <div className={cx('space-y-5', state.loading && 'opacity-60')}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Output GST (Sales)" value={formatCurrency(output.tax)} hint={`On taxable sales of ${formatCurrency(output.taxable)}`} icon={ReceiptPercentIcon} tone="brand" />
        <StatCard label="Input Tax Credit" value={formatCurrency(input.total)} hint={`Purchases ${formatCurrency(input.tax)} + expenses ${formatCurrency(input.expenses)}`} icon={ShoppingCartIcon} tone="green" />
        <StatCard
          label={netPayable.total >= 0 ? 'Net GST Payable' : 'Excess Credit'}
          value={formatCurrency(Math.abs(netPayable.total))}
          icon={ScaleIcon}
          tone={netPayable.total > 0 ? 'amber' : 'green'}
        />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <InformationCircleIcon className="size-5 shrink-0" />
        <p>This summary helps prepare GSTR-1 and GSTR-3B. Only finalised invoices and bills are included. Please verify with your tax consultant before filing.</p>
      </div>

      <ReportShell title="Tax Liability Summary" subtitle={period}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tax Head</th>
                <th className="text-right">Output (Sales)</th>
                <th className="text-right">Input (Purchases)</th>
                <th className="text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody>
              {['cgst', 'sgst', 'igst'].map((head) => (
                <tr key={head}>
                  <td className="font-medium uppercase">{head}</td>
                  <Money value={output[head]} />
                  <Money value={input[head]} />
                  <Money value={netPayable[head]} className={netPayable[head] < 0 ? 'text-emerald-700' : ''} />
                </tr>
              ))}
              <tr>
                <td className="font-medium">Other ITC (expenses)</td>
                <td />
                <Money value={input.expenses} />
                <td />
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <Money value={output.tax} />
                <Money value={input.total} />
                <Money value={netPayable.total} />
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportShell>

      <ReportShell
        title="B2B Invoices (to registered customers)"
        subtitle={`${data.b2b.length} invoices · ${period}`}
        onExport={() =>
          downloadCsv(`gst-b2b-${fileSuffix}`, [
            { label: 'GSTIN of Recipient', key: 'gstin' },
            { label: 'Receiver Name', key: 'partyName' },
            { label: 'Invoice Number', key: 'invoiceNumber' },
            { label: 'Invoice Date', value: (row) => formatDateNumeric(row.invoiceDate) },
            { label: 'Invoice Value', key: 'total' },
            { label: 'Place of Supply', value: (row) => stateLabel(row.placeOfSupply) },
            ...taxColumns
          ], data.b2b)
        }
      >
        {data.b2b.length === 0 ? (
          <EmptyState title="No B2B invoices" description="Invoices to customers with a GSTIN appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>GSTIN</th>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Place of Supply</th>
                  {TAX_HEADERS}
                  <th className="text-right">Invoice Value</th>
                </tr>
              </thead>
              <tbody>
                {data.b2b.map((row) => (
                  <tr key={row.invoiceNumber}>
                    <td className="font-mono text-xs">{row.gstin}</td>
                    <td className="max-w-48 truncate">{row.partyName}</td>
                    <td>{row.invoiceNumber}</td>
                    <td>{formatDate(row.invoiceDate)}</td>
                    <td>{stateLabel(row.placeOfSupply)}</td>
                    <TaxColumns row={row} />
                    <Money value={row.total} className="font-medium" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportShell>

      <div className="grid gap-5 xl:grid-cols-2">
        <ReportShell
          title="B2C Sales (unregistered customers)"
          subtitle="Grouped by place of supply and rate"
          onExport={() =>
            downloadCsv(`gst-b2c-${fileSuffix}`, [
              { label: 'Place of Supply', value: (row) => stateLabel(row.placeOfSupply) },
              { label: 'Rate', key: 'rate' },
              ...taxColumns
            ], data.b2c)
          }
        >
          {data.b2c.length === 0 ? (
            <EmptyState title="No B2C sales" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Place of Supply</th>
                    <th>Rate</th>
                    {TAX_HEADERS}
                  </tr>
                </thead>
                <tbody>
                  {data.b2c.map((row) => (
                    <tr key={`${row.placeOfSupply}-${row.rate}`}>
                      <td>{stateLabel(row.placeOfSupply) || '—'}</td>
                      <td>{row.rate}%</td>
                      <TaxColumns row={row} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportShell>

        <ReportShell
          title="Rate-wise Summary"
          subtitle="All sales"
          onExport={() => downloadCsv(`gst-rate-wise-${fileSuffix}`, [{ label: 'Rate', key: 'rate' }, ...taxColumns], data.rateWise)}
        >
          {data.rateWise.length === 0 ? (
            <EmptyState title="No sales" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>GST Rate</th>
                    {TAX_HEADERS}
                  </tr>
                </thead>
                <tbody>
                  {data.rateWise.map((row) => (
                    <tr key={row.rate}>
                      <td className="font-medium">{row.rate}%</td>
                      <TaxColumns row={row} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportShell>
      </div>

      <ReportShell
        title="HSN / SAC Summary"
        subtitle={period}
        onExport={() =>
          downloadCsv(`gst-hsn-${fileSuffix}`, [
            { label: 'HSN', key: 'hsnCode' },
            { label: 'Description', key: 'description' },
            { label: 'UQC', key: 'unit' },
            { label: 'Total Quantity', key: 'quantity' },
            { label: 'Rate', key: 'rate' },
            { label: 'Total Value', key: 'total' },
            ...taxColumns
          ], data.hsn)
        }
      >
        {data.hsn.length === 0 ? (
          <EmptyState title="No items sold" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>HSN/SAC</th>
                  <th>Description</th>
                  <th className="text-right">Qty</th>
                  <th>Rate</th>
                  {TAX_HEADERS}
                  <th className="text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.hsn.map((row) => (
                  <tr key={`${row.hsnCode}-${row.rate}-${row.unit}`}>
                    <td className="font-mono text-xs">{row.hsnCode || <span className="text-amber-600">Missing</span>}</td>
                    <td className="max-w-48 truncate">{row.description}</td>
                    <td className="text-right tabular-nums">
                      {formatNumber(row.quantity)} {row.unit}
                    </td>
                    <td>{row.rate}%</td>
                    <TaxColumns row={row} />
                    <Money value={row.total} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportShell>

      <ReportShell
        title="Purchases (Input Tax Credit)"
        subtitle={`${data.purchases.length} bills · ${period}`}
        onExport={() =>
          downloadCsv(`gst-purchases-${fileSuffix}`, [
            { label: 'Supplier GSTIN', key: 'gstin' },
            { label: 'Supplier', key: 'partyName' },
            { label: 'Bill No.', value: (row) => row.billNumber || row.purchaseNumber },
            { label: 'Bill Date', value: (row) => formatDateNumeric(row.billDate) },
            ...taxColumns,
            { label: 'Total', key: 'total' }
          ], data.purchases)
        }
      >
        {data.purchases.length === 0 ? (
          <EmptyState title="No purchase bills" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>GSTIN</th>
                  <th>Bill No.</th>
                  <th>Date</th>
                  {TAX_HEADERS}
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map((row) => (
                  <tr key={row.purchaseNumber}>
                    <td className="max-w-48 truncate">{row.partyName}</td>
                    <td className="font-mono text-xs">{row.gstin || <span className="text-amber-600">Unregistered</span>}</td>
                    <td>{row.billNumber || row.purchaseNumber}</td>
                    <td>{formatDate(row.billDate)}</td>
                    <TaxColumns row={row} />
                    <Money value={row.total} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportShell>
    </div>
  );
}

/* -------------------------------------------------------------- Outstanding */

export function OutstandingReport({ type }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(() => new Set());
  const state = useReport('/reports/outstanding', null, { type });
  const { data } = state;
  if (!data) return <Loading state={state} />;

  const isReceivable = type === 'receivable';
  const company = user?.company || {};
  const toggle = (key) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const reminder = (row) =>
    [
      `Dear ${row.name},`,
      '',
      `This is a friendly reminder that ${formatCurrency(row.balance)} is pending on your account with ${company.name || 'us'}.`,
      company.bankDetails?.upiId ? `UPI: ${company.bankDetails.upiId}` : null,
      '',
      'Thank you.'
    ]
      .filter((line) => line !== null)
      .join('\n');

  const exportCsv = () =>
    downloadCsv(`${type}-ageing`, [
      { label: 'Party', key: 'name' },
      { label: 'Mobile', key: 'mobile' },
      { label: 'Documents', key: 'count' },
      ...data.buckets.map((bucket) => ({ label: bucket.label, key: bucket.key })),
      { label: 'Total Outstanding', key: 'balance' }
    ], data.rows);

  return (
    <div className={cx('space-y-5', state.loading && 'opacity-60')}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard label={isReceivable ? 'Total Receivable' : 'Total Payable'} value={formatCurrency(data.totals.balance)} tone={isReceivable ? 'green' : 'red'} />
        {data.buckets.map((bucket) => (
          <StatCard key={bucket.key} label={bucket.label} value={formatCurrency(data.totals[bucket.key])} tone={bucket.key === 'current' ? 'gray' : bucket.key === 'd90plus' ? 'red' : 'amber'} />
        ))}
      </div>

      <ReportShell title={isReceivable ? 'Receivables Ageing' : 'Payables Ageing'} subtitle={`As of today · ${data.rows.length} parties`} onExport={exportCsv}>
        {data.rows.length === 0 ? (
          <EmptyState title={isReceivable ? 'Nothing to collect' : 'Nothing to pay'} description="All dues are settled." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th className="text-right">Docs</th>
                  {data.buckets.map((bucket) => (
                    <th key={bucket.key} className="text-right">
                      {bucket.label}
                    </th>
                  ))}
                  <th className="text-right">Total</th>
                  {isReceivable && <th className="w-px" />}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const key = row.partyId || row.name;
                  const open = expanded.has(key);
                  return (
                    <Fragment key={key}>
                      <tr className="row-link" onClick={() => toggle(key)}>
                        <td>
                          <div className="flex items-center gap-2">
                            {open ? <ChevronDownIcon className="size-4 text-slate-400" /> : <ChevronRightIcon className="size-4 text-slate-400" />}
                            <div>
                              {row.partyId ? (
                                <Link to={`/parties/${row.partyId}`} onClick={(event) => event.stopPropagation()} className="font-medium text-slate-900 hover:text-brand-700">
                                  {row.name}
                                </Link>
                              ) : (
                                <span className="font-medium text-slate-900">{row.name}</span>
                              )}
                              {row.mobile && <p className="text-xs text-slate-500">{row.mobile}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="text-right">{row.count}</td>
                        {data.buckets.map((bucket) => (
                          <td key={bucket.key} className={cx('text-right tabular-nums', row[bucket.key] ? (bucket.key === 'd90plus' ? 'text-rose-600' : 'text-slate-800') : 'text-slate-300')}>
                            {row[bucket.key] ? formatCurrency(row[bucket.key]) : '—'}
                          </td>
                        ))}
                        <Money value={row.balance} className="font-semibold text-slate-900" />
                        {isReceivable && (
                          <td onClick={(event) => event.stopPropagation()}>
                            <a href={whatsappLink(row.mobile, reminder(row))} target="_blank" rel="noreferrer" className="inline-flex rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50" title="Send WhatsApp reminder">
                              <ChatBubbleLeftRightIcon className="size-5" />
                            </a>
                          </td>
                        )}
                      </tr>
                      {open &&
                        row.documents.map((doc, index) => (
                          <tr key={`${key}-${doc.docId || index}`} className="bg-slate-50/70 text-xs">
                            <td className="pl-10">
                              {doc.docId ? (
                                <Link to={`/${isReceivable ? 'sales' : 'purchases'}/${doc.docId}`} className="text-brand-700 hover:underline">
                                  {doc.number}
                                </Link>
                              ) : (
                                doc.number
                              )}
                              {doc.date && <span className="ml-2 text-slate-500">{formatDate(doc.date)}</span>}
                            </td>
                            <td colSpan={data.buckets.length + 1} className="text-slate-500">
                              {doc.dueDate ? `Due ${formatDate(doc.dueDate)}` : ''}
                              {doc.overdueDays > 0 && <Badge tone="red" className="ml-2">{doc.overdueDays} days overdue</Badge>}
                            </td>
                            <Money value={doc.balanceDue} />
                            {isReceivable && <td />}
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ReportShell>
    </div>
  );
}

/* ------------------------------------------------------------ Items & stock */

export function ItemsReport({ range }) {
  const state = useReport('/reports/items', range);
  const { data } = state;
  if (!data) return <Loading state={state} />;

  const exportCsv = () =>
    downloadCsv(`item-wise-${range.from || 'all'}`, [
      { label: 'Item', key: 'name' },
      { label: 'HSN', key: 'hsnCode' },
      { label: 'Unit', key: 'unit' },
      { label: 'Qty Sold', key: 'soldQty' },
      { label: 'Sales (Taxable)', key: 'salesTaxable' },
      { label: 'Sales (incl. GST)', key: 'salesAmount' },
      { label: 'Qty Purchased', key: 'purchasedQty' },
      { label: 'Purchases (incl. GST)', key: 'purchaseAmount' }
    ], data.rows);

  return (
    <ReportShell title="Item-wise Sales & Purchases" subtitle={rangeLabel(range)} onExport={exportCsv} className={state.loading ? 'opacity-60' : ''}>
      {data.rows.length === 0 ? (
        <EmptyState title="No item movement in this period" />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>HSN</th>
                <th className="text-right">Qty Sold</th>
                <th className="text-right">Sales (Taxable)</th>
                <th className="text-right">Sales (incl. GST)</th>
                <th className="text-right">Qty Purchased</th>
                <th className="text-right">Purchases</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.key}>
                  <td className="max-w-64 truncate font-medium text-slate-900">{row.name}</td>
                  <td>{row.hsnCode || '—'}</td>
                  <td className="text-right tabular-nums">
                    {formatNumber(row.soldQty)} {row.unit}
                  </td>
                  <Money value={row.salesTaxable} />
                  <Money value={row.salesAmount} className="font-medium" />
                  <td className="text-right tabular-nums">
                    {formatNumber(row.purchasedQty)} {row.unit}
                  </td>
                  <Money value={row.purchaseAmount} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total</td>
                <Money value={data.totals.salesTaxable} />
                <Money value={data.totals.salesAmount} />
                <td />
                <Money value={data.totals.purchaseAmount} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

export function StockReport() {
  const state = useReport('/reports/stock', null);
  const { data } = state;
  if (!data) return <Loading state={state} />;

  const exportCsv = () =>
    downloadCsv('stock-summary', [
      { label: 'Item', key: 'name' },
      { label: 'SKU', key: 'sku' },
      { label: 'Category', key: 'category' },
      { label: 'Stock', key: 'stock' },
      { label: 'Unit', key: 'unit' },
      { label: 'Purchase Price', key: 'purchaseRate' },
      { label: 'Stock Value', key: 'stockValue' },
      { label: 'Sale Price', key: 'saleRate' },
      { label: 'Sale Value', key: 'saleValue' }
    ], data.rows);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tracked Items" value={data.totals.items} tone="brand" />
        <StatCard label="Low / Out of Stock" value={data.totals.lowStock} tone={data.totals.lowStock ? 'amber' : 'gray'} />
        <StatCard label="Stock Value (Cost)" value={formatCurrency(data.totals.stockValue)} tone="green" />
        <StatCard label="Stock Value (Sale Price)" value={formatCurrency(data.totals.saleValue)} tone="violet" />
      </div>
      <ReportShell title="Stock Summary" subtitle="Current stock" onExport={exportCsv}>
        {data.rows.length === 0 ? (
          <EmptyState title="No items with stock tracking" description="Turn on stock tracking for goods to see them here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Purchase Price</th>
                  <th className="text-right">Stock Value</th>
                  <th className="text-right">Sale Price</th>
                  <th className="text-right">Sale Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <p className="font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{[row.sku, row.category].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="text-right tabular-nums">
                      {formatNumber(row.stock)} {row.unit}
                    </td>
                    <Money value={row.purchaseRate} />
                    <Money value={row.stockValue} className="font-medium" />
                    <Money value={row.saleRate} />
                    <Money value={row.saleValue} />
                    <td>{row.stock <= 0 ? <Badge tone="red">Out of stock</Badge> : row.isLow ? <Badge tone="amber">Low</Badge> : <Badge tone="green">In stock</Badge>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <Money value={data.totals.stockValue} />
                  <td />
                  <Money value={data.totals.saleValue} />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </ReportShell>
    </div>
  );
}

/* ----------------------------------------------------------------- Expenses */

export function ExpenseReport({ range }) {
  const state = useReport('/reports/expenses', range);
  const { data } = state;
  if (!data) return <Loading state={state} />;
  const max = Math.max(1, ...data.byCategory.map((row) => row.total));

  return (
    <div className={cx('grid gap-5 lg:grid-cols-2', state.loading && 'opacity-60')}>
      <ReportShell
        title="Expenses by Category"
        subtitle={`${rangeLabel(range)} · ${formatCurrency(data.totals.total)}`}
        onExport={() =>
          downloadCsv(`expense-categories-${range.from || 'all'}`, [
            { label: 'Category', key: 'category' },
            { label: 'Entries', key: 'count' },
            { label: 'GST', key: 'gst' },
            { label: 'Total', key: 'total' }
          ], data.byCategory)
        }
      >
        {data.byCategory.length === 0 ? (
          <EmptyState title="No expenses in this period" />
        ) : (
          <ul className="space-y-4 p-5">
            {data.byCategory.map((row) => (
              <li key={row.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {row.category} <span className="text-xs font-normal text-slate-400">({row.count})</span>
                  </span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(row.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(row.total / max) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-right text-[11px] text-slate-400">{((row.total / Math.max(data.totals.total, 1)) * 100).toFixed(1)}% of total</p>
              </li>
            ))}
          </ul>
        )}
      </ReportShell>

      <ReportShell
        title="Expense Entries"
        subtitle={`${data.totals.count} entries`}
        onExport={() =>
          downloadCsv(`expenses-${range.from || 'all'}`, [
            { label: 'Date', value: (row) => formatDateNumeric(row.date) },
            { label: 'Category', key: 'category' },
            { label: 'Paid To', key: 'payee' },
            { label: 'GST', key: 'gstAmount' },
            { label: 'Amount', key: 'amount' }
          ], data.rows)
        }
      >
        {data.rows.length === 0 ? (
          <EmptyState title="No expenses in this period" />
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Paid To</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.category}</td>
                    <td className="max-w-40 truncate">{row.payee || '—'}</td>
                    <Money value={row.amount} />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <Money value={data.totals.total} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </ReportShell>
    </div>
  );
}
