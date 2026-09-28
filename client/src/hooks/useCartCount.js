import { useEffect, useState } from 'react';
import { CART_CHANGED_EVENT, getCartCount } from '../services/cartService';
import { useBuyerAuth } from '../context/BuyerAuthContext';

// Number of distinct lines in the buyer's (or guest's) cart. Fetched once per
// sign-in state, then kept current by the events cartService fires after
// every successful write — no polling, no shared cart state.
export function useCartCount() {
  const { isLoggedIn } = useBuyerAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCartCount()
      .then((n) => !cancelled && setCount(n))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const onChange = (e) => setCount(e.detail.count);
    window.addEventListener(CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CART_CHANGED_EVENT, onChange);
  }, []);

  return count;
}
