import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PlusIcon,
  ScaleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../components/Confirm';
import { useApi, useDebouncedValue, useDocumentTitle } from '../lib/hooks';
import { formatCurrency, formatNumber, toNumber } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { cx } from '../lib/cx';
import ItemFormModal from '../components/ItemFormModal';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  IconButton,
  Modal,
  PageHeader,
  PageLoader,
  SearchInput,
  SegmentedControl,
  SelectInput,
  StatCard,
  TextInput
} from '../components/ui';

function StockModal({ item, onClose, onSaved }) {
  const [mode, setMode] = useState('ADD');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const qty = toNumber(quantity);
  const after = mode === 'SET' ? qty : mode === 'ADD' ? item.stock + qty : item.stock - qty;

  const submit = async (event) => {
    event.preventDefault();
    if (quantity === '' || (mode !== 'SET' && qty <= 0)) {
      setError('Enter a quantity');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/products/${item._id}/adjust-stock`, { mode, quantity: qty });
      toast.success('Stock updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      title="Adjust Stock"
      description={`${item.name} · Current stock ${formatNumber(item.stock)} ${item.unit}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="stock-form" loading={saving}>
            Update Stock
          </Button>
        </>
      }
    >
      <form id="stock-form" onSubmit={submit} className="space-y-4" noValidate>
        <SegmentedControl
          options={[
            { value: 'ADD', label: 'Add Stock' },
            { value: 'REMOVE', label: 'Reduce Stock' },
            { value: 'SET', label: 'Set Exact' }
          ]}
          value={mode}
          onChange={setMode}
        />
        <TextInput
          label={mode === 'SET' ? 'New stock quantity' : 'Quantity'}
          type="number"
          step="any"
          min="0"
          autoFocus
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          error={error}
          hint="For opening stock, damages, returns or physical count corrections"
        />
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Stock after update:{' '}
          <span className={cx('font-semibold', after < 0 ? 'text-rose-600' : 'text-slate-900')}>
            {formatNumber(after)} {item.unit}
          </span>
        </div>
      </form>
    </Modal>
  );
}

function StockBadge({ item }) {
  if (!item.trackStock) return <span className="text-xs text-slate-400">Not tracked</span>;
  const out = item.stock <= 0;
  const low = !out && item.stock <= item.lowStockAlert;
  return (
    <div className="flex items-center gap-2">
      <span className={cx('font-semibold tabular-nums', out ? 'text-rose-600' : low ? 'text-amber-700' : 'text-slate-900')}>
        {formatNumber(item.stock)} {item.unit}
      </span>
      {out && <Badge tone="red">Out</Badge>}
      {low && <Badge tone="amber">Low</Badge>}
    </div>
  );
}

