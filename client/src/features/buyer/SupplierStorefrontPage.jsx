import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckBadgeIcon, MapPinIcon, StarIcon } from '@heroicons/react/20/solid';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { getPublicSupplier } from '../../services/supplierService';
import { useProductActions } from '../../hooks/useProductActions';
import { useSlowLoading } from '../../hooks/useSlowLoading';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import { EmptyState, ErrorState, LoadingSeam, Skeleton } from '../../components/ui/States';
import { getErrorMessage } from '../../utils/errors';

// Public storefront: who the supplier is and what they currently list.
function SupplierStorefrontPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [error, setError] = useState('');
  const { quickAdd, onToggleWishlist, wishlistIds } = useProductActions();
  const slowLoading = useSlowLoading(status === 'loading');

  const load = useCallback(
    async (signal) => {
      setStatus('loading');
      try {
        setData(await getPublicSupplier(id, { signal }));
        setStatus('ready');
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        if (err.response?.status === 404 || err.response?.status === 400) {
          setStatus('notfound');
          return;
        }
        setError(getErrorMessage(err, "We couldn't load this supplier."));
        setStatus('error');
      }
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (status === 'notfound') {
    return (
      <EmptyState
        icon={BuildingStorefrontIcon}
        title="This supplier isn't on Vastra"
        description="The link may be out of date. Browse the catalog to find fabrics from other suppliers."
        action={{ label: 'Browse the catalog', to: '/products' }}
      />
    );
  }
  if (status === 'error') return <ErrorState message={error} onRetry={() => load()} />;

  const profile = data?.profile;
  const products = data?.products || [];
  const specialities = [...new Set([...(profile?.productCategories || []), ...(profile?.fabricTypesOffered || [])])];

  return (
    <div>
      {slowLoading && <LoadingSeam className="mb-4" />}

      <header className="rounded-2xl border border-line bg-surface p-6 md:p-8">
        <p className="eyebrow">Supplier</p>
        {status === 'loading' ? (
          <div className="mt-2 space-y-3" aria-hidden="true">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        ) : (
          <>
            <h1 className="page-title mt-1 flex items-center gap-2">
              {profile.businessName}
              {profile.isVerified && <CheckBadgeIcon className="h-6 w-6 text-brand" aria-label="Verified supplier" />}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              {profile.businessType && <span>{profile.businessType}</span>}
              {profile.businessAddress && (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                  {profile.businessAddress}
                </span>
              )}
              {profile.ratingCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <StarIcon className="h-4 w-4 text-accent" aria-hidden="true" />
                  {profile.ratingAverage.toFixed(1)} · {profile.ratingCount} rating{profile.ratingCount === 1 ? '' : 's'}
                </span>
              )}
            </p>

            <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 text-sm">
              <div>
                <dt className="text-muted">Fabrics listed</dt>
                <dd className="font-display text-lg font-bold tabular-nums text-ink">{data.productCount}</dd>
              </div>
              <div>
                <dt className="text-muted">Orders completed</dt>
                <dd className="font-display text-lg font-bold tabular-nums text-ink">{profile.completedOrders || 0}</dd>
              </div>
              {profile.operatingHours && (
                <div>
                  <dt className="text-muted">Hours</dt>
                  <dd className="font-medium text-ink">{profile.operatingHours}</dd>
                </div>
              )}
            </dl>

            {profile.about && <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink-2">{profile.about}</p>}

            {specialities.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Specialities">
                {specialities.map((s) => (
                  <li key={s} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-2">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </header>

      <section className="mt-10" aria-labelledby="storefront-products">
        <h2 id="storefront-products" className="section-title">
          Fabrics from this supplier
        </h2>
        {status === 'ready' && data.productCount > products.length && (
          <p className="mt-0.5 text-sm text-muted">
            Showing the {products.length} newest of {data.productCount} listings
          </p>
        )}

        {status === 'ready' && products.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">
            This supplier has no fabrics listed right now.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {status === 'loading'
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.map((product, i) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    eager={i < 4}
                    wishlisted={wishlistIds.has(product._id)}
                    onToggleWishlist={onToggleWishlist}
                    onAddToCart={quickAdd}
                  />
                ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SupplierStorefrontPage;
