import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { getMyProducts, deleteProduct, updateProduct } from '../../services/productService';
import { useToast } from '../../components/ui/Toast';
import Dialog from '../../components/ui/Dialog';
import ProductImage from '../../components/ui/ProductImage';
import StockIndicator from '../../components/product/StockIndicator';
import { stockLevel } from '../../utils/stock';
import { EmptyState, ErrorState, Skeleton, Spinner } from '../../components/ui/States';
import { formatINR, formatQuantity } from '../../utils/pricing';
import { getErrorMessage } from '../../utils/errors';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const matchesFilter = (product, filter) => {
  const level = stockLevel(product);
  if (filter === 'live') return level !== 'out';
  if (filter === 'low') return level === 'low';
  if (filter === 'out') return level === 'out';
  return true;
};

// Accessible on/off switch for "visible to buyers".
function ListingSwitch({ product, busy, onToggle }) {
  const live = product.status === 'available';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={live}
      aria-label={`${product.name} visible to buyers`}
      onClick={() => onToggle(product)}
      disabled={busy}
      className="inline-flex items-center gap-2 text-xs font-medium text-ink-2 disabled:opacity-50"
    >
      <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ${live ? 'bg-success' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${live ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </span>
      {busy ? <Spinner className="h-3.5 w-3.5" /> : live ? 'Live' : 'Hidden'}
    </button>
  );
}

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await getMyProducts();
      setProducts(data.products);
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load your inventory."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(
      (p) => matchesFilter(p, filter) && (!term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term))
    );
  }, [products, filter, search]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.value, products.filter((p) => matchesFilter(p, f.value)).length])), [products]);

  const toggleStatus = async (product) => {
    const newStatus = product.status === 'available' ? 'out_of_stock' : 'available';
    setBusyId(product._id);
    try {
      const data = await updateProduct(product._id, { status: newStatus });
      setProducts((list) => list.map((p) => (p._id === product._id ? { ...p, ...data.product } : p)));
      toast.success(newStatus === 'available' ? `${product.name} is live` : `${product.name} is hidden from buyers`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't update this listing."));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteProduct(pendingDelete._id);
      setProducts((list) => list.filter((p) => p._id !== pendingDelete._id));
      toast.success(`Deleted ${pendingDelete.name}`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete this product."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="mt-1 text-sm text-muted">
            {status === 'ready' ? `${products.length} product${products.length === 1 ? '' : 's'} · ${counts.live} live` : 'Your product listings'}
          </p>
        </div>
        <Link to="/supplier/inventory/new" className="btn btn-accent">
          <PlusIcon className="h-4 w-4" />
          Add product
        </Link>
      </div>

      {status === 'error' && <ErrorState message={error} onRetry={load} />}

      {status === 'loading' && (
        <div className="mt-6 space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {status === 'ready' && products.length === 0 && (
        <EmptyState
          icon={ArchiveBoxIcon}
          title="No products listed yet"
          description="Add your first fabric with its price, MOQ and stock — buyers can find and order it immediately."
          action={{ label: 'Add your first product', to: '/supplier/inventory/new' }}
        />
      )}

      {status === 'ready' && products.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter inventory">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  aria-pressed={filter === f.value}
                  className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                    filter === f.value ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-line-strong'
                  }`}
                >
                  {f.label}
                  <span className={`tabular-nums ${filter === f.value ? 'text-white/60' : 'text-muted'}`}>{counts[f.value]}</span>
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <label htmlFor="inventory-search" className="sr-only">
                Search your products
              </label>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input id="inventory-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="input h-10 rounded-full pl-10" />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState compact title="No products match" description="Try another filter or search term." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="mt-4 hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th scope="col" className="px-5 py-3 font-medium">Product</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">MOQ</th>
                      <th scope="col" className="px-4 py-3 font-medium">Stock</th>
                      <th scope="col" className="px-4 py-3 font-medium">Listing</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((product) => (
                      <tr key={product._id} className="transition-colors hover:bg-surface-2/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <ProductImage src={product.images?.[0]} width={120} className="h-11 w-11 flex-shrink-0 rounded-lg" />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-ink">{product.name}</p>
                              <p className="text-xs text-muted">{product.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">
                          {formatINR(product.price)}
                          <span className="text-muted">/{product.unit || 'unit'}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink-2">{product.moq > 1 ? formatQuantity(product.moq) : '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StockIndicator product={product} />
                        </td>
                        <td className="px-4 py-3">
                          <ListingSwitch product={product} busy={busyId === product._id} onToggle={toggleStatus} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <Link to={`/supplier/inventory/${product._id}/edit`} className="icon-btn h-8 w-8" aria-label={`Edit ${product.name}`}>
                              <PencilSquareIcon className="h-4 w-4" />
                            </Link>
                            <button type="button" onClick={() => setPendingDelete(product)} className="icon-btn h-8 w-8 hover:text-danger" aria-label={`Delete ${product.name}`}>
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface md:hidden">
                {visible.map((product) => (
                  <li key={product._id} className="flex gap-3 p-4">
                    <ProductImage src={product.images?.[0]} width={160} className="h-16 w-16 flex-shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate font-semibold text-ink">{product.name}</p>
                        <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
                          {formatINR(product.price)}
                          <span className="font-normal text-muted">/{product.unit || 'unit'}</span>
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <StockIndicator product={product} />
                        {product.moq > 1 && <span className="text-xs text-muted">MOQ {formatQuantity(product.moq)}</span>}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <ListingSwitch product={product} busy={busyId === product._id} onToggle={toggleStatus} />
                        <div className="flex gap-1">
                          <Link to={`/supplier/inventory/${product._id}/edit`} className="icon-btn h-9 w-9" aria-label={`Edit ${product.name}`}>
                            <PencilSquareIcon className="h-4 w-4" />
                          </Link>
                          <button type="button" onClick={() => setPendingDelete(product)} className="icon-btn h-9 w-9 hover:text-danger" aria-label={`Delete ${product.name}`}>
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        size="sm"
        title="Delete this product?"
        description={pendingDelete ? `“${pendingDelete.name}” will be removed from the catalog and from buyers’ carts. Past orders keep their record.` : ''}
      >
        <div className="flex gap-2">
          <button type="button" onClick={() => setPendingDelete(null)} disabled={deleting} className="btn btn-secondary flex-1" data-autofocus>
            Keep it
          </button>
          <button type="button" onClick={confirmDelete} disabled={deleting} className="btn flex-1 bg-danger text-white hover:bg-[#8f1c13]">
            {deleting && <Spinner />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

export default InventoryPage;
