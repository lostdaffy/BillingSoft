import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, PencilSquareIcon, TrashIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useConfirm } from '../../components/Confirm';
import { useApi, useDebouncedValue, useDocumentTitle } from '../../lib/hooks';
import { stateName } from '../../lib/constants';
import { formatCurrency } from '../../lib/format';
import { downloadCsv } from '../../lib/csv';
import { cx } from '../../lib/cx';
import PartyFormModal from '../../components/PartyFormModal';
import { Avatar, Badge, Button, EmptyState, ErrorState, IconButton, PageHeader, PageLoader, SearchInput, StatCard, Tabs } from '../../components/ui';

const TYPE_BADGE = {
  CUSTOMER: { label: 'Customer', tone: 'brand' },
  SUPPLIER: { label: 'Supplier', tone: 'violet' },
  BOTH: { label: 'Both', tone: 'blue' }
};

export default function Parties() {
  useDocumentTitle('Parties');
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(() => (params.get('new') ? { party: null } : null));
  const query = useDebouncedValue(search, 300);

  const { data, loading, error, reload } = useApi(
    () => api.get('/clients', { params: { type: tab === 'ALL' ? undefined : tab, q: query || undefined } }).then((res) => res.data),
    [tab, query]
  );

  const parties = data || [];
  const totals = parties.reduce((sum, party) => ({ receivable: sum.receivable + party.receivable, payable: sum.payable + party.payable }), { receivable: 0, payable: 0 });

  const closeModal = () => {
    setModal(null);
    if (params.get('new')) setParams({}, { replace: true });
  };

  const remove = async (party) => {
    const ok = await confirm({
      title: `Delete ${party.name}?`,
      message: 'Existing invoices and bills keep a copy of the party details. This cannot be undone.',
      confirmText: 'Delete Party'
    });
    if (!ok) return;
    try {
      await api.delete(`/clients/${party._id}`);
      toast.success('Party deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = () =>
    downloadCsv('parties', [
      { label: 'Name', key: 'name' },
      { label: 'Type', key: 'type' },
      { label: 'Mobile', key: 'mobile' },
      { label: 'Email', key: 'email' },
      { label: 'GSTIN', key: 'gst' },
      { label: 'City', key: 'city' },
      { label: 'State', value: (row) => stateName(row.stateCode) },
      { label: 'Receivable', key: 'receivable' },
      { label: 'Payable', key: 'payable' }
    ], parties);

  return (
    <>
      <PageHeader
        title="Parties"
        subtitle="Customers and suppliers with their outstanding balances"
        actions={
          <>
            {parties.length > 0 && (
              <Button variant="secondary" onClick={exportCsv}>
                Export
              </Button>
            )}
            <Button icon={UserPlusIcon} onClick={() => setModal({ party: null })}>
              Add Party
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Parties" value={parties.length} icon={UsersIcon} tone="brand" />
        <StatCard label="You'll Receive" value={formatCurrency(totals.receivable)} icon={ArrowTrendingUpIcon} tone="green" />
        <StatCard label="You'll Pay" value={formatCurrency(totals.payable)} icon={ArrowTrendingDownIcon} tone="red" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-2 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <Tabs
            className="border-b-0"
            tabs={[
              { value: 'ALL', label: 'All' },
              { value: 'CUSTOMER', label: 'Customers' },
              { value: 'SUPPLIER', label: 'Suppliers' }
            ]}
            value={tab}
            onChange={setTab}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, mobile, GSTIN" className="sm:w-72" />
        </div>

        {error && !data ? (
          <ErrorState error={error} onRetry={reload} className="m-4 border-0 shadow-none" />
        ) : !data ? (
          <PageLoader />
        ) : parties.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={query ? 'No matching parties' : 'No parties yet'}
            description={query ? 'Try a different search.' : 'Add your customers and suppliers to bill faster and track balances.'}
            action={
              !query && (
                <Button icon={UserPlusIcon} onClick={() => setModal({ party: null })}>
                  Add Party
                </Button>
              )
            }
          />
        ) : (
          <div className={cx('overflow-x-auto', loading && 'opacity-60')}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Type</th>
                  <th>Mobile</th>
                  <th>GSTIN</th>
                  <th className="text-right">To Receive</th>
                  <th className="text-right">To Pay</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party._id} className="row-link" onClick={() => navigate(`/parties/${party._id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={party.name} className="size-8 rounded-full text-xs" />
                        <div className="min-w-0">
                          <p className="max-w-60 truncate font-medium text-slate-900">{party.name}</p>
                          <p className="text-xs text-slate-500">{[party.city, stateName(party.stateCode)].filter(Boolean).join(', ') || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={TYPE_BADGE[party.type]?.tone}>{TYPE_BADGE[party.type]?.label || party.type}</Badge>
                    </td>
                    <td>{party.mobile || '—'}</td>
                    <td className="font-mono text-xs">{party.gst || '—'}</td>
                    <td className={cx('text-right tabular-nums', party.receivable > 0 ? 'font-semibold text-emerald-700' : 'text-slate-400')}>{formatCurrency(party.receivable)}</td>
                    <td className={cx('text-right tabular-nums', party.payable > 0 ? 'font-semibold text-rose-600' : 'text-slate-400')}>{formatCurrency(party.payable)}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <IconButton icon={PencilSquareIcon} label="Edit" onClick={() => setModal({ party })} />
                        <IconButton icon={TrashIcon} label="Delete" tone="danger" onClick={() => remove(party)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <PartyFormModal
          key={modal.party?._id || 'new'}
          open
          party={modal.party}
          defaultType={tab === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER'}
          onClose={closeModal}
          onSaved={() => reload()}
        />
      )}
    </>
  );
}
