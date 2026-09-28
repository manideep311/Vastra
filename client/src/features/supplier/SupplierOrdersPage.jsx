import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { MapPinIcon, PhoneIcon } from '@heroicons/react/20/solid';
import { getSupplierOrders, updateOrderStatus } from '../../services/supplierService';
import { useToast } from '../../components/ui/Toast';
import StatusBadge from '../../components/ui/StatusBadge';
import OrderProgress from '../../components/OrderProgress';
import { ORDER_FLOW } from '../../utils/orderStatus';
import { EmptyState, ErrorState, Skeleton, Spinner } from '../../components/ui/States';
import { formatINR, formatQuantity } from '../../utils/pricing';
import { pluralizeUnit } from '../../utils/units';
import { getErrorMessage } from '../../utils/errors';

// What the supplier does next, phrased as the action rather than the state.
const NEXT_ACTION = {
  pending: 'Accept order',
  accepted: 'Start preparing',
  preparing: 'Mark ready to dispatch',
  ready_for_dispatch: 'Mark completed',
};

const TABS = [
  { value: 'new', label: 'New', match: (o) => o.status === 'pending' },
  { value: 'active', label: 'In progress', match: (o) => ['accepted', 'preparing', 'ready_for_dispatch'].includes(o.status) },
  { value: 'completed', label: 'Completed', match: (o) => o.status === 'completed' },
  { value: 'all', label: 'All', match: () => true },
];

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function SupplierOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('new');
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await getSupplierOrders();
      setOrders(data.orders);
      // Open on the most useful tab: new orders first, else work in progress.
      if (!data.orders.some(TABS[0].match)) setTab(data.orders.some(TABS[1].match) ? 'active' : 'all');
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load your orders."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.value, orders.filter(t.match).length])), [orders]);
  const visible = orders.filter(TABS.find((t) => t.value === tab).match);

  const handleAdvance = async (order) => {
    const nextStatus = ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1];
    if (!nextStatus || updatingId) return;
    setUpdatingId(order._id);
    try {
      const data = await updateOrderStatus(order._id, nextStatus);
      const next = orders.map((o) => (o._id === order._id ? data.order : o));
      setOrders(next);
      // Accepting the last new order would leave an empty tab — follow it instead.
      if (tab === 'new' && !next.some(TABS[0].match)) setTab('active');
      toast.success(`Order #${order._id.slice(-6).toUpperCase()} updated — the buyer has been notified`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't update this order."));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title">Orders</h1>
      <p className="mt-1 text-sm text-muted">Move each order forward — buyers get a notification at every step.</p>

      {status === 'loading' && (
        <div className="mt-6 space-y-4" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-60 w-full rounded-2xl" />
          ))}
        </div>
      )}
      {status === 'error' && <ErrorState message={error} onRetry={load} />}
      {status === 'ready' && orders.length === 0 && (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="No orders yet"
          description="When a buyer checks out with your products, the order lands here for you to accept."
          action={{ label: 'Review your listings', to: '/supplier/inventory' }}
        />
      )}

      {status === 'ready' && orders.length > 0 && (
        <>
          <div className="mt-6 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter orders">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                  tab === t.value ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-line-strong'
                }`}
              >
                {t.label}
                <span className={`tabular-nums ${tab === t.value ? 'text-white/60' : 'text-muted'}`}>{counts[t.value]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState compact title="Nothing in this view" description="Orders move between tabs as you update them." />
          ) : (
            <ul className="mt-5 space-y-4">
              {visible.map((order) => {
                const action = NEXT_ACTION[order.status];
                const busy = updatingId === order._id;
                return (
                  <li key={order._id} className="card animate-fade-up overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/50 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-ink">#{order._id.slice(-6).toUpperCase()}</span>
                        <span className="text-sm text-muted">{formatDate(order.createdAt)}</span>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="grid gap-6 px-5 py-5 md:grid-cols-5">
                      <div className="md:col-span-3">
                        <ul className="space-y-1.5 text-sm">
                          {order.items.map((item) => (
                            <li key={item.productId} className="flex justify-between gap-4">
                              <span className="min-w-0">
                                <span className="font-medium text-ink">{item.name}</span>
                                <span className="text-muted">
                                  {' '}
                                  · {formatQuantity(item.quantity)} {pluralizeUnit(item.unit, item.quantity)} × {formatINR(item.price)}
                                </span>
                              </span>
                              <span className="tabular-nums text-ink-2">{formatINR(item.price * item.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 flex justify-between border-t border-line pt-3 font-semibold text-ink">
                          <span>Order total</span>
                          <span className="price">{formatINR(order.total)}</span>
                        </p>
                      </div>
                      <div className="space-y-2 text-sm md:col-span-2">
                        <p className="eyebrow">Deliver to</p>
                        <p className="flex gap-2 text-ink-2">
                          <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
                          {order.shippingInfo?.address}
                        </p>
                        <p className="flex gap-2 text-ink-2">
                          <PhoneIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
                          <a href={`tel:${order.shippingInfo?.contact?.replace(/\s/g, '')}`} className="hover:text-ink hover:underline">
                            {order.shippingInfo?.contact}
                          </a>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="sm:w-80">
                        <OrderProgress order={order} />
                      </div>
                      {action ? (
                        <button type="button" onClick={() => handleAdvance(order)} disabled={busy || Boolean(updatingId)} className="btn btn-accent">
                          {busy && <Spinner />}
                          {busy ? 'Updating…' : action}
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-success">Fulfilled</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default SupplierOrdersPage;
