import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import { getSupplierDashboard } from '../../services/supplierService';
import StatusBadge from '../../components/ui/StatusBadge';
import { ErrorState, Skeleton } from '../../components/ui/States';
import { formatINR, formatQuantity } from '../../utils/pricing';
import { pluralizeUnit } from '../../utils/units';
import { getErrorMessage } from '../../utils/errors';

const DAY_MS = 24 * 60 * 60 * 1000;

// The API only returns days that had orders; fill the gaps with zeros so the
// chart shows a true 30-day timeline instead of stretching sparse bars.
const buildTimeline = (salesOverTime = []) => {
  const byDate = new Map(salesOverTime.map((d) => [d.date, d]));
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * DAY_MS).toISOString().slice(0, 10);
    return { date, revenue: byDate.get(date)?.revenue || 0, orders: byDate.get(date)?.orders || 0 };
  });
};

const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function SalesChart({ timeline }) {
  const max = Math.max(...timeline.map((d) => d.revenue), 1);
  const total = timeline.reduce((sum, d) => sum + d.revenue, 0);
  const orders = timeline.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="price text-2xl">{formatINR(total)}</p>
          <p className="text-xs text-muted">
            {orders} order{orders === 1 ? '' : 's'} in the last 30 days
          </p>
        </div>
      </div>
      <div className="mt-5 flex h-32 items-end gap-[3px]" role="img" aria-label={`Revenue over the last 30 days: ${formatINR(total)} from ${orders} orders`}>
        {timeline.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${shortDate(d.date)} · ${formatINR(d.revenue)}`}>
            <div
              className={`w-full rounded-t-[3px] transition-colors ${d.revenue > 0 ? 'bg-brand group-hover:bg-brand-strong' : 'bg-line'}`}
              style={{ height: d.revenue > 0 ? `${Math.max((d.revenue / max) * 100, 6)}%` : '3px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{shortDate(timeline[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function SupplierDashboardPage() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await getSupplierDashboard());
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load your dashboard."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = useMemo(() => buildTimeline(data?.salesOverTime), [data]);

  if (status === 'error') return <ErrorState message={error} onRetry={load} />;

  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-8 h-24 w-full rounded-2xl" />
        <div className="mt-8 grid gap-8 lg:grid-cols-5">
          <Skeleton className="h-64 rounded-2xl lg:col-span-3" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const outOfStock = data.inventoryAlerts.filter((p) => p.stock <= 0).length;
  const attention = [
    data.pendingOrders > 0 && { to: '/supplier/orders', text: `${data.pendingOrders} new order${data.pendingOrders === 1 ? '' : 's'} waiting for acceptance` },
    data.pendingQuotes > 0 && { to: '/supplier/quotes', text: `${data.pendingQuotes} quote request${data.pendingQuotes === 1 ? '' : 's'} need a price` },
    outOfStock > 0 && { to: '/supplier/inventory', text: `${outOfStock} product${outOfStock === 1 ? ' is' : 's are'} out of stock and hidden from buyers` },
  ].filter(Boolean);

  const metrics = [
    { label: 'Live listings', value: `${data.activeProducts}`, sub: `of ${data.totalProducts} products` },
    { label: 'Pending orders', value: data.pendingOrders, sub: 'awaiting acceptance' },
    { label: 'Open quotes', value: data.pendingQuotes ?? 0, sub: 'need a response' },
    { label: 'Low stock', value: data.inventoryAlerts.length, sub: '20 units or fewer' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Supplier</p>
          <h1 className="page-title mt-1">Overview</h1>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-4">
        {metrics.map((m, i) => (
          <div key={m.label} className={`px-5 py-4 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b lg:border-b-0' : ''} border-line lg:border-r lg:last:border-r-0`}>
            <dt className="text-xs font-medium text-muted">{m.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{m.value}</dd>
            <dd className="text-xs text-muted">{m.sub}</dd>
          </div>
        ))}
      </dl>

      {attention.length > 0 && (
        <section className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft/60 p-4" aria-labelledby="needs-attention">
          <h2 id="needs-attention" className="flex items-center gap-2 text-sm font-semibold text-accent-strong">
            <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" /> Needs attention
          </h2>
          <ul className="mt-2 divide-y divide-accent/15">
            {attention.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="flex items-center justify-between gap-3 py-2 text-sm text-ink hover:text-accent-strong">
                  {item.text}
                  <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3" aria-labelledby="sales-heading">
          <h2 id="sales-heading" className="section-title">
            Sales
          </h2>
          <div className="mt-4">
            <SalesChart timeline={timeline} />
          </div>
        </section>

        <section className="card p-6 lg:col-span-2" aria-labelledby="top-heading">
          <h2 id="top-heading" className="section-title">
            Best sellers
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Your best-selling fabrics will appear here after your first orders.</p>
          ) : (
            <ol className="mt-3">
              {data.topProducts.map((p, i) => (
                <li key={p.name} className="data-row">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-4 text-xs font-bold tabular-nums text-muted">{i + 1}</span>
                    <span className="truncate text-ink">{p.name}</span>
                  </span>
                  <span className="whitespace-nowrap text-right">
                    <span className="block font-medium tabular-nums text-ink">{formatINR(p.revenue)}</span>
                    <span className="block text-xs text-muted">{formatQuantity(p.unitsSold)} sold</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-labelledby="recent-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-heading" className="section-title">
              Recent orders
            </h2>
            <Link to="/supplier/orders" className="text-sm font-semibold text-accent-strong hover:underline">
              All orders
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-6 py-8 text-center text-sm text-muted">
              No orders yet. Complete listings with clear MOQs and lead times convert best.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th scope="col" className="px-4 py-2.5 font-medium">Order</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Items</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-semibold text-ink">#{order._id.slice(-6).toUpperCase()}</span>
                        <span className="block text-xs text-muted">{shortDate(order.createdAt)}</span>
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-ink-2">{order.items.map((i) => i.name).join(', ')}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">{formatINR(order.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="lg:col-span-2" aria-labelledby="stock-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="stock-heading" className="section-title">
              Low stock
            </h2>
            <Link to="/supplier/inventory" className="text-sm font-semibold text-accent-strong hover:underline">
              Inventory
            </Link>
          </div>
          {data.inventoryAlerts.length === 0 ? (
            <p className="mt-4 text-sm text-muted">All stock levels are healthy.</p>
          ) : (
            <ul className="mt-3">
              {data.inventoryAlerts.map((product) => (
                <li key={product._id} className="data-row">
                  <Link to={`/supplier/inventory/${product._id}/edit`} className="min-w-0 truncate text-ink hover:text-accent-strong">
                    {product.name}
                  </Link>
                  <span className={`whitespace-nowrap font-semibold tabular-nums ${product.stock <= 0 ? 'text-danger' : 'text-warning'}`}>
                    {product.stock <= 0 ? 'Out of stock' : `${formatQuantity(product.stock)} ${pluralizeUnit(product.unit, product.stock)} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default SupplierDashboardPage;
