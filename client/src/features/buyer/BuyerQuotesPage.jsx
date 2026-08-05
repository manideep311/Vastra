import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyQuotes, acceptQuote, rejectQuote } from '../../services/quoteService';
import { getImageUrl } from '../../utils/config';
import { DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  quoted: 'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
};

function BuyerQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const data = await getMyQuotes();
      setQuotes(data.quotes);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    setBusyId(id);
    try {
      await acceptQuote(id);
      setToast('Added to cart at the quoted price ✓');
      fetchQuotes();
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to accept quote');
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    try {
      await rejectQuote(id);
      fetchQuotes();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-slate-400 text-center py-16">Loading quotes...</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">My Quote Requests</h1>

      {quotes.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-slate-500 text-lg mb-4">No quote requests yet.</p>
          <Link
            to="/home"
            className="inline-block bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-105"
          >
            Browse products to request a quote
          </Link>
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
                    <p className="text-sm text-slate-500">Qty requested: {quote.requestedQuantity}{quote.targetPrice ? ` · Target ₹${quote.targetPrice}/unit` : ''}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_COLORS[quote.status]}`}>
                  {quote.status}
                </span>
              </div>

              {quote.message && <p className="text-sm text-slate-500 mt-3 italic">"{quote.message}"</p>}

              {quote.status === 'quoted' && (
                <div className="mt-4 bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">Supplier offer</p>
                    <p className="text-xl font-bold text-emerald-800">
                      ₹{quote.quotedPrice}/unit
                      {quote.quotedLeadTime && <span className="text-sm font-normal text-slate-500"> · {quote.quotedLeadTime}</span>}
                    </p>
                    {quote.supplierMessage && <p className="text-sm text-slate-500 mt-1">"{quote.supplierMessage}"</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(quote._id)}
                      disabled={busyId === quote._id}
                      className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-full hover:border-slate-400 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(quote._id)}
                      disabled={busyId === quote._id}
                      className="text-sm bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-4 py-2 rounded-full hover:shadow-md hover:shadow-emerald-700/30 transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Accept &amp; add to cart
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-40 md:bottom-6 left-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-50">{toast}</div>
      )}
    </div>
  );
}

export default BuyerQuotesPage;
