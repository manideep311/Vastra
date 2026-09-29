import { memo, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import { getCart, updateCartItem, removeCartItem } from '../../services/cartService';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useToast } from '../../components/ui/Toast';
import ProductImage from '../../components/ui/ProductImage';
import QuantityStepper from '../../components/ui/QuantityStepper';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { unitAllowsDecimals, pluralizeUnit } from '../../utils/units';
import { effectiveMoq, formatINR, formatQuantity } from '../../utils/pricing';
import { getErrorMessage } from '../../utils/errors';

const CartLine = memo(function CartLine({ item, busy, onQuantity, onRemove }) {
  const product = item.productId;
  const unit = product.unit || 'unit';
  const moq = effectiveMoq(product);
  const [draft, setDraft] = useState(String(item.quantity));

  // Server is the source of truth — resync after every successful update.
  useEffect(() => setDraft(String(item.quantity)), [item.quantity]);

  const unavailable = product.status !== 'available' || product.stock <= 0;
  const overStock = !unavailable && item.quantity > product.stock;

  const commit = (next) => {
    if (next === item.quantity || !Number.isFinite(next) || next <= 0) {
      setDraft(String(item.quantity));
      return;
    }
    onQuantity(product._id, next, () => setDraft(String(item.quantity)));
  };

  return (
    <li className={`grid grid-cols-[4.5rem_1fr] gap-4 py-5 transition-opacity sm:grid-cols-[5.5rem_1fr_auto] ${busy ? 'opacity-60' : ''}`}>
      <Link to={`/products/${product._id}`} tabIndex={-1} aria-hidden="true">
        <ProductImage src={product.images?.[0]} width={250} className="aspect-square w-full rounded-xl" />
      </Link>

      <div className="min-w-0">
        <p className="eyebrow">{product.category}</p>
        <Link to={`/products/${product._id}`} className="mt-0.5 block font-display font-bold text-ink hover:text-brand">
          {product.name}
        </Link>
        <p className="mt-1 text-sm text-muted">
          <span className="font-semibold tabular-nums text-ink-2">{formatINR(item.priceAtAdd)}</span> per {unit}
          {item.quoteId && <span className="badge ml-2 bg-info-soft text-info">Quoted price</span>}
          {!item.quoteId && item.priceAtAdd < product.price && <span className="badge ml-2 bg-success-soft text-success">Bulk price</span>}
        </p>
        {moq > 1 && (
          <p className="mt-0.5 text-xs text-muted">
            Minimum order {formatQuantity(moq)} {pluralizeUnit(unit, moq)}
          </p>
        )}
        {(unavailable || overStock) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger">
            <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
            {unavailable ? 'No longer in stock — remove to check out' : `Only ${formatQuantity(product.stock)} ${pluralizeUnit(unit, product.stock)} left`}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 sm:hidden">
          <QuantityStepper
            size="sm"
            value={draft}
            onChange={setDraft}
            onCommit={commit}
            min={moq}
            max={product.stock || undefined}
            allowDecimals={unitAllowsDecimals(product.unit)}
            unit={unit}
            disabled={busy || unavailable}
            label={`Quantity of ${product.name}`}
          />
          <button type="button" onClick={() => onRemove(product)} disabled={busy} className="icon-btn h-8 w-8 text-muted hover:text-danger" aria-label={`Remove ${product.name}`}>
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="hidden flex-col items-end justify-between gap-3 sm:flex">
        <p className="price text-lg">{formatINR(item.priceAtAdd * item.quantity)}</p>
        <QuantityStepper
          size="sm"
          value={draft}
          onChange={setDraft}
          onCommit={commit}
          min={moq}
          max={product.stock || undefined}
          allowDecimals={unitAllowsDecimals(product.unit)}
          unit={unit}
          disabled={busy || unavailable}
          label={`Quantity of ${product.name}`}
        />
        <button type="button" onClick={() => onRemove(product)} disabled={busy} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-danger">
          <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" /> Remove
        </button>
      </div>
      <p className="price col-start-2 -mt-2 text-base sm:hidden">{formatINR(item.priceAtAdd * item.quantity)}</p>
    </li>
  );
});

function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-12" aria-busy="true" aria-label="Loading cart">
      <div className="space-y-6 lg:col-span-8">
        <Skeleton className="h-8 w-40" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-2xl lg:col-span-4" />
    </div>
  );
}

