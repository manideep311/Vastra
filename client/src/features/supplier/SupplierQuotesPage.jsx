import { useCallback, useEffect, useMemo, useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { getSupplierQuotes, respondToQuote, declineQuote } from '../../services/quoteService';
import { useToast } from '../../components/ui/Toast';
import StatusBadge from '../../components/ui/StatusBadge';
import ProductImage from '../../components/ui/ProductImage';
import { EmptyState, ErrorState, InlineError, Skeleton, Spinner } from '../../components/ui/States';
import { formatINR, formatQuantity } from '../../utils/pricing';
import { pluralizeUnit } from '../../utils/units';
import { getErrorMessage } from '../../utils/errors';

const TABS = [
  { value: 'pending', label: 'Needs response', match: (q) => q.status === 'pending' },
  { value: 'quoted', label: 'Offer sent', match: (q) => q.status === 'quoted' },
  { value: 'closed', label: 'Closed', match: (q) => ['accepted', 'rejected', 'expired'].includes(q.status) },
];

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const today = () => new Date().toISOString().slice(0, 10);

function ResponseForm({ quote, onSubmit, onDecline, onCancel, busy }) {
  const unit = quote.productId?.unit || 'unit';
  const listPrice = quote.productId?.price;
  const [form, setForm] = useState({
    quotedPrice: quote.quotedPrice ? String(quote.quotedPrice) : '',
    quotedLeadTime: quote.quotedLeadTime || '',
    validUntil: quote.validUntil ? quote.validUntil.slice(0, 10) : '',
    supplierMessage: '',
  });
  const [error, setError] = useState('');
  const price = Number(form.quotedPrice);
  const valid = form.quotedPrice !== '' && price > 0;
  const discount = valid && listPrice ? Math.round((1 - price / listPrice) * 100) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) {
      setError(`Enter your price per ${unit}.`);
      return;
    }
    setError('');
    const err = await onSubmit({
      quotedPrice: price,
      quotedLeadTime: form.quotedLeadTime.trim(),
      supplierMessage: form.supplierMessage.trim(),
      validUntil: form.validUntil || undefined,
    });
    if (err) setError(err);
  };

  const id = (field) => `q-${quote._id}-${field}`;

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-line bg-surface-2/50 p-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={id('price')} className="label">
            Your price (₹/{unit})
          </label>
          <input
            id={id('price')}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={form.quotedPrice}
            onChange={(e) => setForm((f) => ({ ...f, quotedPrice: e.target.value }))}
            aria-invalid={Boolean(error && !valid) || undefined}
            className="input"
          />
        </div>
        <div>
          <label htmlFor={id('lead')} className="label">
            Lead time <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id={id('lead')} type="text" maxLength={40} placeholder="e.g. 10–15 days" value={form.quotedLeadTime} onChange={(e) => setForm((f) => ({ ...f, quotedLeadTime: e.target.value }))} className="input" />
        </div>
        <div>
          <label htmlFor={id('valid')} className="label">
            Valid until <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id={id('valid')} type="date" min={today()} value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} className="input" />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor={id('msg')} className="label">
          Note to buyer <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={id('msg')}
          rows={2}
          maxLength={1000}
          placeholder="Payment terms, dispatch details, colour availability…"
          value={form.supplierMessage}
          onChange={(e) => setForm((f) => ({ ...f, supplierMessage: e.target.value }))}
          className="input"
        />
      </div>

      {valid && (
        <p className="mt-3 text-sm text-ink-2" aria-live="polite">
          Offer total <span className="font-semibold tabular-nums text-ink">{formatINR(price * quote.requestedQuantity)}</span>
          {discount !== null && discount !== 0 && (
            <span className={discount > 0 ? 'text-success' : 'text-warning'}>
              {' '}
              · {Math.abs(discount)}% {discount > 0 ? 'below' : 'above'} your list price
            </span>
          )}
        </p>
      )}
      {error && (
        <div className="mt-3">
          <InlineError>{error}</InlineError>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost">
            Cancel
          </button>
        ) : (
          <button type="button" onClick={onDecline} disabled={busy} className="btn btn-danger">
            Decline request
          </button>
        )}
        <button type="submit" disabled={busy} className="btn btn-accent">
          {busy && <Spinner />}
          {quote.status === 'quoted' ? 'Update offer' : 'Send offer'}
        </button>
      </div>
    </form>
  );
}

function SupplierQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [revisingId, setRevisingId] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await getSupplierQuotes();
      setQuotes(data.quotes);
      if (!data.quotes.some(TABS[0].match) && data.quotes.some(TABS[1].match)) setTab('quoted');
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't load quote requests."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.value, quotes.filter(t.match).length])), [quotes]);
  const visible = quotes.filter(TABS.find((t) => t.value === tab).match);
  const replace = (updated) => setQuotes((list) => list.map((q) => (q._id === updated._id ? updated : q)));

  // Returns an error message for the form to show, or nothing on success.
  const handleRespond = async (quote, payload) => {
    setBusyId(quote._id);
    try {
      const data = await respondToQuote(quote._id, payload);
      replace(data.quote);
      setRevisingId(null);
      toast.success('Offer sent — the buyer has been notified');
      return null;
    } catch (err) {
      return getErrorMessage(err, "Couldn't send your offer.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (quote) => {
    setBusyId(quote._id);
    try {
      const data = await declineQuote(quote._id);
      replace(data.quote);
      toast.info('Request declined');
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't decline this request."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title">Quote requests</h1>
      <p className="mt-1 text-sm text-muted">Buyers asking for bulk pricing. Accepted offers go straight into their cart at your price.</p>

      {status === 'loading' && (
        <div className="mt-6 space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      )}
      {status === 'error' && <ErrorState message={error} onRetry={load} />}
      {status === 'ready' && quotes.length === 0 && (
        <EmptyState
          icon={DocumentTextIcon}
          title="No quote requests yet"
          description="Buyers can request a bulk quote from any of your product pages. New requests will appear here."
        />
      )}

      {status === 'ready' && quotes.length > 0 && (
        <>
          <div className="mt-6 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter quotes">
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
            <EmptyState compact title="Nothing here" description={tab === 'pending' ? 'You’ve responded to every request.' : 'No quotes in this view yet.'} />
          ) : (
            <ul className="mt-5 space-y-4">
              {visible.map((quote) => {
                const product = quote.productId;
                const unit = product?.unit || 'unit';
                return (
                  <li key={quote._id} className="card animate-fade-up p-5">
                    <div className="flex items-start gap-4">
                      <ProductImage src={product?.images?.[0]} className="h-14 w-14 flex-shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-display font-bold text-ink">{product?.name || 'Product removed'}</p>
                          <StatusBadge status={quote.status} />
                        </div>
                        <p className="mt-1 text-sm text-ink-2">
                          <span className="font-semibold">
                            {formatQuantity(quote.requestedQuantity)} {pluralizeUnit(unit, quote.requestedQuantity)}
                          </span>
                          {quote.targetPrice ? ` · target ${formatINR(quote.targetPrice)}/${unit}` : ' · no target price'}
                          {product?.price ? <span className="text-muted"> · your list {formatINR(product.price)}</span> : null}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {quote.buyerId?.email} · {formatDate(quote.createdAt)}
                        </p>
                      </div>
                    </div>

                    {quote.message && <p className="mt-4 border-l-2 border-line pl-3 text-sm text-ink-2">{quote.message}</p>}

                    {quote.status === 'pending' && (
                      <ResponseForm quote={quote} busy={busyId === quote._id} onSubmit={(p) => handleRespond(quote, p)} onDecline={() => handleDecline(quote)} />
                    )}

                    {quote.status === 'quoted' &&
                      (revisingId === quote._id ? (
                        <ResponseForm quote={quote} busy={busyId === quote._id} onSubmit={(p) => handleRespond(quote, p)} onCancel={() => setRevisingId(null)} />
                      ) : (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-4 py-3">
                          <p className="text-sm text-ink-2">
                            You offered <span className="font-semibold tabular-nums text-ink">{formatINR(quote.quotedPrice)}/{unit}</span>
                            {quote.quotedLeadTime && ` · ${quote.quotedLeadTime}`}
                            {quote.validUntil && ` · valid until ${formatDate(quote.validUntil)}`} — waiting on the buyer.
                          </p>
                          <button type="button" onClick={() => setRevisingId(quote._id)} className="btn btn-sm btn-secondary">
                            Revise offer
                          </button>
                        </div>
                      ))}

                    {quote.status === 'accepted' && (
                      <p className="mt-4 text-sm text-success">
                        Accepted at {formatINR(quote.quotedPrice)}/{unit} — it’s in the buyer’s cart. You’ll get an order when they check out.
                      </p>
                    )}
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

export default SupplierQuotesPage;
