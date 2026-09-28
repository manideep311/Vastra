import { HeartIcon } from '@heroicons/react/24/outline';
import { useWishlist } from '../../context/WishlistContext';
import { useProductActions } from '../../hooks/useProductActions';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import { EmptyState, ErrorState } from '../../components/ui/States';

function WishlistPage() {
  const { products, loading, error, refresh } = useWishlist();
  const { quickAdd, onToggleWishlist, wishlistIds } = useProductActions();

  return (
    <div>
      <h1 className="page-title">Wishlist</h1>
      <p className="mt-1 text-sm text-muted">Fabrics you’ve saved to compare or order later.</p>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="We couldn't load your wishlist." onRetry={refresh} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={HeartIcon}
          title="Nothing saved yet"
          description="Tap the heart on any fabric to keep it here while you compare suppliers."
          action={{ label: 'Browse fabrics', to: '/products' }}
        />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              wishlisted={wishlistIds.has(product._id)}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={quickAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;
