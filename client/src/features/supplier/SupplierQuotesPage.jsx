import { useState, useEffect } from 'react';
import { getSupplierQuotes, respondToQuote, declineQuote } from '../../services/quoteService';
import { getImageUrl } from '../../utils/config';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  quoted: 'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
};

function SupplierQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({}); // { [quoteId]: { quotedPrice, quotedLeadTime, supplierMessage } }
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const data = await getSupplierQuotes();
      setQuotes(data.quotes);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (id, field, value) => {
    setFormState((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleRespond = async (id) => {
    const form = formState[id];
    if (!form?.quotedPrice) return;
    setBusyId(id);
    try {
      await respondToQuote(id, {
        quotedPrice: Number(form.quotedPrice),
        quotedLeadTime: form.quotedLeadTime || '',
        supplierMessage: form.supplierMessage || '',
      });
      fetchQuotes();
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (id) => {
    setBusyId(id);
    try {
      await declineQuote(id);
      fetchQuotes();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-slate-400 text-center py-16">Loading quotes...</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">Quote Requests</h1>

      {quotes.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-slate-500 text-lg">No quote requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote._id} className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                    {quote.productId?.images?.[0] && (
                      <img src={getImageUrl(quote.productId.images[0])} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{quote.productId?.name}</p>
                    <p className="text-sm text-slate-500">
                      Qty: {quote.requestedQuantity}
                      {quote.targetPrice ? ` · Target ₹${quote.targetPrice}/unit` : ''} · {quote.buyerId?.email}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_COLORS[quote.status]}`}>
                  {quote.status}
                </span>
              </div>

              {quote.message && <p className="text-sm text-slate-500 mt-3 italic">"{quote.message}"</p>}

              {quote.status === 'pending' && (
                <div className="mt-4 bg-amber-50/60 border border-amber-100 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price/unit (₹)"
                      value={formState[quote._id]?.quotedPrice || ''}
                      onChange={(e) => updateForm(quote._id, 'quotedPrice', e.target.value)}
                      className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Lead time (e.g. 10-15 days)"
                      value={formState[quote._id]?.quotedLeadTime || ''}
                      onChange={(e) => updateForm(quote._id, 'quotedLeadTime', e.target.value)}
                      className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Note to buyer (optional)"
                      value={formState[quote._id]?.supplierMessage || ''}
                      onChange={(e) => updateForm(quote._id, 'supplierMessage', e.target.value)}
                      className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleDecline(quote._id)}
                      disabled={busyId === quote._id}
                      className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-full hover:border-slate-400 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRespond(quote._id)}
                      disabled={busyId === quote._id || !formState[quote._id]?.quotedPrice}
                      className="text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-full hover:shadow-md hover:shadow-amber-500/30 transition-all duration-200 disabled:opacity-50"
                    >
                      Send Quote
                    </button>
                  </div>
                </div>
              )}

              {quote.status === 'quoted' && (
                <p className="text-sm text-slate-500 mt-3">
                  You quoted <span className="font-semibold text-slate-800">₹{quote.quotedPrice}/unit</span>
                  {quote.quotedLeadTime && ` · ${quote.quotedLeadTime}`} — waiting on buyer.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SupplierQuotesPage;
