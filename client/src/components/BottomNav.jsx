import { NavLink } from 'react-router-dom';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import {
  HomeIcon,
  Squares2X2Icon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid,
  Squares2X2Icon as ProductsSolid,
  ShoppingCartIcon as CartSolid,
  ClipboardDocumentListIcon as OrdersSolid,
  UserCircleIcon as ProfileSolid,
} from '@heroicons/react/24/solid';

const GUEST_LINKS = [
  { to: '/home', label: 'Home', icon: HomeIcon, activeIcon: HomeSolid, end: true },
  { to: '/products', label: 'Products', icon: Squares2X2Icon, activeIcon: ProductsSolid },
  { to: '/cart', label: 'Cart', icon: ShoppingCartIcon, activeIcon: CartSolid },
  { to: '/buyer/login', label: 'Login', icon: ArrowRightIcon, activeIcon: ArrowRightIcon },
];

const BUYER_LINKS = [
  { to: '/home', label: 'Home', icon: HomeIcon, activeIcon: HomeSolid, end: true },
  { to: '/products', label: 'Products', icon: Squares2X2Icon, activeIcon: ProductsSolid },
  { to: '/cart', label: 'Cart', icon: ShoppingCartIcon, activeIcon: CartSolid },
  { to: '/orders', label: 'Orders', icon: ClipboardDocumentListIcon, activeIcon: OrdersSolid },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon, activeIcon: ProfileSolid },
];

function BottomNav() {
  const { isLoggedIn } = useBuyerAuth();
  const links = isLoggedIn ? BUYER_LINKS : GUEST_LINKS;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-white/85 border-t border-slate-200/70 pb-safe">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all duration-200 ${
                isActive ? 'text-emerald-700' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => {
              const Icon = isActive ? link.activeIcon : link.icon;
              return (
                <>
                  <Icon className="w-6 h-6" />
                  <span className="text-[11px] font-medium">{link.label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
