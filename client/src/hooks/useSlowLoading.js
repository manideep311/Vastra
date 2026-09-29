import { useEffect, useState } from 'react';

// True once `active` has stayed true for `delay` ms — used to explain a long
// wait (e.g. the hosted API waking from sleep) instead of an endless skeleton.
export function useSlowLoading(active, delay = 5000) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);

  return slow;
}
