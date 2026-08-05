import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSupplierAuth } from '../context/SupplierAuthContext';
import NotificationBell from './NotificationBell';
import {
  Squares2X2Icon,
  ArchiveBoxIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Primary nav per the supplier routing spec.
const PRIMARY_LINKS = [
  { to: '/supplier', label: 'Dashboard', icon: Squares2X2Icon, end: true },
  { to: '/supplier/inventory', label: 'My Products', icon: ArchiveBoxIcon },
  { to: '/supplier/inventory/new', label: 'Add Product', icon: PlusCircleIcon },
  { to: '/supplier/orders', label: 'Orders', icon: ClipboardDocumentListIcon },
];

// Preserved secondary features — reachable via compact icon links rather
// than cluttering the primary nav.
const SECONDARY_LINKS = [
  { to: '/supplier/quotes', label: 'Quotes', icon: DocumentTextIcon },
  { to: '/supplier/profile', label: 'Profile', icon: UserCircleIcon },
];

function SupplierLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useSupplierAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/supplier/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-[#fdfbf8] to-[#fdfbf8]">
      <nav className="fixed top-4 inset-x-0 z-40 mx-auto w-[95%] max-w-6xl">
        <div className="transform-gpu backdrop-blur-xl bg-white/70 border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-900/5 px-6">
          <div className="flex items-center justify-between h-16">
            <NavLink to="/supplier" className="font-display text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-emerald-800 flex items-center justify-center text-white text-sm font-extrabold">V</span>
              <span className="flex flex-col leading-none">
                <span className="flex items-center gap-2">
                  <span className="font-serif-display tracking-wide">VASTRA</span> <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Supplier</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400 tracking-wide hidden lg:block">Where Tradition Meets Trade</span>
              </span>
            </NavLink>

            <div className="hidden md:flex items-center gap-1">
              {PRIMARY_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {SECONDARY_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  aria-label={link.label}
                  className={({ isActive }) =>
                    `w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50 hover:text-amber-700'
                    }`
                  }
                >
                  <link.icon className="w-4.5 h-4.5" />
                </NavLink>
              ))}
              <NotificationBell accent="amber" />
              <span className="text-slate-400 text-sm hidden lg:inline">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm bg-emerald-950 text-white px-4 py-2 rounded-full hover:bg-emerald-900 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Logout
              </button>
            </div>

            <button className="md:hidden p-2 text-slate-700" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              {menuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>

          <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col gap-1">
              {[...PRIMARY_LINKS, ...SECONDARY_LINKS].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-600'
                    }`
                  }
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm bg-emerald-950 text-white px-4 py-2.5 rounded-xl w-fit mt-2">
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 pt-28 pb-12">
        <Outlet />
      </main>
    </div>
  );
}

export default SupplierLayout;
