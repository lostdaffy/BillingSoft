import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { GST_RATE_OPTIONS, UNITS } from '../lib/constants';
import { Button, Modal, SegmentedControl, SelectInput, TextArea, TextInput, Toggle } from './ui';

const toForm = (item, defaults) => ({
  type: item?.type || 'GOODS',
  name: item?.name || defaults.name || '',
  sku: item?.sku || '',
  category: item?.category || '',
  hsnCode: item?.hsnCode || '',
  unit: item?.unit || 'Nos',
  defaultRate: item?.defaultRate !== undefined ? String(item.defaultRate) : '',
  purchaseRate: item?.purchaseRate ? String(item.purchaseRate) : '',
  taxRate: String(item?.taxRate ?? defaults.taxRate),
  description: item?.description || '',
  trackStock: item?.trackStock ?? true,
  stock: '',
  lowStockAlert: item?.lowStockAlert ? String(item.lowStockAlert) : '',
  isActive: item?.isActive ?? true
});

export default function ItemFormModal({ open, onClose, item, defaultName = '', defaultTaxRate = '0', onSaved }) {
  const [form, setForm] = useState(() => toForm(item, { name: defaultName, taxRate: defaultTaxRate }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const isEdit = Boolean(item?._id);
  const isGoods = form.type === 'GOODS';

  useEffect(() => {
    if (!open) return;
    api
      .get('/products/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => {});
  }, [open]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const bind = (field) => ({ value: form[field], onChange: (event) => update(field, event.target.value) });

  const rateOptions = GST_RATE_OPTIONS.some((option) => option.value === form.taxRate)
    ? GST_RATE_OPTIONS
    : [...GST_RATE_OPTIONS, { value: form.taxRate, label: `${form.taxRate}%` }];

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Item name is required';
    if (form.defaultRate === '' || Number(form.defaultRate) < 0) nextErrors.defaultRate = 'Enter the sale price (0 or more)';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        defaultRate: Number(form.defaultRate) || 0,
        purchaseRate: Number(form.purchaseRate) || 0,
        taxRate: Number(form.taxRate) || 0,
        lowStockAlert: Number(form.lowStockAlert) || 0,
        trackStock: isGoods && form.trackStock
      };
      if (isEdit) delete payload.stock;
      else payload.stock = Number(form.stock) || 0;

      const { data } = isEdit ? await api.put(`/products/${item._id}`, payload) : await api.post('/products', payload);
      toast.success(isEdit ? 'Item updated' : 'Item added');
      onSaved?.(data);
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit Item' : 'Add New Item'}
      description="Products and services you sell or buy."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Item'}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-5" noValidate>
        <SegmentedControl
          options={[
            { value: 'GOODS', label: 'Product / Goods' },
            { value: 'SERVICE', label: 'Service' }
          ]}
          value={form.type}
          onChange={(value) => update('type', value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Item Name" required autoFocus {...bind('name')} error={errors.name} className="sm:col-span-2" placeholder="e.g. Steel Almirah 4ft" />
          <TextInput label={isGoods ? 'HSN Code' : 'SAC Code'} {...bind('hsnCode')} inputMode="numeric" placeholder={isGoods ? '9403' : '9983'} />
          <TextInput label="Item Code / SKU" {...bind('sku')} />
          <TextInput label="Category" {...bind('category')} list="item-categories" placeholder="e.g. Furniture" />
          <TextInput label="Unit" {...bind('unit')} list="item-units" />
          <datalist id="item-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <datalist id="item-units">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Sale Price (₹)" required type="number" min="0" step="any" {...bind('defaultRate')} error={errors.defaultRate} />
          <TextInput label="Purchase Price (₹)" type="number" min="0" step="any" {...bind('purchaseRate')} hint="Used for profit reports" />
          <SelectInput label="GST Rate" options={rateOptions} {...bind('taxRate')} />
        </div>

        <TextArea label="Description" rows={2} {...bind('description')} />

        {isGoods && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <Toggle label="Track stock" description="Stock goes down on sales and up on purchases" checked={form.trackStock} onChange={(value) => update('trackStock', value)} />
            {form.trackStock && (
              <div className="grid gap-4 sm:grid-cols-2">
                {!isEdit && <TextInput label="Opening Stock" type="number" step="any" {...bind('stock')} hint="Quantity you have right now" />}
                <TextInput label="Low Stock Alert" type="number" min="0" step="any" {...bind('lowStockAlert')} hint="Warn when stock falls to this level" />
              </div>
            )}
          </div>
        )}

        {isEdit && <Toggle label="Active" description="Inactive items are hidden when creating invoices" checked={form.isActive} onChange={(value) => update('isActive', value)} />}
      </form>
    </Modal>
  );
}
