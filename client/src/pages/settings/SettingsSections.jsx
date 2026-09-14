import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { ArchiveBoxIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, CheckIcon, PhotoIcon, ShieldCheckIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/hooks';
import { STATE_OPTIONS, isValidGstin, stateCodeFromGstin, stateName } from '../../lib/constants';
import { todayInput } from '../../lib/format';
import { imageFileToDataUrl } from '../../lib/image';
import { downloadJson } from '../../lib/csv';
import { cx } from '../../lib/cx';
import PasswordInput from '../../components/PasswordInput';
import { Button, Card, ErrorState, PageLoader, SelectInput, TextArea, TextInput, Toggle } from '../../components/ui';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ImagePicker({ label, value, onChange, hint, boxClassName = 'h-20 w-40' }) {
  const inputRef = useRef(null);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      onChange(await imageFileToDataUrl(file));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className={cx('flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2', boxClassName)}>
          {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <PhotoIcon className="size-7 text-slate-300" />}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={ArrowUpTrayIcon} onClick={() => inputRef.current?.click()}>
              {value ? 'Change' : 'Upload'}
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => onChange('')}>
                Remove
              </Button>
            )}
          </div>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
    </div>
  );
}

function SaveBar({ saving, label = 'Save Changes' }) {
  return (
    <div className="flex justify-end">
      <Button type="submit" loading={saving}>
        {label}
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------- Business profile */

export function BusinessProfileSettings() {
  const { user, setUser } = useAuth();
  const company = user?.company || {};
  const [form, setForm] = useState(() => ({
    name: company.name || '',
    tagline: company.tagline || company.dealsIn || '',
    gstin: company.gstin || '',
    pan: company.pan || '',
    mobile: company.mobile || '',
    email: company.email || '',
    website: company.website || '',
    address: company.address || '',
    city: company.city || '',
    stateCode: company.stateCode || '',
    pincode: company.pincode || '',
    logo: company.logo || ''
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const bind = (field) => ({ value: form[field], onChange: (event) => set(field, event.target.value) });

  const onGstin = (event) => {
    const gstin = event.target.value.toUpperCase().replace(/\s/g, '');
    setForm((current) => ({
      ...current,
      gstin,
      ...(isValidGstin(gstin) ? { stateCode: stateCodeFromGstin(gstin), pan: current.pan || gstin.slice(2, 12) } : {})
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Business name is required';
    if (form.gstin && !isValidGstin(form.gstin)) next.gstin = 'Enter a valid 15-character GSTIN';
    if (form.email && !EMAIL_REGEX.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) next.pincode = 'Pincode must be 6 digits';
    if (!form.stateCode) next.stateCode = 'Select your state so GST is calculated correctly';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const { data } = await api.put('/auth/company', { ...form, dealsIn: form.tagline, state: stateName(form.stateCode) });
      setUser(data.user);
      toast.success('Business profile saved');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card title="Business Details" subtitle="Printed at the top of every invoice and quotation">
        <div className="space-y-5">
          <ImagePicker label="Business Logo" value={form.logo} onChange={(value) => set('logo', value)} hint="PNG or JPG. Wide or square logos work best." />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Business Name" required {...bind('name')} error={errors.name} className="sm:col-span-2" />
            <TextInput label="Tagline / Deals In" placeholder="e.g. Wholesale dealers in hardware & sanitaryware" {...bind('tagline')} className="sm:col-span-2" />
            <TextInput label="GSTIN" value={form.gstin} onChange={onGstin} maxLength={15} error={errors.gstin} hint="Leave blank if you are not GST registered" />
            <TextInput label="PAN" value={form.pan} onChange={(event) => set('pan', event.target.value.toUpperCase())} maxLength={10} />
            <TextInput label="Phone" inputMode="tel" {...bind('mobile')} />
            <TextInput label="Email" type="email" {...bind('email')} error={errors.email} />
            <TextInput label="Website" placeholder="www.yourbusiness.com" {...bind('website')} className="sm:col-span-2" />
          </div>
        </div>
      </Card>

      <Card title="Business Address" subtitle="Your state decides whether sales use CGST + SGST or IGST">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextArea label="Address" rows={2} {...bind('address')} className="sm:col-span-3" />
          <TextInput label="City" {...bind('city')} />
          <SelectInput label="State" required placeholder="Select state" options={STATE_OPTIONS} {...bind('stateCode')} error={errors.stateCode} />
          <TextInput label="Pincode" inputMode="numeric" maxLength={6} {...bind('pincode')} error={errors.pincode} />
        </div>
      </Card>

      <SaveBar saving={saving} label="Save Business Profile" />
    </form>
  );
}

/* ---------------------------------------------------------- Invoice settings */

const NUMBERING_LABELS = {
  INVOICE: { label: 'Tax Invoice', key: 'invoicePrefix' },
  QUOTATION: { label: 'Quotation', key: 'quotationPrefix' },
  ESTIMATE: { label: 'Estimate', key: 'estimatePrefix' },
  PROFORMA: { label: 'Proforma Invoice', key: 'proformaPrefix' },
  PURCHASE: { label: 'Purchase (internal ref.)', key: 'purchasePrefix' }
};

const THEME_COLORS = ['#4f46e5', '#2563eb', '#0f766e', '#15803d', '#b45309', '#b91c1c', '#be185d', '#7c3aed', '#1f2937'];

export function InvoiceSettings() {
  const { user, setUser } = useAuth();
  const settings = user?.settings || {};
  const numbering = useApi(() => api.get('/auth/numbering').then((res) => res.data.numbering), []);

  const [form, setForm] = useState(() => ({
    defaultDueDays: String(settings.defaultDueDays ?? 15),
    defaultTerms: settings.defaultTerms || '',
    defaultNotes: settings.defaultNotes || '',
    roundOff: settings.roundOff !== false,
    pricesIncludeTax: Boolean(settings.pricesIncludeTax),
    showBankDetails: settings.showBankDetails !== false,
    showUpiQr: settings.showUpiQr !== false,
    showSignature: settings.showSignature !== false,
    themeColor: settings.themeColor || '#4f46e5'
  }));
  const [prefixes, setPrefixes] = useState(() =>
    Object.values(NUMBERING_LABELS).reduce((all, { key }) => ({ ...all, [key]: settings[key] || '' }), {})
  );
  const [nextNumbers, setNextNumbers] = useState({});
  const [signature, setSignature] = useState(user?.company?.signature || '');
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      let { data } = await api.put('/auth/settings', { ...form, ...prefixes, defaultDueDays: Number(form.defaultDueDays) || 0 });
      let latestUser = data.user;

      const changed = (numbering.data || []).filter((row) => nextNumbers[row.docType] !== undefined && Number(nextNumbers[row.docType]) !== row.nextNumber);
      for (const row of changed) {
        await api.put('/auth/numbering', { docType: row.docType, nextNumber: Number(nextNumbers[row.docType]) });
      }

      if (signature !== (user?.company?.signature || '')) {
        ({ data } = await api.put('/auth/company', { signature }));
        latestUser = data.user;
      }

      setUser(latestUser);
      setNextNumbers({});
      numbering.reload();
      toast.success('Invoice settings saved');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card title="Document Numbering" subtitle="Numbers restart automatically every financial year (April - March)" padded={false}>
        {numbering.error && !numbering.data ? (
          <ErrorState error={numbering.error} onRetry={numbering.reload} className="m-4 border-0 shadow-none" />
        ) : !numbering.data ? (
          <PageLoader className="py-10" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Prefix</th>
                  <th>Next Number</th>
                  <th>Next Document No.</th>
                </tr>
              </thead>
              <tbody>
                {numbering.data.map((row) => {
                  const meta = NUMBERING_LABELS[row.docType];
                  const prefix = (prefixes[meta.key] || row.prefix).toUpperCase().replace(/[^A-Z0-9-]/g, '');
                  const next = nextNumbers[row.docType] ?? String(row.nextNumber);
                  return (
                    <tr key={row.docType}>
                      <td className="font-medium text-slate-900">{meta.label}</td>
                      <td>
                        <input
                          className="input w-28 uppercase"
                          maxLength={8}
                          value={prefixes[meta.key]}
                          placeholder={row.prefix}
                          onChange={(event) => setPrefixes((current) => ({ ...current, [meta.key]: event.target.value.toUpperCase() }))}
                        />
                      </td>
                      <td>
                        <input
                          className="input w-24"
                          type="number"
                          min="1"
                          value={next}
                          onChange={(event) => setNextNumbers((current) => ({ ...current, [row.docType]: event.target.value }))}
                        />
                      </td>
                      <td className="font-mono text-sm text-slate-700">
                        {prefix}/{row.financialYear}/{String(Math.max(Number(next) || 1, 1)).padStart(4, '0')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Defaults for New Invoices">
        <div className="grid gap-4">
          <TextInput label="Payment due in (days)" type="number" min="0" max="365" value={form.defaultDueDays} onChange={(event) => set('defaultDueDays', event.target.value)} className="sm:max-w-xs" />
          <TextArea label="Default Notes" rows={2} value={form.defaultNotes} onChange={(event) => set('defaultNotes', event.target.value)} />
          <TextArea label="Default Terms & Conditions" rows={4} value={form.defaultTerms} onChange={(event) => set('defaultTerms', event.target.value)} />
        </div>
      </Card>

      <Card title="Calculation">
        <div className="space-y-4">
          <Toggle label="Round off totals" description="Round the invoice total to the nearest rupee" checked={form.roundOff} onChange={(value) => set('roundOff', value)} />
          <Toggle label="Item prices include GST by default" description="You can still change this on each invoice" checked={form.pricesIncludeTax} onChange={(value) => set('pricesIncludeTax', value)} />
        </div>
      </Card>

      <Card title="Print Layout">
        <div className="space-y-5">
          <Toggle label="Show bank details" checked={form.showBankDetails} onChange={(value) => set('showBankDetails', value)} />
          <Toggle label="Show UPI payment QR code" description="Customers scan to pay the balance amount directly" checked={form.showUpiQr} onChange={(value) => set('showUpiQr', value)} />
          <Toggle label="Show authorised signature" checked={form.showSignature} onChange={(value) => set('showSignature', value)} />
          <div>
            <p className="label">Accent Colour</p>
            <div className="flex flex-wrap items-center gap-2">
              {THEME_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set('themeColor', color)}
                  className={cx('flex size-8 items-center justify-center rounded-full ring-offset-2 transition', form.themeColor === color && 'ring-2 ring-slate-400')}
                  style={{ backgroundColor: color }}
                  aria-label={`Use colour ${color}`}
                >
                  {form.themeColor === color && <CheckIcon className="size-4 text-white" />}
                </button>
              ))}
              <input type="color" value={form.themeColor} onChange={(event) => set('themeColor', event.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-300" aria-label="Custom colour" />
            </div>
          </div>
          <ImagePicker label="Authorised Signature" value={signature} onChange={setSignature} hint="Photo of your signature on white paper (PNG with transparent background is best)" boxClassName="h-16 w-48" />
        </div>
      </Card>

      <SaveBar saving={saving} label="Save Invoice Settings" />
    </form>
  );
}

/* --------------------------------------------------------------- Bank & UPI */

export function BankSettings() {
  const { user, setUser } = useAuth();
  const bank = user?.company?.bankDetails || {};
  const [form, setForm] = useState(() => ({
    accountHolder: bank.accountHolder || '',
    bankName: bank.bankName || '',
    branch: bank.branch || '',
    accountNumber: bank.accountNumber || '',
    ifscCode: bank.ifscCode || '',
    upiId: bank.upiId || ''
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const bind = (field, transform = (value) => value) => ({
    value: form[field],
    onChange: (event) => setForm((current) => ({ ...current, [field]: transform(event.target.value) }))
  });

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode)) next.ifscCode = 'IFSC should look like SBIN0001234';
    if (form.upiId && !/^[\w.-]{2,}@[a-zA-Z][a-zA-Z0-9.]{1,}$/.test(form.upiId.trim())) next.upiId = 'UPI ID should look like name@bank';
    if (form.accountNumber && !/^\d{6,20}$/.test(form.accountNumber.trim())) next.accountNumber = 'Account number should contain 6-20 digits';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const { data } = await api.put('/auth/company', { bankDetails: form });
      setUser(data.user);
      toast.success('Bank details saved');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const upiPreview = form.upiId && !errors.upiId ? `upi://pay?pa=${encodeURIComponent(form.upiId.trim())}&pn=${encodeURIComponent(user?.company?.name || '')}&cu=INR` : '';

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card title="Bank Account" subtitle="Printed on invoices so customers can pay by bank transfer">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Account Holder Name" placeholder={user?.company?.name} {...bind('accountHolder')} />
          <TextInput label="Bank Name" placeholder="State Bank of India" {...bind('bankName')} />
          <TextInput label="Account Number" inputMode="numeric" {...bind('accountNumber', (value) => value.replace(/\s/g, ''))} error={errors.accountNumber} />
          <TextInput label="IFSC Code" maxLength={11} {...bind('ifscCode', (value) => value.toUpperCase())} error={errors.ifscCode} />
          <TextInput label="Branch" {...bind('branch')} className="sm:col-span-2" />
        </div>
      </Card>

      <Card title="UPI" subtitle="A scannable UPI QR with the exact amount is printed on unpaid invoices">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <TextInput label="UPI ID" placeholder="yourbusiness@okhdfcbank" {...bind('upiId')} error={errors.upiId} className="flex-1" />
          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-3">
            {upiPreview ? <QRCodeSVG value={upiPreview} size={112} /> : <div className="flex size-28 items-center justify-center text-center text-xs text-slate-400">QR preview</div>}
            <p className="mt-1 text-[11px] text-slate-500">Preview</p>
          </div>
        </div>
      </Card>

      <SaveBar saving={saving} label="Save Bank Details" />
    </form>
  );
}

/* --------------------------------------------------------- Account & security */

export function AccountSettings() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(() => ({ name: user?.name || '', email: user?.email || '' }));
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState('');

  const saveProfile = async (event) => {
    event.preventDefault();
    const next = {};
    if (!profile.name.trim()) next.name = 'Name is required';
    if (!EMAIL_REGEX.test(profile.email.trim())) next.email = 'Enter a valid email address';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving('profile');
    try {
      const { data } = await api.put('/auth/profile', { name: profile.name.trim(), email: profile.email.trim() });
      setUser(data.user);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving('');
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const next = {};
    if (!passwords.currentPassword) next.currentPassword = 'Enter your current password';
    if (passwords.newPassword.length < 6) next.newPassword = 'Use at least 6 characters';
    if (passwords.newPassword !== passwords.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving('password');
    try {
      await api.put('/auth/password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={saveProfile} noValidate>
        <Card title="Your Profile" subtitle="Used to log in to your account">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Your Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} error={errors.name} />
            <TextInput label="Login Email" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} error={errors.email} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" loading={saving === 'profile'}>
              Update Profile
            </Button>
          </div>
        </Card>
      </form>

      <form onSubmit={changePassword} noValidate>
        <Card title="Change Password">
          <div className="grid gap-4 sm:grid-cols-3">
            <PasswordInput
              label="Current Password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
              error={errors.currentPassword}
            />
            <PasswordInput
              label="New Password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
              error={errors.newPassword}
            />
            <PasswordInput
              label="Confirm New Password"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })}
              error={errors.confirmPassword}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheckIcon className="size-4" /> Passwords are stored encrypted and never shared.
            </p>
            <Button type="submit" loading={saving === 'password'}>
              Change Password
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------ Backup & export */

export function BackupSettings() {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/auth/backup');
      downloadJson(`ebillsoft-backup-${todayInput()}.json`, data);
      toast.success('Backup downloaded');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const exports = [
    { label: 'Sales register', to: '/reports?tab=sales' },
    { label: 'GST summary (B2B, B2C, HSN)', to: '/reports?tab=gst' },
    { label: 'Receivables ageing', to: '/reports?tab=receivables' },
    { label: 'Stock summary', to: '/reports?tab=stock' },
    { label: 'Parties list', to: '/parties' },
    { label: 'Items list', to: '/items' }
  ];

  return (
    <div className="space-y-5">
      <Card title="Full Data Backup">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <ArchiveBoxIcon className="size-5" />
            </div>
            <p className="text-sm text-slate-600">
              Download a complete copy of your parties, items, invoices, quotations, purchases, payments and expenses as a JSON file. Keep it somewhere safe.
            </p>
          </div>
          <Button icon={ArrowDownTrayIcon} loading={busy} onClick={download}>
            Download Backup
          </Button>
        </div>
      </Card>

      <Card title="Export to Excel (CSV)">
        <p className="mb-4 text-sm text-slate-600">Every report and list has a CSV button that opens directly in Excel or Google Sheets.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {exports.map((item) => (
            <Button key={item.to} variant="secondary" icon={TableCellsIcon} to={item.to} className="justify-start">
              {item.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
