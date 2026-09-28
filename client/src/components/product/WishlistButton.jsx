import { useState } from 'react';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

// Heart toggle with a short pop on save. aria-pressed conveys the state.
function WishlistButton({ active, onToggle, productName, className = '', size = 'md' }) {
  const [popKey, setPopKey] = useState(0);
  const dims = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const icon = size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!active) setPopKey((k) => k + 1);
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      className={`inline-flex ${dims} flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
        active ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink'
      } ${className}`}
    >
      <span key={popKey} className={popKey ? 'animate-pop' : ''}>
        {active ? <HeartSolid className={icon} /> : <HeartOutline className={icon} />}
      </span>
    </button>
  );
}

export default WishlistButton;
