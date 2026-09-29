import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CheckBadgeIcon, StarIcon } from '@heroicons/react/20/solid';
import ProductImage from '../ui/ProductImage';
import WishlistButton from './WishlistButton';
import AddToCartButton from './AddToCartButton';
import StockIndicator from './StockIndicator';
import { stockLevel } from '../../utils/stock';
import { formatINR, formatQuantity } from '../../utils/pricing';
import { pluralizeUnit } from '../../utils/units';

// Composition · GSM · width — the specs a buyer scans first.
const specLine = (p) =>
  [p.fabricComposition, p.gsm && `${p.gsm} GSM`, p.fabricWidth && `${p.fabricWidth} wide`].filter(Boolean).join(' · ');

/**
 * One line of the dense catalog list. Memoized with plain props (the parent
 * passes `wishlisted` and stable callbacks), so toggling one heart or adding
 * one item re-renders only that row.
 */
function ProductRow({ product, wishlisted, onToggleWishlist, onAddToCart }) {
  const href = `/products/${product._id}`;
  const unit = product.unit || 'unit';
  const soldOut = stockLevel(product) === 'out';
  const specs = specLine(product);

  return (
    <li className="group relative grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors duration-150 hover:bg-surface-2/60 sm:grid-cols-[5rem_1fr_9rem_8.5rem] sm:px-5 lg:grid-cols-[5rem_1fr_10rem_9rem_auto]">
      <Link to={href} tabIndex={-1} aria-hidden="true" className="row-span-2 sm:row-span-1">
        <ProductImage
          src={product.images?.[0]}
          width={160}
          className="aspect-square w-full rounded-xl"
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
      </Link>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="eyebrow truncate">{product.category}</p>
          {product.ratingCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-ink-2">
              <StarIcon className="h-3 w-3 text-accent" aria-hidden="true" />
              {product.ratingAverage.toFixed(1)}
              <span className="font-normal text-muted">({product.ratingCount})</span>
            </span>
          )}
        </div>
        <Link to={href} className="mt-0.5 block truncate font-display text-[15px] font-bold text-ink after:absolute after:inset-0 after:content-[''] sm:after:hidden hover:text-brand">
          {product.name}
        </Link>
        {specs && <p className="mt-0.5 truncate text-xs text-ink-2">{specs}</p>}
        {product.supplier?.businessName && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
            {product.supplier.businessName}
            {product.supplier.isVerified && <CheckBadgeIcon className="h-3.5 w-3.5 flex-shrink-0 text-brand" aria-label="Verified supplier" />}
          </p>
        )}
      </div>

      {/* Terms: MOQ, lead time, stock */}
      <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-start">
        <span className="text-ink-2">
          <span className="text-muted">MOQ </span>
          <span className="font-semibold tabular-nums">{product.moq > 1 ? `${formatQuantity(product.moq)} ${pluralizeUnit(unit, product.moq)}` : 'None'}</span>
        </span>
        {product.leadTime && (
          <span className="hidden text-ink-2 lg:inline">
            <span className="text-muted">Ships in </span>
            {product.leadTime}
          </span>
        )}
        <StockIndicator product={product} showQuantity={false} />
      </div>

      {/* Price */}
      <div className="col-start-3 row-start-1 text-right sm:col-start-4">
        <p className="price text-lg leading-none">{formatINR(product.price)}</p>
        <p className="mt-1 text-xs text-muted">per {unit}</p>
      </div>

      {/* Actions */}
      <div className="relative z-10 col-start-3 row-start-2 flex items-center justify-end gap-2 sm:col-span-3 sm:col-start-2 sm:row-start-2 lg:col-span-1 lg:col-start-5 lg:row-start-1">
        <WishlistButton active={wishlisted} onToggle={() => onToggleWishlist(product)} productName={product.name} />
        <AddToCartButton disabled={soldOut} onAdd={() => onAddToCart(product)} />
      </div>
    </li>
  );
}

export default memo(ProductRow);

export function ProductRowSkeleton() {
  return (
    <li className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 px-4 py-4 sm:grid-cols-[5rem_1fr_9rem_8.5rem] sm:px-5" aria-hidden="true">
      <div className="skeleton aspect-square w-full rounded-xl" />
      <div className="space-y-2">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton h-4 w-3/5" />
        <div className="skeleton h-3 w-2/5" />
      </div>
      <div className="hidden space-y-2 sm:block">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-16" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="skeleton h-5 w-16" />
        <div className="skeleton h-3 w-10" />
      </div>
    </li>
  );
}
