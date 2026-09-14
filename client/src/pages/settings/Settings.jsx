import { useSearchParams } from 'react-router-dom';
import { ArchiveBoxIcon, BuildingOfficeIcon, CreditCardIcon, DocumentTextIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useDocumentTitle } from '../../lib/hooks';
import { PageHeader, Tabs } from '../../components/ui';
import { AccountSettings, BackupSettings, BankSettings, BusinessProfileSettings, InvoiceSettings } from './SettingsSections';

const TABS = [
  { value: 'business', label: 'Business Profile', icon: BuildingOfficeIcon },
  { value: 'invoice', label: 'Invoice Settings', icon: DocumentTextIcon },
  { value: 'bank', label: 'Bank & UPI', icon: CreditCardIcon },
  { value: 'account', label: 'Account & Security', icon: LockClosedIcon },
  { value: 'backup', label: 'Backup & Export', icon: ArchiveBoxIcon }
];

export default function Settings() {
  useDocumentTitle('Settings');
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((item) => item.value === params.get('tab')) ? params.get('tab') : 'business';

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="Business profile, invoice preferences and your account" />
      <Tabs tabs={TABS} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} className="mb-6" />
      {tab === 'business' && <BusinessProfileSettings />}
      {tab === 'invoice' && <InvoiceSettings />}
      {tab === 'bank' && <BankSettings />}
      {tab === 'account' && <AccountSettings />}
      {tab === 'backup' && <BackupSettings />}
    </div>
  );
}
