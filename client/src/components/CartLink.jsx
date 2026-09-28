import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { ShoppingBagIcon as ShoppingBagSolid } from '@heroicons/react/24/solid';
import { useCartCount } from '../hooks/useCartCount';

// Cart entry with a live line-count badge that gives a small "pop" whenever
// something is added — the visible confirmation that add-to-cart worked.
function CartLink({ variant = 'top' }) {
  const count = useCartCount();
  const previous = useRef(count);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    if (count > previous.current) setBump((b) => b + 1);
    previous.current = count;
  }, [count]);

  const label = count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart';
  const badge = count > 0 && (
    <span
      key={bump}
      className={`absolute flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-canvas ${
        bump ? 'animate-pop' : ''
      } ${variant === 'bottom' ? '-right-2.5 -top-1' : '-right-1 -top-1'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );

  if (variant === 'bottom') {
    return (
      <NavLink to="/cart" aria-label={label} className={({ isActive }) => `flex flex-col items-center gap-0.5 ${isActive ? 'text-brand' : 'text-muted'}`}>
        {({ isActive }) => (
          <>
            <span className="relative">
              {isActive ? <ShoppingBagSolid className="h-6 w-6" /> : <ShoppingBagIcon className="h-6 w-6" />}
              {badge}
            </span>
            <span className="text-[11px] font-medium">Cart</span>
          </>
        )}
      </NavLink>
    );
  }

  return (
    <NavLink
      to="/cart"
      aria-label={label}
      className={({ isActive }) => `icon-btn relative ${isActive ? 'bg-brand-soft text-brand' : ''}`}
    >
      <ShoppingBagIcon className="h-5 w-5" />
      {badge}
    </NavLink>
  );
}

export default CartLink;
