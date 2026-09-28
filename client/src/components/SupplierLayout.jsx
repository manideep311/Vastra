import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSupplierAuth } from '../context/SupplierAuthContext';
import NotificationBell from './NotificationBell';
import Wordmark from './Wordmark';
import { PageLoader } from './ui/States';
import { ArrowRightStartOnRectangleIcon, Bars3Icon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

const LINKS = [
  { to: '/supplier', label: 'Dashboard', end: true },
  { to: '/supplier/inventory', label: 'Inventory', end: true },
  { to: '/supplier/orders', label: 'Orders' },
  { to: '/supplier/quotes', label: 'Quotes' },
  { to: '/supplier/profile', label: 'Profile' },
];

const desktopLink = ({ isActive }) =>
  `relative px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full ${
    isActive ? 'text-ink after:bg-accent' : 'text-ink-2 hover:text-ink after:bg-transparent'
  }`;

function SupplierLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useSupplierAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);

  const handleLogout = () => {
    logout();
    navigate('/supplier/login');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[80] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 supports-[backdrop-filter]:bg-canvas/85 supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-8">
            <Wordmark to="/supplier" tag="Supplier" showTagline={false} />
            <nav aria-label="Supplier" className="hidden items-center gap-1 lg:flex">
              {LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={desktopLink}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <NavLink to="/supplier/inventory/new" className="btn btn-sm btn-accent mr-1 hidden sm:inline-flex">
              <PlusIcon className="h-4 w-4" />
              Add product
            </NavLink>
            <NotificationBell role="supplier" />
            <div className="ml-2 hidden items-center gap-3 border-l border-line pl-3 lg:flex">
              <span className="hidden max-w-[160px] truncate text-sm text-muted xl:inline" title={user?.email}>
                {user?.email}
              </span>
              <button type="button" onClick={handleLogout} className="btn btn-sm btn-secondary">
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                Log out
              </button>
            </div>
            <button
              type="button"
              className="icon-btn lg:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="supplier-menu"
            >
              {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="supplier-menu" aria-label="Supplier" className="animate-fade-in border-t border-line bg-canvas px-4 pb-5 pt-2 lg:hidden">
            <ul>
              {[...LINKS, { to: '/supplier/inventory/new', label: 'Add product' }].map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `flex items-center justify-between border-b border-line py-3.5 text-[15px] font-medium ${isActive ? 'text-accent-strong' : 'text-ink'}`}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="truncate text-sm text-muted">{user?.email}</span>
              <button type="button" onClick={handleLogout} className="btn btn-sm btn-secondary">
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                Log out
              </button>
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-6 md:pt-10">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default SupplierLayout;
