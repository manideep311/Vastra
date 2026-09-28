import { useCallback, useEffect, useState } from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { getMyOrders } from '../../services/orderService';
import StatusBadge from '../../components/ui/StatusBadge';
import OrderProgress from '../../components/OrderProgress';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { formatINR, formatQuantity } from '../../utils/pricing';
import { pluralizeUnit } from '../../utils/units';
import { getErrorMessage } from '../../utils/errors';

const FILTERS = [
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getMyOrders();
      setOrders(data.orders);
      // Nothing in progress? Show history instead of an empty tab.
      if (!data.orders.some((o) => o.status !== 'completed')) setFilter('all');
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load your orders."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = orders.filter((o) => (filter === 'all' ? true : filter === 'completed' ? o.status === 'completed' : o.status !== 'completed'));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title">Orders</h1>
      <p className="mt-1 text-sm text-muted">Track each supplier order from placement to dispatch.</p>

      {status === 'loading' && (
        <div className="mt-6 space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {status === 'error' && <ErrorState message={error} onRetry={load} />}

      {status === 'ready' && orders.length === 0 && (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="No orders yet"
          description="When you check out, each supplier’s order appears here with live status updates."
          action={{ label: 'Browse fabrics', to: '/products' }}
        />
      )}

      {status === 'ready' && orders.length > 0 && (
        <>
          <div className="mt-6 inline-flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Filter orders">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`h-8 rounded-full px-4 text-sm font-medium transition-colors ${filter === f.value ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState compact title="Nothing here" description={filter === 'active' ? 'All your orders are completed.' : 'No completed orders yet.'} />
          ) : (
            <ul className="mt-5 space-y-4">
              {visible.map((order) => (
                <li key={order._id} className="card animate-fade-up overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/50 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-ink">#{order._id.slice(-6).toUpperCase()}</span>
                      <span className="text-sm text-muted">{formatDate(order.createdAt)}</span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="px-5 py-5">
                    <OrderProgress order={order} />
                    <ul className="mt-5 space-y-1.5 text-sm">
                      {order.items.map((item) => (
                        <li key={item.productId} className="flex justify-between gap-4">
                          <span className="min-w-0 text-ink-2">
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
                    <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
                      <span className="truncate pr-4 text-xs text-muted">Ship to: {order.shippingInfo?.address}</span>
                      <span className="price whitespace-nowrap">{formatINR(order.total)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default OrdersPage;
