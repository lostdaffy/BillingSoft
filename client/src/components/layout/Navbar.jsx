import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';  // ✅ useNavigate ONLY from react-router-dom
import { useState } from 'react';                // ✅ useState from REACT
import { BellIcon, ChevronDownIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);  // ✅ Now works!

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowDropdown(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm z-50">
      <div className="px-8 py-4 max-w-8xl mx-auto flex items-center justify-between">
        {/* Logo & Company */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <i className="ri-receipt-fill text-indigo-600 mr-2"></i>
              BillingSoft
            </h1>
            {user?.company?.name && (
              <p className="text-sm text-gray-600 font-medium">{user.company.name}</p>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all relative">
            <BellIcon className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-xs text-white rounded-full flex items-center justify-center font-bold">3</span>
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block text-right min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-indigo-600">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <ChevronDownIcon className={`w-4 h-4 transition-all ${showDropdown ? 'rotate-180' : ''} text-gray-500 group-hover:text-indigo-600`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                {/* Profile Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-semibold text-sm">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all font-medium rounded-xl mx-1"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