function CartPage() {
  const [cart, setCart] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { isLoggedIn } = useBuyerAuth();

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getCart();
      setCart(data.cart);
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load your cart."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleQuantity = useCallback(
    async (productId, quantity, revert) => {
      setBusyId(productId);
      try {
        const data = await updateCartItem(productId, quantity);
        setCart(data.cart);
      } catch (err) {
        revert();
        toast.error(getErrorMessage(err, "Couldn't update that quantity."));
      } finally {
        setBusyId(null);
      }
    },
    [toast]
  );

  const handleRemove = useCallback(
    async (product) => {
      setBusyId(product._id);
      try {
        const data = await removeCartItem(product._id);
        setCart(data.cart);
        toast.info(`Removed ${product.name}`);
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't remove that item."));
      } finally {
        setBusyId(null);
      }
    },
    [toast]
  );

  if (status === 'loading') return <CartSkeleton />;
  if (status === 'error') return <ErrorState message={error} onRetry={load} />;

  const items = (cart?.items || []).filter((item) => item.productId);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBagIcon}
        title="Your cart is empty"
        description="Add fabrics from the catalog — quantities start at each supplier’s minimum order."
        action={{ label: 'Browse fabrics', to: '/products' }}
      />
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const supplierCount = new Set(items.map((item) => item.productId.supplierId).filter(Boolean)).size;
  const blocked = items.some((item) => item.productId.status !== 'available' || item.productId.stock < item.quantity);

  const handleCheckout = () => {
    // Checkout requires a buyer account — guests sign in and come straight back.
    if (!isLoggedIn) navigate('/buyer/login', { state: { from: '/checkout' } });
    else navigate('/checkout');
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <section className="lg:col-span-8" aria-labelledby="cart-title">
        <h1 id="cart-title" className="page-title">
          Cart <span className="font-sans text-base font-normal text-muted">· {items.length} {items.length === 1 ? 'item' : 'items'}</span>
        </h1>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {items.map((item) => (
            <CartLine key={item.productId._id} item={item} busy={busyId === item.productId._id} onQuantity={handleQuantity} onRemove={handleRemove} />
          ))}
        </ul>
        <Link to="/products" className="mt-5 inline-block text-sm font-semibold text-brand hover:underline">
          Continue browsing
        </Link>
      </section>

      <aside className="lg:col-span-4" aria-label="Order summary">
        <div className="card p-6 lg:sticky lg:top-24">
          <h2 className="section-title">Order summary</h2>
          <dl className="mt-4">
            <div className="data-row">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatINR(subtotal)}</dd>
            </div>
            <div className="data-row">
              <dt>Shipping</dt>
              <dd className="font-normal text-muted">Arranged by supplier</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold text-ink">Total</span>
            <span className="price text-2xl">{formatINR(subtotal)}</span>
          </div>
          {supplierCount > 1 && (
            <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-xs leading-relaxed text-ink-2">
              These items come from {supplierCount} suppliers, so they’ll be placed as {supplierCount} separate orders.
            </p>
          )}
          <button type="button" onClick={handleCheckout} disabled={blocked || busyId !== null} className="btn btn-primary btn-lg mt-5 w-full">
            {isLoggedIn ? 'Proceed to checkout' : 'Sign in to check out'}
          </button>
          {blocked && <p className="field-error text-center">Update or remove the flagged items to continue.</p>}
          <p className="mt-3 text-center text-xs text-muted">Prices are confirmed against the live catalog when you place the order.</p>
        </div>
      </aside>
    </div>
  );
}

export default CartPage;
