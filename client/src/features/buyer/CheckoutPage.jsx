import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { getCart, CART_CHANGED_EVENT } from '../../services/cartService';
import { checkout } from '../../services/orderService';
import { getBuyerProfile, addAddress } from '../../services/buyerService';
import StatusBadge from '../../components/ui/StatusBadge';
import { EmptyState, ErrorState, InlineError, Skeleton, Spinner } from '../../components/ui/States';
import { formatINR, formatQuantity } from '../../utils/pricing';
import { pluralizeUnit } from '../../utils/units';
import { getErrorMessage } from '../../utils/errors';

const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+86', '+61'];

const orderRef = (id) => `#${id.slice(-6).toUpperCase()}`;

// Splits a stored "+91 9876543210" back into its parts for prefilling.
const splitContact = (contact = '') => {
  const match = contact.match(/^(\+\d{1,4})\s*(\d+)$/);
  return match && COUNTRY_CODES.includes(match[1]) ? { code: match[1], number: match[2] } : { code: '+91', number: contact.replace(/\D/g, '') };
};

function Confirmation({ orders }) {
  const total = orders.reduce((sum, o) => sum + o.total, 0);
  return (
    <div className="mx-auto max-w-xl animate-fade-up py-6 text-center">
      <CheckCircleIcon className="mx-auto h-14 w-14 text-success" aria-hidden="true" />
      <h1 className="page-title mt-4">Order placed</h1>
      <p className="mt-2 text-sm text-muted">
        {orders.length > 1
          ? `Your order was split into ${orders.length} orders, one per supplier. Each supplier will confirm theirs separately.`
          : 'The supplier has been notified and will confirm your order shortly.'}
      </p>

      <ul className="mt-8 space-y-3 text-left">
        {orders.map((order) => (
          <li key={order._id} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-ink">Order {orderRef(order._id)}</span>
              <StatusBadge status={order.status} />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-4 text-ink-2">
                  <span className="min-w-0 truncate">
                    {item.name} <span className="text-muted">× {formatQuantity(item.quantity)} {pluralizeUnit(item.unit, item.quantity)}</span>
                  </span>
                  <span className="tabular-nums">{formatINR(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between px-1 text-sm font-semibold text-ink">
        <span>Total</span>
        <span className="price text-lg">{formatINR(total)}</span>
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/orders" className="btn btn-primary">
          Track orders
        </Link>
        <Link to="/products" className="btn btn-secondary">
          Continue sourcing
        </Link>
      </div>
    </div>
  );
}

function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ address: '', countryCode: '+91', phone: '', saveAddress: true });
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [placedOrders, setPlacedOrders] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [cartData, profileData] = await Promise.all([getCart(), getBuyerProfile().catch(() => null)]);
      setCart(cartData.cart);
      const saved = profileData?.profile?.addresses || [];
      const preferred = saved.find((a) => a.isDefault) || saved[0];
      if (preferred) {
        const { code, number } = splitContact(preferred.contact);
        setForm((f) => ({ ...f, address: f.address || preferred.address, countryCode: code, phone: f.phone || number, saveAddress: false }));
        setHasSavedAddress(true);
      }
      setStatus('ready');
    } catch (err) {
      setLoadError(getErrorMessage(err, "We couldn't load your cart."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const errors = {
    address: form.address.trim().length < 10 ? 'Enter the full delivery address (at least 10 characters).' : '',
    phone: form.phone.length < 7 || form.phone.length > 15 ? 'Enter a valid phone number (7–15 digits).' : '',
  };
  const isValid = !errors.address && !errors.phone;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setTouched({ address: true, phone: true });
    if (!isValid || submitting) return;
    setSubmitError('');
    setSubmitting(true);
    const shippingInfo = { address: form.address.trim(), contact: `${form.countryCode} ${form.phone}` };
    try {
      const data = await checkout(shippingInfo);
      if (form.saveAddress && !hasSavedAddress) {
        addAddress({ ...shippingInfo, label: 'Default', isDefault: true }).catch(() => {});
      }
      setPlacedOrders(data.orders);
      window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { count: 0 } }));
      window.scrollTo({ top: 0 });
    } catch (err) {
      // Form stays filled in so the buyer can fix the cart and retry.
      setSubmitError(getErrorMessage(err, "We couldn't place your order."));
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrders) return <Confirmation orders={placedOrders} />;
  if (status === 'loading') {
    return (
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-12" aria-busy="true">
        <Skeleton className="h-80 rounded-2xl lg:col-span-7" />
        <Skeleton className="h-64 rounded-2xl lg:col-span-5" />
      </div>
    );
  }
  if (status === 'error') return <ErrorState message={loadError} onRetry={load} />;

  const items = (cart?.items || []).filter((item) => item.productId);
  if (items.length === 0) {
    return <EmptyState icon={ShoppingBagIcon} title="Nothing to check out" description="Your cart is empty." action={{ label: 'Browse fabrics', to: '/products' }} />;
  }

  const subtotal = items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const supplierCount = new Set(items.map((item) => item.productId.supplierId).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/cart" className="text-sm font-medium text-muted hover:text-ink">
        ← Back to cart
      </Link>
      <h1 className="page-title mt-3">Checkout</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        <form onSubmit={handlePlaceOrder} className="space-y-6 lg:col-span-7" noValidate>
          <InlineError>
            {submitError && (
              <>
                {submitError}{' '}
                <Link to="/cart" className="font-semibold underline">
                  Review cart
                </Link>
              </>
            )}
          </InlineError>

          <fieldset className="card space-y-5 p-6">
            <legend className="sr-only">Delivery details</legend>
            <h2 className="section-title">Delivery details</h2>
            <div>
              <label htmlFor="checkout-address" className="label">
                Delivery address
              </label>
              <textarea
                id="checkout-address"
                rows={3}
                maxLength={500}
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                aria-invalid={Boolean(touched.address && errors.address)}
                aria-describedby="checkout-address-error"
                placeholder="Warehouse / unit, street, city, PIN code"
                className="input"
              />
              {touched.address && errors.address && (
                <p id="checkout-address-error" className="field-error">
                  {errors.address}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="checkout-phone" className="label">
                Contact number
              </label>
              <div className="flex gap-2">
                <label htmlFor="checkout-country" className="sr-only">
                  Country code
                </label>
                <select
                  id="checkout-country"
                  value={form.countryCode}
                  onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value }))}
                  className="input w-24"
                >
                  {COUNTRY_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <input
                  id="checkout-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={15}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  aria-invalid={Boolean(touched.phone && errors.phone)}
                  aria-describedby="checkout-phone-error"
                  placeholder="98765 43210"
                  className="input flex-1"
                />
              </div>
              {touched.phone && errors.phone && (
                <p id="checkout-phone-error" className="field-error">
                  {errors.phone}
                </p>
              )}
            </div>
            {!hasSavedAddress && (
              <label className="flex items-center gap-2.5 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={form.saveAddress}
                  onChange={(e) => setForm((f) => ({ ...f, saveAddress: e.target.checked }))}
                  className="h-4 w-4 rounded border-line-strong accent-[var(--color-brand)]"
                />
                Save as my default delivery address
              </label>
            )}
          </fieldset>

          <p className="text-xs leading-relaxed text-muted">
            No payment is taken now. Each supplier confirms availability and arranges dispatch and invoicing directly with you.
          </p>

          <button type="submit" disabled={submitting} className="btn btn-primary btn-lg w-full">
            {submitting && <Spinner />}
            {submitting ? 'Placing order…' : `Place order · ${formatINR(subtotal)}`}
          </button>
        </form>

        <aside className="lg:col-span-5" aria-label="Order review">
          <div className="card p-6 lg:sticky lg:top-24">
            <h2 className="section-title">Order review</h2>
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.productId._id} className="flex justify-between gap-4 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{item.productId.name}</span>
                    <span className="text-xs text-muted">
                      {formatQuantity(item.quantity)} {pluralizeUnit(item.productId.unit, item.quantity)} × {formatINR(item.priceAtAdd)}
                    </span>
                  </span>
                  <span className="tabular-nums text-ink-2">{formatINR(item.priceAtAdd * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-semibold text-ink">Total</span>
              <span className="price text-2xl">{formatINR(subtotal)}</span>
            </div>
            {supplierCount > 1 && <p className="mt-3 text-xs text-muted">Placed as {supplierCount} orders — one per supplier.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default CheckoutPage;
