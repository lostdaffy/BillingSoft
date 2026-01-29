import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  UsersIcon, 
  CubeIcon,
  Cog6ToothIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: HomeIcon },
    { path: '/invoices', label: 'Invoices', icon: DocumentTextIcon },
    { path: '/invoices/create', label: 'New Invoice', icon: PlusCircleIcon },
    { path: '/clients', label: 'Clients', icon: UsersIcon },
    { path: '/products', label: 'Products', icon: CubeIcon },
    { path: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 shadow-sm z-40">
      <nav className="p-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
