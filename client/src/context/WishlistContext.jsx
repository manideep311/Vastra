import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWishlist, addToWishlist, removeFromWishlist } from '../services/wishlistService';
import { useBuyerAuth } from './BuyerAuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  // Wishlist is a Buyer-only feature — it never reads or reacts to Supplier auth.
  const { isLoggedIn } = useBuyerAuth();
  const [productIds, setProductIds] = useState(new Set());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    try {
      const data = await getWishlist();
      const items = data.wishlist?.productIds || [];
      setProducts(items);
      setProductIds(new Set(items.map((p) => p._id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isWishlisted = (productId) => productIds.has(productId);

  const toggleWishlist = async (productId) => {
    const wasWishlisted = productIds.has(productId);
    // optimistic update
    setProductIds((prev) => {
      const next = new Set(prev);
      wasWishlisted ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      if (wasWishlisted) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
      refresh();
    } catch (err) {
      console.error(err);
      refresh(); // revert to server truth on failure
    }
  };

  return (
    <WishlistContext.Provider value={{ productIds, products, loading, isWishlisted, toggleWishlist, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
