import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/20/solid';
import { Squares2X2Icon } from '@heroicons/react/24/outline';
import { getProducts, getProductCategoryStats } from '../../services/productService';
import { useProductActions } from '../../hooks/useProductActions';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSlowLoading } from '../../hooks/useSlowLoading';
import ProductRow, { ProductRowSkeleton } from '../../components/product/ProductRow';
import { EmptyState, ErrorState, SlowServerNotice, Spinner } from '../../components/ui/States';
import { getErrorMessage } from '../../utils/errors';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

function ProductsPage() {
  // Filters live in the URL: shareable, and Back restores the exact view.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.get('sort')) ? searchParams.get('sort') : 'newest';

  const [searchInput, setSearchInput] = useState(query);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [status, setStatus] = useState('loading'); // loading | refreshing | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const requestRef = useRef(null);

  const { quickAdd, onToggleWishlist, wishlistIds } = useProductActions();
  const slowLoading = useSlowLoading(status === 'loading');

  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Typing settles for 350ms before it becomes a request. Only a *new*
  // debounced value is pushed, so Back/chip navigation is never overwritten.
  const lastPushed = useRef(query);
  useEffect(() => {
    if (debouncedSearch === lastPushed.current) return;
    lastPushed.current = debouncedSearch;
    updateParams({ q: debouncedSearch });
  }, [debouncedSearch, updateParams]);

  // Keep the box in sync when the URL changes from outside (Back, chip links).
  useEffect(() => {
    lastPushed.current = query;
    setSearchInput((current) => (current.trim() === query ? current : query));
  }, [query]);

  useEffect(() => {
    getProductCategoryStats()
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  const fetchPage = useCallback(
    async (page) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;

      const params = { page, limit: PAGE_SIZE, sort };
      if (query) params.keyword = query;
      if (category) params.category = category;

      const data = await getProducts(params, { signal: controller.signal });
      return data;
    },
    [query, category, sort]
  );

  const load = useCallback(async () => {
    // Keep current results on screen (dimmed) while a new filter loads —
    // only the very first load shows skeleton rows.
    setStatus((s) => (s === 'ready' || s === 'refreshing' ? 'refreshing' : 'loading'));
    setError('');
    try {
      const data = await fetchPage(1);
      setProducts(data.products);
      setPagination(data.pagination);
      setStatus('ready');
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
      setError(getErrorMessage(err, "We couldn't load the catalog."));
      setStatus('error');
    }
  }, [fetchPage]);

  useEffect(() => {
    load();
    return () => requestRef.current?.abort();
  }, [load]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPage(pagination.page + 1);
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        return [...prev, ...data.products.filter((p) => !seen.has(p._id))];
      });
      setPagination(data.pagination);
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err, "Couldn't load more products."));
    } finally {
      setLoadingMore(false);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    updateParams({ q: '', category: '', sort: '' });
  };

  const hasFilters = Boolean(query || category);
  const remaining = pagination.total - products.length;

  return (
    <div>
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Catalog</p>
        <h1 className="page-title">Fabrics</h1>
        <p className="text-sm text-muted">
          {status === 'loading'
            ? 'Loading the catalog…'
            : hasFilters
              ? 'Compare price, minimum order and lead time across suppliers.'
              : `${pagination.total.toLocaleString('en-IN')} ${pagination.total === 1 ? 'fabric' : 'fabrics'} from textile suppliers across India`}
        </p>
      </header>

      {/* Toolbar */}
      <div className="sticky top-16 z-20 -mx-4 mt-6 border-b border-line bg-canvas/95 px-4 pb-3 pt-3 supports-[backdrop-filter]:backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-none">
        <div className="flex gap-2">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ q: searchInput.trim() });
            }}
          >
            <label htmlFor="catalog-search" className="sr-only">
              Search fabrics
            </label>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="catalog-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by fabric, weave or use — e.g. “linen shirting”"
              className="input rounded-full pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
              maxLength={100}
              autoComplete="off"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateParams({ q: '' });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Clear search"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </form>
          <label htmlFor="catalog-sort" className="sr-only">
            Sort by
          </label>
          <div className="relative">
            <AdjustmentsHorizontalIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted sm:hidden" aria-hidden="true" />
            <select
              id="catalog-sort"
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? '' : e.target.value })}
              className="input w-11 appearance-none rounded-full pl-9 text-transparent sm:w-48 sm:pl-4 sm:text-ink"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="text-ink">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by category">
            {[{ category: '', count: null }, ...categories].map((c) => {
              const active = c.category === category;
              return (
                <button
                  key={c.category || 'all'}
                  type="button"
                  onClick={() => updateParams({ category: c.category })}
                  aria-pressed={active}
                  className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150 ${
                    active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {c.category || 'All fabrics'}
                  {c.count !== null && <span className={`tabular-nums ${active ? 'text-white/60' : 'text-muted'}`}>{c.count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {hasFilters && status !== 'loading' && status !== 'error' && (
        <p className="mt-4 text-sm text-ink-2" aria-live="polite">
          {pagination.total} {pagination.total === 1 ? 'result' : 'results'}
          {query && (
            <>
              {' '}
              for <span className="font-semibold text-ink">“{query}”</span>
            </>
          )}
          {category && (
            <>
              {' '}
              in <span className="font-semibold text-ink">{category}</span>
            </>
          )}
          <button type="button" onClick={clearFilters} className="ml-3 font-semibold text-brand hover:underline">
            Clear filters
          </button>
        </p>
      )}

      <section
        aria-label="Products"
        aria-busy={status === 'loading' || status === 'refreshing'}
        className={`mt-4 transition-opacity duration-200 ${status === 'refreshing' ? 'opacity-60' : 'opacity-100'}`}
      >
        {status === 'error' ? (
          <div className="card">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : status === 'loading' ? (
          <>
          {slowLoading && <SlowServerNotice className="mb-4" />}
          <ul className="card divide-y divide-line overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductRowSkeleton key={i} />
            ))}
          </ul>
          </>
        ) : products.length === 0 ? (
          <div className="card">
            {hasFilters ? (
              <EmptyState
                icon={MagnifyingGlassIcon}
                title="No fabrics match those filters"
                description="Try a broader term like “cotton”, or remove the category filter. You can also ask the assistant to find something similar."
                action={{ label: 'Clear filters', onClick: clearFilters }}
              />
            ) : (
              <EmptyState icon={Squares2X2Icon} title="The catalog is empty" description="Suppliers haven't listed any fabrics yet. Check back soon." />
            )}
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {products.map((product) => (
              <ProductRow
                key={product._id}
                product={product}
                wishlisted={wishlistIds.has(product._id)}
                onToggleWishlist={onToggleWishlist}
                onAddToCart={quickAdd}
              />
            ))}
          </ul>
        )}
      </section>

      {status === 'ready' && remaining > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button type="button" onClick={handleLoadMore} disabled={loadingMore} className="btn btn-secondary">
            {loadingMore && <Spinner />}
            {loadingMore ? 'Loading…' : `Show ${Math.min(PAGE_SIZE, remaining)} more`}
          </button>
          <p className="text-xs text-muted">
            Showing {products.length} of {pagination.total}
          </p>
        </div>
      )}
      {error && status === 'ready' && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}

export default ProductsPage;
