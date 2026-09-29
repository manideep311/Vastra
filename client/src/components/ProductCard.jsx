import { memo } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/20/solid';
import ProductImage from './ui/ProductImage';
import WishlistButton from './product/WishlistButton';
import AddToCartButton from './product/AddToCartButton';
import StockIndicator from './product/StockIndicator';
import { stockLevel } from '../utils/stock';
import { formatINR, formatQuantity } from '../utils/pricing';
import { pluralizeUnit } from '../utils/units';

/**
 * Image-led card for curated grids (home, wishlist, similar products).
 * Takes plain props so it can be memoized — see useProductActions.
 */
function ProductCard({ product, wishlisted, onToggleWishlist, onAddToCart, eager = false }) {
  const href = `/products/${product._id}`;
  const unit = product.unit || 'unit';
  const soldOut = stockLevel(product) === 'out';

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <Link to={href} tabIndex={-1} aria-hidden="true" className="block">
          <ProductImage
            src={product.images?.[0]}
            eager={eager}
            width={500}
            className="aspect-[4/5] w-full rounded-2xl"
            imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        </Link>
        {onToggleWishlist && (
          <div className="absolute right-3 top-3">
            <WishlistButton active={wishlisted} onToggle={() => onToggleWishlist(product)} productName={product.name} className="shadow-sm" />
          </div>
        )}
        {soldOut && <span className="badge absolute left-3 top-3 bg-surface/95 text-danger shadow-sm">Out of stock</span>}
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow truncate">{product.category}</p>
          {product.ratingCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-ink-2">
              <StarIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              {product.ratingAverage.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="mt-1 line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink">
          <Link to={href} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-muted">
          {product.moq > 1 ? `MOQ ${formatQuantity(product.moq)} ${pluralizeUnit(unit, product.moq)}` : 'No minimum order'}
          {product.supplier?.businessName && ` · ${product.supplier.businessName}`}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="price text-lg leading-none">
              {formatINR(product.price)}
              <span className="ml-1 font-sans text-xs font-normal text-muted">/{unit}</span>
            </p>
            {!soldOut && <StockIndicator product={product} showQuantity={false} className="mt-1.5" />}
          </div>
          {onAddToCart && <AddToCartButton disabled={soldOut} onAdd={() => onAddToCart(product)} />}
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[4/5] w-full rounded-2xl" />
      <div className="space-y-2 pt-3.5">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton mt-3 h-5 w-20" />
      </div>
    </div>
  );
}
