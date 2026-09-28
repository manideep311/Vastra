import { NavLink } from 'react-router-dom';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import CartLink from './CartLink';
import { HomeIcon, Squares2X2Icon, ClipboardDocumentListIcon, UserCircleIcon, ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid,
  Squares2X2Icon as ProductsSolid,
  ClipboardDocumentListIcon as OrdersSolid,
  UserCircleIcon as ProfileSolid,
} from '@heroicons/react/24/solid';

const HOME = { to: '/home', label: 'Home', icon: HomeIcon, activeIcon: HomeSolid, end: true };
const PRODUCTS = { to: '/products', label: 'Products', icon: Squares2X2Icon, activeIcon: ProductsSolid };

const GUEST_LINKS = [HOME, PRODUCTS, 'cart', { to: '/buyer/login', label: 'Sign in', icon: ArrowRightEndOnRectangleIcon, activeIcon: ArrowRightEndOnRectangleIcon }];

const BUYER_LINKS = [
  HOME,
  PRODUCTS,
  'cart',
  { to: '/orders', label: 'Orders', icon: ClipboardDocumentListIcon, activeIcon: OrdersSolid },
  { to: '/profile', label: 'Account', icon: UserCircleIcon, activeIcon: ProfileSolid },
];

function BottomNav() {
  const { isLoggedIn } = useBuyerAuth();
  const links = isLoggedIn ? BUYER_LINKS : GUEST_LINKS;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] supports-[backdrop-filter]:backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-around">
        {links.map((link) =>
          link === 'cart' ? (
            <li key="cart" className="flex w-16 justify-center">
              <CartLink variant="bottom" />
            </li>
          ) : (
            <li key={link.to} className="flex w-16 justify-center">
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) => `flex flex-col items-center gap-0.5 transition-colors ${isActive ? 'text-brand' : 'text-muted'}`}
              >
                {({ isActive }) => {
                  const Icon = isActive ? link.activeIcon : link.icon;
                  return (
                    <>
                      <Icon className="h-6 w-6" />
                      <span className="text-[11px] font-medium">{link.label}</span>
                    </>
                  );
                }}
              </NavLink>
            </li>
          )
        )}
      </ul>
    </nav>
  );
}

export default BottomNav;
