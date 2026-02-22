import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  UsersIcon, 
  CubeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { path: '/invoices', label: 'Invoices', icon: DocumentTextIcon },
    { path: '/clients', label: 'Clients', icon: UsersIcon },
    { path: '/products', label: 'Products', icon: CubeIcon },
    { path: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  const getActivePath = () => {
    if (location.pathname === '/') return '/';
    if (location.pathname.startsWith('/invoices')) return '/invoices';
    if (location.pathname.startsWith('/clients')) return '/clients';
    if (location.pathname.startsWith('/products')) return '/products';
    if (location.pathname.startsWith('/settings')) return '/settings';
    return location.pathname;
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200 shadow-sm z-40">
      <div className="p-6 space-y-2">
        {/* Search */}
        <div className="relative my-8">
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm placeholder-gray-500"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getActivePath() === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: navLinkActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border group hover:border-gray-300 hover:shadow-sm ${
                    isActive || navLinkActive
                      ? 'bg-indigo-600 text-white shadow-lg border-indigo-500 shadow-indigo-500/25'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                  }`
                }
              >
                {({ isActive: navLinkActive }) => (
                  <>
                    <Icon className={`w-5 h-5 transition-all ${isActive || navLinkActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    <span className="truncate">{item.label}</span>
                    {(isActive || navLinkActive) && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full shadow animate-pulse" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
