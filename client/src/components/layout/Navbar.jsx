import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDownIcon, 
  UserIcon 
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm z-50">
      <div className="px-6 py-4 max-w-8xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">BillingSoft</h1>
          {user?.company?.name && (
            <span className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1 rounded-full">
              {user.company.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 cursor-pointer group relative" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <UserIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="hidden md:block">
              <p className="font-semibold text-sm text-gray-900 leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-500 leading-tight">{user?.email}</p>
            </div>
            <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
