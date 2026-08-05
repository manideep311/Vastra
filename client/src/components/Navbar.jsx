import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import NotificationBell from './NotificationBell';
import {
  HomeIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  HeartIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

// Nav sets per the buyer routing spec: guests see Home/Products/Cart/Login,
// logged-in buyers see Home/Products/Cart/Orders/Profile/Logout.
const GUEST_LINKS = [
  { to: '/home', label: 'Home', icon: HomeIcon, end: true },
  { to: '/products', label: 'Products', icon: Squares2X2Icon },
  { to: '/cart', label: 'Cart', icon: ShoppingCartIcon },
];

const BUYER_LINKS = [
  { to: '/home', label: 'Home', icon: HomeIcon, end: true },
  { to: '/products', label: 'Products', icon: Squares2X2Icon },
  { to: '/cart', label: 'Cart', icon: ShoppingCartIcon },
  { to: '/orders', label: 'Orders', icon: ClipboardDocumentListIcon },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon },
];

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isLoggedIn, logout } = useBuyerAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  const links = isLoggedIn ? BUYER_LINKS : GUEST_LINKS;

  return (
    <nav className="fixed top-4 inset-x-0 z-40 mx-auto w-[95%] max-w-6xl hidden md:block">
      <div className="transform-gpu backdrop-blur-xl bg-white/70 border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-900/5 px-6 transition-all duration-300">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/home" className="flex items-center gap-2 font-display text-xl font-bold text-slate-900 tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-800 flex items-center justify-center text-white text-sm font-extrabold">V</span>
            <span className="flex flex-col leading-none">
              <span className="font-serif-display tracking-wide">VASTRA</span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wide hidden lg:block">Where Tradition Meets Trade</span>
            </span>
          </NavLink>

          <div className="flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <>
                {/* Secondary utility links — preserved, not part of the primary nav set */}
                <NavLink to="/wishlist" aria-label="Wishlist" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-rose-500 transition-colors">
                  <HeartIcon className="w-4.5 h-4.5" />
                </NavLink>
                <NavLink to="/quotes" aria-label="My Quotes" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-emerald-700 transition-colors">
                  <DocumentTextIcon className="w-4.5 h-4.5" />
                </NavLink>
                <NotificationBell accent="violet" />
                <span className="text-slate-400 text-sm hidden lg:inline">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm bg-emerald-950 text-white px-4 py-2 rounded-full hover:bg-emerald-900 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Logout
                </button>
              </>
            )}
            {!isLoggedIn && (
              <NavLink
                to="/buyer/login"
                className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-950 text-white px-4 py-2 rounded-full hover:bg-emerald-900 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowRightIcon className="w-4 h-4" />
                Login
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
