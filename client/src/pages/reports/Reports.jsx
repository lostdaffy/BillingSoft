import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/hooks';
import { makeRange } from '../../lib/dates';
import { DateRangeFilter, PageHeader, Tabs } from '../../components/ui';
import { ExpenseReport, GstReport, ItemsReport, OutstandingReport, ProfitLossReport, RegisterReport, StockReport } from './ReportViews';

const TABS = [
  { value: 'overview', label: 'Profit & Loss' },
  { value: 'sales', label: 'Sales Register' },
  { value: 'purchases', label: 'Purchase Register' },
  { value: 'gst', label: 'GST Summary' },
  { value: 'receivables', label: 'Receivables' },
  { value: 'payables', label: 'Payables' },
  { value: 'items', label: 'Item-wise' },
  { value: 'stock', label: 'Stock Summary' },
  { value: 'expenses', label: 'Expenses' }
];

const NO_RANGE = ['receivables', 'payables', 'stock'];

export default function Reports() {
  useDocumentTitle('Reports');
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((item) => item.value === params.get('tab')) ? params.get('tab') : 'overview';
  const [range, setRange] = useState(() => makeRange('this_fy'));

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Sales, GST, dues, stock and profit for your business"
        actions={!NO_RANGE.includes(tab) && <DateRangeFilter value={range} onChange={setRange} />}
      />
      <Tabs tabs={TABS} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} className="mb-5" />

      {tab === 'overview' && <ProfitLossReport range={range} />}
      {tab === 'sales' && <RegisterReport key="sales" kind="sales" range={range} />}
      {tab === 'purchases' && <RegisterReport key="purchases" kind="purchases" range={range} />}
      {tab === 'gst' && <GstReport range={range} />}
      {tab === 'receivables' && <OutstandingReport key="receivable" type="receivable" />}
      {tab === 'payables' && <OutstandingReport key="payable" type="payable" />}
      {tab === 'items' && <ItemsReport range={range} />}
      {tab === 'stock' && <StockReport />}
      {tab === 'expenses' && <ExpenseReport range={range} />}
    </>
  );
}
