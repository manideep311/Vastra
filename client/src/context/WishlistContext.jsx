import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getWishlist, addToWishlist, removeFromWishlist } from '../services/wishlistService';
import { useBuyerAuth } from './BuyerAuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  // Wishlist is a Buyer-only feature — it never reads or reacts to Supplier auth.
  const { isLoggedIn } = useBuyerAuth();
  const [productIds, setProductIds] = useState(() => new Set());
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const pending = useRef(new Set()); // product ids with a request in flight
  const idsRef = useRef(productIds);
  useEffect(() => {
    idsRef.current = productIds;
  }, [productIds]);

  const applyServerList = useCallback((items) => {
    const list = items.filter(Boolean);
    setProducts(list);
    setProductIds(new Set(list.map((p) => p._id)));
  }, []);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setProducts([]);
      setProductIds(new Set());
      setStatus('idle');
      return;
    }
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const data = await getWishlist();
      applyServerList(data.wishlist?.productIds || []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [isLoggedIn, applyServerList]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Optimistic toggle: the heart flips instantly; the server response is the
  // source of truth afterwards, and a failure rolls the heart back.
  const toggleWishlist = useCallback(
    async (productId) => {
      if (pending.current.has(productId)) return;
      pending.current.add(productId);

      const wasWishlisted = idsRef.current.has(productId);
      setProductIds((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) next.delete(productId);
        else next.add(productId);
        return next;
      });

      try {
        const data = wasWishlisted ? await removeFromWishlist(productId) : await addToWishlist(productId);
        applyServerList(data.wishlist?.productIds || []);
        return !wasWishlisted;
      } catch (error) {
        setProductIds((prev) => {
          const next = new Set(prev);
          if (wasWishlisted) next.add(productId);
          else next.delete(productId);
          return next;
        });
        throw error;
      } finally {
        pending.current.delete(productId);
      }
    },
    [applyServerList]
  );

  const value = useMemo(
    () => ({
      productIds,
      products,
      loading: status === 'loading' || (isLoggedIn && status === 'idle'),
      error: status === 'error',
      toggleWishlist,
      refresh,
    }),
    [productIds, products, status, isLoggedIn, toggleWishlist, refresh]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => useContext(WishlistContext);
