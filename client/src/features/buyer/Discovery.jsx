import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, ArrowRightIcon } from '@heroicons/react/20/solid';
import { getProducts, getProductCategoryStats } from '../../services/productService';
import { useProductActions } from '../../hooks/useProductActions';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import { ErrorState, SlowServerNotice } from '../../components/ui/States';
import { useSlowLoading } from '../../hooks/useSlowLoading';
import { getErrorMessage } from '../../utils/errors';

const HOW_IT_WORKS = [
  { title: 'Clear minimums', body: 'Every listing shows its MOQ up front, and the cart enforces it — no surprises at checkout.' },
  { title: 'Bulk quotes', body: 'Need a large run? Request a quote and negotiate price and lead time directly with the supplier.' },
  { title: 'Tiered pricing', body: 'Per-unit prices drop automatically as your quantity crosses a supplier’s bulk tiers.' },
];

function Discovery() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const { quickAdd, onToggleWishlist, wishlistIds } = useProductActions();
  const slowLoading = useSlowLoading(status === 'loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [productData, categoryData] = await Promise.all([
        getProducts({ limit: 8, sort: 'newest' }),
        getProductCategoryStats().catch(() => ({ categories: [] })),
      ]);
      setProducts(productData.products);
      setCategories(categoryData.categories.slice(0, 8));
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load the marketplace."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <div>
      {/* Intro band */}
      <section className="relative -mx-4 overflow-hidden bg-brand-strong text-white md:mx-0 md:rounded-3xl">
        <picture>
          <source media="(min-width: 768px)" srcSet="/hero-fabric-patchwork.webp" type="image/webp" />
          <img
            src="/hero-fabric-patchwork-768.webp"
            alt=""
            width="768"
            height="512"
            fetchPriority="high"
            className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-35 md:w-3/5 md:opacity-90 md:[mask-image:linear-gradient(to_right,transparent,black_35%)]"
          />
        </picture>
        <div className="relative max-w-xl px-6 py-12 md:px-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/90">Vastra marketplace</p>
          <h1 className="mt-3 font-serif-display text-[2.1rem] font-semibold leading-[1.1] md:text-5xl">
            Source fabric straight <span className="italic text-amber-100">from the mill.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-emerald-50/80">
            Compare prices, minimums and lead times across Indian textile suppliers — then order or request a bulk quote.
          </p>
          <form onSubmit={handleSearch} role="search" className="mt-8 flex max-w-md gap-2 rounded-full bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            <label htmlFor="home-search" className="sr-only">
              Search fabrics
            </label>
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="home-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try “organic cotton poplin”"
                maxLength={100}
                className="h-10 w-full rounded-full bg-transparent pl-10 pr-3 text-sm text-ink outline-none placeholder:text-muted/80"
              />
            </div>
            <button type="submit" className="btn btn-primary h-10">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mt-12" aria-labelledby="home-categories">
          <div className="flex items-end justify-between">
            <h2 id="home-categories" className="section-title">
              Shop by fibre
            </h2>
            <Link to="/products" className="text-sm font-semibold text-brand hover:underline">
              Full catalog
            </Link>
          </div>
          <ul className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {categories.map((c) => (
              <li key={c.category} className="flex-shrink-0">
                <Link
                  to={`/products?category=${encodeURIComponent(c.category)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-2 transition-colors hover:border-ink/30 hover:text-ink"
                >
                  {c.category}
                  <span className="text-xs tabular-nums text-muted">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* New arrivals */}
      <section className="mt-12" aria-labelledby="home-new">
        <div className="flex items-end justify-between">
          <div>
            <h2 id="home-new" className="section-title">
              New in the catalog
            </h2>
            <p className="mt-0.5 text-sm text-muted">Recently listed by suppliers</p>
          </div>
          <Link to="/products" className="hidden items-center gap-1 text-sm font-semibold text-brand hover:underline sm:inline-flex">
            View all <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {slowLoading && <SlowServerNotice className="mt-5" />}
        {status === 'error' ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {status === 'loading'
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
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

        <Link to="/products" className="btn btn-secondary mt-8 w-full sm:hidden">
          Browse all fabrics
        </Link>
      </section>

      {/* How buying works */}
      <section className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3" aria-label="How buying on Vastra works">
        {HOW_IT_WORKS.map((item, i) => (
          <div key={item.title} className="bg-surface p-6">
            <p className="font-serif-display text-2xl text-accent">0{i + 1}</p>
            <h3 className="mt-3 font-display text-base font-bold text-ink">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Discovery;
