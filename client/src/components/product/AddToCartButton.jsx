import { useEffect, useRef, useState } from 'react';
import { CheckIcon, PlusIcon } from '@heroicons/react/20/solid';
import { Spinner } from '../ui/States';

/**
 * Add button with its own short-lived feedback: spinner while the request is
 * in flight, a check for a moment after success. Ignores repeat clicks while
 * busy so one tap never adds twice.
 */
function AddToCartButton({ onAdd, disabled, label = 'Add', soldOutLabel = 'Sold out', className = '', size = 'sm' }) {
  const [state, setState] = useState('idle'); // idle | adding | added
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'adding') return;
    setState('adding');
    const ok = await onAdd();
    if (ok) {
      setState('added');
      timer.current = setTimeout(() => setState('idle'), 1600);
    } else {
      setState('idle');
    }
  };

  if (disabled) {
    return (
      <span className={`btn ${size === 'sm' ? 'btn-sm' : ''} pointer-events-none border border-line bg-surface-2 text-muted ${className}`}>
        {soldOutLabel}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={state === 'adding'}
      className={`btn ${size === 'sm' ? 'btn-sm' : ''} min-w-[5.5rem] ${state === 'added' ? 'bg-success text-white hover:bg-success' : 'btn-primary'} ${className}`}
    >
      {state === 'adding' && <Spinner className="h-3.5 w-3.5" />}
      {state === 'added' && <CheckIcon className="h-4 w-4 animate-pop" />}
      {state === 'idle' && <PlusIcon className="h-4 w-4" />}
      <span>{state === 'added' ? 'Added' : label}</span>
    </button>
  );
}

export default AddToCartButton;