export default function Items() {
  useDocumentTitle('Items & Stock');
  const confirm = useConfirm();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [modal, setModal] = useState(() => (params.get('new') ? { item: null } : null));
  const [stockItem, setStockItem] = useState(null);
  const query = useDebouncedValue(search, 300);

  const { data, loading, error, reload } = useApi(
    () =>
      api
        .get('/products', { params: { q: query || undefined, type: type || undefined, category: category || undefined, lowStock: lowOnly ? 'true' : undefined } })
        .then((res) => res.data),
    [query, type, category, lowOnly]
  );
  const categories = useApi(() => api.get('/products/categories').then((res) => res.data), []);

  const items = data || [];
  const tracked = items.filter((item) => item.trackStock);
  const stockValue = tracked.reduce((sum, item) => sum + Math.max(item.stock, 0) * toNumber(item.purchaseRate), 0);
  const lowCount = tracked.filter((item) => item.stock <= item.lowStockAlert).length;
  const filtered = Boolean(query || type || category || lowOnly);

  const closeModal = () => {
    setModal(null);
    if (params.get('new')) setParams({}, { replace: true });
  };

  const remove = async (item) => {
    const ok = await confirm({ title: `Delete ${item.name}?`, message: 'Past invoices keep the item details. This cannot be undone.', confirmText: 'Delete Item' });
    if (!ok) return;
    try {
      await api.delete(`/products/${item._id}`);
      toast.success('Item deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      'items',
      [
        { label: 'Name', key: 'name' },
        { label: 'Type', key: 'type' },
        { label: 'SKU', key: 'sku' },
        { label: 'Category', key: 'category' },
        { label: 'HSN/SAC', key: 'hsnCode' },
        { label: 'Unit', key: 'unit' },
        { label: 'Sale Price', key: 'defaultRate' },
        { label: 'Purchase Price', key: 'purchaseRate' },
        { label: 'GST %', key: 'taxRate' },
        { label: 'Stock', value: (row) => (row.trackStock ? row.stock : '') },
        { label: 'Low Stock Alert', key: 'lowStockAlert' }
      ],
      items
    );

  return (
    <>
      <PageHeader
        title="Items & Stock"
        subtitle="Products and services with prices, GST rates and live stock"
        actions={
          <>
            {items.length > 0 && (
              <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={exportCsv}>
                Export
              </Button>
            )}
            <Button icon={PlusIcon} onClick={() => setModal({ item: null })}>
              Add Item
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label={filtered ? 'Items (filtered)' : 'Total Items'} value={items.length} icon={CubeIcon} tone="brand" />
        <StatCard label="Stock Value (at purchase price)" value={formatCurrency(stockValue)} icon={ScaleIcon} tone="green" />
        <StatCard label="Low / Out of Stock" value={lowCount} icon={ExclamationTriangleIcon} tone={lowCount ? 'amber' : 'gray'} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              size="sm"
              options={[
                { value: '', label: 'All' },
                { value: 'GOODS', label: 'Goods' },
                { value: 'SERVICE', label: 'Services' }
              ]}
              value={type}
              onChange={setType}
            />
            <Checkbox checked={lowOnly} onChange={setLowOnly} label="Low stock only" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {categories.data?.length > 0 && (
              <SelectInput
                placeholder="All categories"
                options={categories.data.map((value) => ({ value, label: value }))}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                inputClassName="sm:w-44"
              />
            )}
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, SKU, HSN" className="sm:w-64" />
          </div>
        </div>

        {error && !data ? (
          <ErrorState error={error} onRetry={reload} className="m-4 border-0 shadow-none" />
        ) : !data ? (
          <PageLoader />
        ) : items.length === 0 ? (
          <EmptyState
            icon={CubeIcon}
            title={filtered ? 'No matching items' : 'No items yet'}
            description={filtered ? 'Try changing the filters.' : 'Add products and services once and pick them on invoices in a click.'}
            action={
              !filtered && (
                <Button icon={PlusIcon} onClick={() => setModal({ item: null })}>
                  Add Item
                </Button>
              )
            }
          />
        ) : (
          <div className={cx('overflow-x-auto', loading && 'opacity-60')}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>HSN/SAC</th>
                  <th className="text-right">Sale Price</th>
                  <th className="text-right">Purchase Price</th>
                  <th>GST</th>
                  <th>Stock</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <p className="max-w-64 truncate font-medium text-slate-900">{item.name}</p>
                        {item.type === 'SERVICE' && <Badge tone="blue">Service</Badge>}
                        {item.isActive === false && <Badge>Inactive</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">{[item.sku, item.category].filter(Boolean).join(' · ') || '—'}</p>
                    </td>
                    <td>{item.hsnCode || '—'}</td>
                    <td className="text-right tabular-nums">
                      {formatCurrency(item.defaultRate)}
                      <span className="text-xs text-slate-400"> /{item.unit}</span>
                    </td>
                    <td className="text-right tabular-nums">{item.purchaseRate ? formatCurrency(item.purchaseRate) : '—'}</td>
                    <td>{item.taxRate}%</td>
                    <td>
                      <StockBadge item={item} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {item.trackStock && <IconButton icon={AdjustmentsHorizontalIcon} label="Adjust stock" onClick={() => setStockItem(item)} />}
                        <IconButton icon={PencilSquareIcon} label="Edit" onClick={() => setModal({ item })} />
                        <IconButton icon={TrashIcon} label="Delete" tone="danger" onClick={() => remove(item)} />
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
        <ItemFormModal
          key={modal.item?._id || 'new'}
          open
          item={modal.item}
          defaultTaxRate={user?.company?.gstin ? '18' : '0'}
          onClose={closeModal}
          onSaved={() => {
            reload();
            categories.reload();
          }}
        />
      )}
      {stockItem && <StockModal item={stockItem} onClose={() => setStockItem(null)} onSaved={reload} />}
    </>
  );
}
