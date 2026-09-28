import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { getMyQuotes, acceptQuote, rejectQuote } from '../../services/quoteService';
import { getCartCount, CART_CHANGED_EVENT } from '../../services/cartService';
import { useToast } from '../../components/ui/Toast';
import StatusBadge from '../../components/ui/StatusBadge';
import ProductImage from '../../components/ui/ProductImage';
import { EmptyState, ErrorState, Skeleton, Spinner } from '../../components/ui/States';
import { formatINR, formatQuantity } from '../../utils/pricing';
import { pluralizeUnit } from '../../utils/units';
import { getErrorMessage } from '../../utils/errors';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function BuyerQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // { id, action }
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await getMyQuotes();
      setQuotes(data.quotes);
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load your quotes."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replaceQuote = (updated) => setQuotes((list) => list.map((q) => (q._id === updated._id ? updated : q)));

  const handleAccept = async (quote) => {
    setBusy({ id: quote._id, action: 'accept' });
    try {
      const data = await acceptQuote(quote._id);
      replaceQuote(data.quote);
      toast.success('Offer accepted — added to your cart at the quoted price', { action: { label: 'View cart', to: '/cart' } });
      getCartCount()
        .then((count) => window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { count } })))
        .catch(() => {});
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't accept this offer."));
      load();
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (quote) => {
    setBusy({ id: quote._id, action: 'reject' });
    try {
      const data = await rejectQuote(quote._id);
      replaceQuote(data.quote);
      toast.info('Offer declined');
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't decline this offer."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title">Quotes</h1>
      <p className="mt-1 text-sm text-muted">Bulk price requests you’ve sent, and the offers suppliers have made.</p>

      {status === 'loading' && (
        <div className="mt-6 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      )}
      {status === 'error' && <ErrorState message={error} onRetry={load} />}
      {status === 'ready' && quotes.length === 0 && (
        <EmptyState
          icon={DocumentTextIcon}
          title="No quote requests yet"
          description="Ordering a large or custom run? Open any fabric and choose “Request a bulk quote” to negotiate directly with the supplier."
          action={{ label: 'Find a fabric', to: '/products' }}
        />
      )}

      {status === 'ready' && quotes.length > 0 && (
        <ul className="mt-6 space-y-4">
          {quotes.map((quote) => {
            const product = quote.productId;
            const unit = product?.unit || 'unit';
            const isBusy = busy?.id === quote._id;
            return (
              <li key={quote._id} className="card animate-fade-up p-5">
                <div className="flex items-start gap-4">
                  <ProductImage src={product?.images?.[0]} className="h-16 w-16 flex-shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      {product ? (
                        <Link to={`/products/${product._id}`} className="font-display font-bold text-ink hover:text-brand">
                          {product.name}
                        </Link>
                      ) : (
                        <span className="font-display font-bold text-muted">Product removed</span>
                      )}
                      <StatusBadge status={quote.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-2">
                      {formatQuantity(quote.requestedQuantity)} {pluralizeUnit(unit, quote.requestedQuantity)}
                      {quote.targetPrice ? <span className="text-muted"> · target {formatINR(quote.targetPrice)}/{unit}</span> : null}
                      {product && <span className="text-muted"> · list {formatINR(product.price)}/{unit}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">Requested {formatDate(quote.createdAt)}</p>
                  </div>
                </div>

                {quote.message && <p className="mt-4 border-l-2 border-line pl-3 text-sm text-ink-2">{quote.message}</p>}

                {['quoted', 'accepted'].includes(quote.status) && quote.quotedPrice && (
                  <div className={`mt-4 rounded-xl border p-4 ${quote.status === 'quoted' ? 'border-brand/25 bg-brand-soft/60' : 'border-line bg-surface-2/60'}`}>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="eyebrow">Supplier offer</p>
                        <p className="mt-1 flex items-baseline gap-1.5">
                          <span className="price text-2xl">{formatINR(quote.quotedPrice)}</span>
                          <span className="text-sm text-muted">/{unit}</span>
                        </p>
                        <p className="mt-1 text-sm text-ink-2">
                          {formatINR(quote.quotedPrice * quote.requestedQuantity)} total
                          {quote.quotedLeadTime && ` · ships in ${quote.quotedLeadTime}`}
                          {quote.validUntil && ` · valid until ${formatDate(quote.validUntil)}`}
                        </p>
                        {quote.supplierMessage && <p className="mt-2 text-sm text-ink-2">“{quote.supplierMessage}”</p>}
                      </div>
                      {quote.status === 'quoted' && (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleReject(quote)} disabled={isBusy} className="btn btn-secondary">
                            {isBusy && busy.action === 'reject' && <Spinner />}
                            Decline
                          </button>
                          <button type="button" onClick={() => handleAccept(quote)} disabled={isBusy} className="btn btn-primary">
                            {isBusy && busy.action === 'accept' && <Spinner />}
                            Accept &amp; add to cart
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {quote.status === 'pending' && <p className="mt-4 text-sm text-muted">Waiting for the supplier to respond. You’ll get a notification when they do.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default BuyerQuotesPage;
