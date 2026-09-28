import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addToCart } from '../services/cartService';
import { useWishlist } from '../context/WishlistContext';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import { useToast } from '../components/ui/Toast';
import { effectiveMoq, formatQuantity } from '../utils/pricing';
import { pluralizeUnit } from '../utils/units';
import { getErrorMessage } from '../utils/errors';

/**
 * Stable add-to-cart / wishlist handlers for any product list. The callbacks
 * never change identity, so memoized rows don't re-render when unrelated
 * state (another row's wishlist heart, a toast) changes.
 */
export function useProductActions() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useBuyerAuth();
  const wishlist = useWishlist();
  const { toggleWishlist } = wishlist;

  // Read at click time, so the callbacks don't change on every filter/URL change.
  const returnTo = useRef('');
  useEffect(() => {
    returnTo.current = location.pathname + location.search;
  }, [location.pathname, location.search]);

  // Quick-add uses the product's minimum order quantity, so a single click
  // always produces a valid cart line instead of an MOQ error.
  const quickAdd = useCallback(
    async (product) => {
      const quantity = effectiveMoq(product);
      try {
        await addToCart(product._id, quantity);
        const qtyText = `${formatQuantity(quantity)} ${pluralizeUnit(product.unit, quantity)}`;
        toast.success(`${qtyText} of ${product.name} added${quantity > 1 ? ' (minimum order)' : ''}`, {
          action: { label: 'View cart', to: '/cart' },
        });
        return true;
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't add that to your cart."));
        return false;
      }
    },
    [toast]
  );

  const onToggleWishlist = useCallback(
    async (product) => {
      if (!isLoggedIn) {
        navigate('/buyer/login', { state: { from: returnTo.current } });
        return;
      }
      try {
        const saved = await toggleWishlist(product._id);
        if (saved !== undefined) toast.info(saved ? 'Saved to your wishlist' : 'Removed from your wishlist', saved ? { action: { label: 'View', to: '/wishlist' } } : undefined);
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't update your wishlist."));
      }
    },
    [isLoggedIn, navigate, toggleWishlist, toast]
  );

  return useMemo(() => ({ quickAdd, onToggleWishlist, wishlistIds: wishlist.productIds }), [quickAdd, onToggleWishlist, wishlist.productIds]);
}
