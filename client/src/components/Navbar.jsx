import { NavLink, useNavigate } from 'react-router-dom';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import NotificationBell from './NotificationBell';
import Wordmark from './Wordmark';
import CartLink from './CartLink';
import { HeartIcon, DocumentTextIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

// Guests see Home/Products; signed-in buyers also get Orders/Profile.
const GUEST_LINKS = [
  { to: '/home', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
];

const BUYER_LINKS = [...GUEST_LINKS, { to: '/orders', label: 'Orders' }, { to: '/profile', label: 'Account' }];

const navLinkClass = ({ isActive }) =>
  `relative px-3 py-2 text-sm font-medium transition-colors duration-150 after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:transition-colors ${
    isActive ? 'text-ink after:bg-brand' : 'text-ink-2 hover:text-ink after:bg-transparent'
  }`;

const iconLinkClass = ({ isActive }) => `icon-btn ${isActive ? 'bg-brand-soft text-brand' : ''}`;

function Navbar() {
  const { user, isLoggedIn, logout } = useBuyerAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  const links = isLoggedIn ? BUYER_LINKS : GUEST_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 supports-[backdrop-filter]:bg-canvas/85 supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Wordmark showTagline="md" />
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {isLoggedIn && (
            <>
              <NavLink to="/quotes" aria-label="My quotes" title="My quotes" className={iconLinkClass}>
                <DocumentTextIcon className="h-5 w-5" />
              </NavLink>
              <NavLink to="/wishlist" aria-label="Wishlist" title="Wishlist" className={iconLinkClass}>
                <HeartIcon className="h-5 w-5" />
              </NavLink>
              <NotificationBell role="buyer" />
            </>
          )}
          <span className="hidden md:inline-flex">
            <CartLink />
          </span>

          {isLoggedIn ? (
            <div className="ml-2 hidden items-center gap-3 border-l border-line pl-3 md:flex">
              <span className="hidden max-w-[180px] truncate text-sm text-muted lg:inline" title={user?.email}>
                {user?.email}
              </span>
              <button type="button" onClick={handleLogout} className="btn btn-sm btn-secondary">
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                Log out
              </button>
            </div>
          ) : (
            <NavLink to="/buyer/login" className="btn btn-sm btn-primary ml-2 hidden md:inline-flex">
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
