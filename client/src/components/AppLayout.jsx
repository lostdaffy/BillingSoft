import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsRightLeftIcon,
  Bars3Icon,
  ChartBarIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  HomeIcon,
  KeyIcon,
  PlusIcon,
  ShoppingCartIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../config';
import { cx } from '../lib/cx';
import { Avatar, Button, Dropdown, PageLoader } from './ui';

const NAVIGATION = [
  { items: [{ to: '/dashboard', label: 'Dashboard', icon: HomeIcon }] },
  {
    section: 'Sales',
    items: [
      { to: '/sales', label: 'Invoices', icon: DocumentTextIcon },
      { to: '/quotations', label: 'Quotations & Estimates', icon: DocumentDuplicateIcon },
      { to: '/payments', label: 'Payments', icon: ArrowsRightLeftIcon }
    ]
  },
  {
    section: 'Purchases',
    items: [
      { to: '/purchases', label: 'Purchase Bills', icon: ShoppingCartIcon },
      { to: '/expenses', label: 'Expenses', icon: WalletIcon }
    ]
  },
  {
    section: 'Masters',
    items: [
      { to: '/parties', label: 'Parties', icon: UsersIcon },
      { to: '/items', label: 'Items & Stock', icon: CubeIcon }
    ]
  },
  {
    section: 'Business',
    items: [
      { to: '/reports', label: 'Reports', icon: ChartBarIcon },
      { to: '/settings', label: 'Settings', icon: Cog6ToothIcon }
    ]
  }
];

const CREATE_ITEMS = [
  { label: 'New Invoice', to: '/sales/new', icon: DocumentTextIcon },
  { label: 'New Quotation', to: '/sales/new?type=QUOTATION', icon: DocumentDuplicateIcon },
  { label: 'New Purchase Bill', to: '/purchases/new', icon: ShoppingCartIcon },
  { label: 'Add Expense', to: '/expenses?new=1', icon: WalletIcon },
  { divider: true },
  { label: 'Add Party', to: '/parties?new=1', icon: UserPlusIcon },
  { label: 'Add Item', to: '/items?new=1', icon: CubeIcon }
];

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const company = user?.company || {};

  return (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" onClick={onNavigate} className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-5">
        <img src="/favicon.svg" alt="" className="size-8" />
        <span className="text-lg font-bold tracking-tight text-slate-900">{APP_NAME}</span>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAVIGATION.map((group, index) => (
          <div key={group.section || index}>
            {group.section && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{group.section}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cx('size-5 shrink-0', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')} />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <Link to="/settings" onClick={onNavigate} className="m-3 flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-200 hover:bg-brand-50/40">
        <Avatar name={company.name} src={company.logo} className="size-9 shrink-0 bg-white text-sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{company.name || 'My Business'}</p>
          <p className="truncate text-xs text-slate-500">{company.gstin ? `GSTIN ${company.gstin}` : 'Add GSTIN in settings'}</p>
        </div>
      </Link>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={closeMobile} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button type="button" onClick={closeMobile} className="absolute top-4 right-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
              <XMarkIcon className="size-5" />
            </button>
            <SidebarContent onNavigate={closeMobile} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMobileOpen(true)} className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <Bars3Icon className="size-6" />
          </button>
          <p className="truncate text-sm font-semibold text-slate-900 lg:hidden">{APP_NAME}</p>

          <div className="ml-auto flex items-center gap-2">
            <Dropdown
              trigger={({ toggle }) => (
                <Button icon={PlusIcon} onClick={toggle} size="md">
                  <span className="hidden sm:inline">Create New</span>
                </Button>
              )}
              items={CREATE_ITEMS}
            />
            <Dropdown
              trigger={({ toggle, open }) => (
                <button type="button" onClick={toggle} className={cx('flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-slate-100', open && 'bg-slate-100')}>
                  <Avatar name={user?.name} className="size-8 rounded-full text-xs" />
                  <span className="hidden max-w-32 truncate text-sm font-medium text-slate-700 md:block">{user?.name}</span>
                  <ChevronDownIcon className="hidden size-4 text-slate-400 md:block" />
                </button>
              )}
              items={[
                { label: user?.email || 'Account', icon: null, disabled: true },
                { divider: true },
                { label: 'Business Settings', to: '/settings', icon: Cog6ToothIcon },
                { label: 'Change Password', to: '/settings?tab=account', icon: KeyIcon },
                { divider: true },
                {
                  label: 'Log out',
                  icon: ArrowRightStartOnRectangleIcon,
                  danger: true,
                  onClick: () => {
                    logout();
                    navigate('/login');
                  }
                }
              ]}
            />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
