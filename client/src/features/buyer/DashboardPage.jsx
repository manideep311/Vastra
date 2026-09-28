import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightStartOnRectangleIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { ClipboardDocumentListIcon, DocumentTextIcon, HeartIcon } from '@heroicons/react/24/outline';
import { getBuyerProfile } from '../../services/buyerService';
import { getMyOrders } from '../../services/orderService';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import { ErrorState, Skeleton } from '../../components/ui/States';
import { formatINR } from '../../utils/pricing';
import { getErrorMessage } from '../../utils/errors';

const QUICK_LINKS = [
  { to: '/orders', label: 'Orders', hint: 'Track supplier orders', icon: ClipboardDocumentListIcon },
  { to: '/quotes', label: 'Quotes', hint: 'Bulk price requests', icon: DocumentTextIcon },
  { to: '/wishlist', label: 'Wishlist', hint: 'Saved fabrics', icon: HeartIcon },
];

function DashboardPage() {
  const { user, logout } = useBuyerAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [orderData, profileData] = await Promise.all([getMyOrders(), getBuyerProfile().catch(() => null)]);
      setOrders(orderData.orders);
      setProfile(profileData?.profile || null);
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load your account."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  const active = orders.filter((o) => o.status !== 'completed').length;
  const spent = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Buyer account</p>
          <h1 className="page-title mt-1 break-all">{user?.email}</h1>
        </div>
        <button type="button" onClick={handleLogout} className="btn btn-secondary btn-sm">
          <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          Log out
        </button>
      </div>

      {status === 'error' ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface">
            {[
              ['Orders placed', orders.length],
              ['In progress', active],
              ['Total ordered', formatINR(spent)],
            ].map(([label, value]) => (
              <div key={label} className="px-4 py-4 sm:px-6">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 font-display text-lg font-bold tabular-nums text-ink sm:text-xl">
                  {status === 'loading' ? <Skeleton className="h-6 w-12" /> : value}
                </dd>
              </div>
            ))}
          </dl>

          <nav aria-label="Account" className="mt-6 grid gap-3 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong">
                <link.icon className="h-5 w-5 text-brand" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{link.label}</span>
                  <span className="block text-xs text-muted">{link.hint}</span>
                </span>
                <ChevronRightIcon className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-5">
            <section className="lg:col-span-3" aria-labelledby="recent-orders">
              <div className="flex items-baseline justify-between">
                <h2 id="recent-orders" className="section-title">
                  Recent orders
                </h2>
                {orders.length > 0 && (
                  <Link to="/orders" className="text-sm font-semibold text-brand hover:underline">
                    View all
                  </Link>
                )}
              </div>
              {status === 'loading' ? (
                <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
              ) : orders.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-6 py-8 text-center text-sm text-muted">
                  No orders yet.{' '}
                  <Link to="/products" className="font-semibold text-brand hover:underline">
                    Start sourcing
                  </Link>
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order._id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">#{order._id.slice(-6).toUpperCase()}</p>
                        <p className="truncate text-xs text-muted">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {order.items.length} item
                          {order.items.length === 1 ? '' : 's'} · {formatINR(order.total)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="lg:col-span-2" aria-labelledby="business-profile">
              <h2 id="business-profile" className="section-title">
                Business profile
              </h2>
              {status === 'loading' ? (
                <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
              ) : profile ? (
                <dl className="mt-3">
                  {[
                    ['Business type', profile.businessType],
                    ['Industry', profile.industry],
                    ['Preferred fabrics', profile.preferredFabricTypes?.join(', ')],
                    ['Typical order', profile.typicalOrderQuantity],
                    ['Budget', profile.budgetRange],
                  ].map(([label, value]) => (
                    <div key={label} className="data-row">
                      <dt>{label}</dt>
                      <dd>{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Tell us about your business to get better recommendations.{' '}
                  <Link to="/buyer/onboarding" className="font-semibold text-brand hover:underline">
                    Complete profile
                  </Link>
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
