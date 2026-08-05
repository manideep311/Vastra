import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductById } from '../../services/productService';
import { addToCart } from '../../services/cartService';
import { getSimilarProducts } from '../../services/aiService';
import { requestQuote } from '../../services/quoteService';
import { getProductReviews, submitReview } from '../../services/reviewService';
import { getImageUrl } from '../../utils/config';
import { useWishlist } from '../../context/WishlistContext';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { unitAllowsDecimals, pluralizeUnit } from '../../utils/units';
import ProductCard from '../../components/ProductCard';
import {
  ArrowLeftIcon,
  HeartIcon as HeartOutlineIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon, StarIcon } from '@heroicons/react/24/solid';

// Strips characters that aren't valid for the current unit's quantity input
// (whole numbers only unless the unit is commonly sold in fractions).
function sanitizeQuantityInput(value, allowDecimals) {
  let v = value.replace(/[^\d.]/g, '');
  if (!allowDecimals) v = v.replace(/\./g, '');
  const parts = v.split('.');
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
  return v;
}

function StarRow({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange?.(n)} disabled={!onChange}>
          <StarIcon className={`w-5 h-5 ${n <= value ? 'text-amber-400' : 'text-slate-200'}`} />
        </button>
      ))}
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useBuyerAuth();
  const wishlist = useWishlist();
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [quantityInput, setQuantityInput] = useState('1');
  const [selectedColor, setSelectedColor] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Redirects a guest to the buyer login and returns them to this page.
  // Returns false (and redirects) when the buyer isn't logged in yet.
  const requireBuyerLogin = () => {
    if (!isLoggedIn) {
      navigate('/buyer/login', { state: { from: `/products/${id}` } });
      return false;
    }
    return true;
  };

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ requestedQuantity: '', targetPrice: '', message: '' });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [ratingAverage, setRatingAverage] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProductById(id).then((data) => {
      setProduct(data.product);
      setSelectedColor(data.product.colors?.[0] || '');
      setActiveImage(0);
      // Start at the minimum order quantity when one is set, so the buyer
      // isn't immediately shown a "below minimum" error on page load.
      setQuantityInput(String(data.product.moq > 1 ? data.product.moq : 1));
      setLoading(false);
    });
    getSimilarProducts(id)
      .then((data) => setSimilar(data.results))
      .catch(() => setSimilar([]));
    fetchReviews();
  }, [id]);

  const fetchReviews = () => {
    getProductReviews(id)
      .then((data) => {
        setReviews(data.reviews);
        setRatingAverage(data.ratingAverage);
        setRatingCount(data.ratingCount);
      })
      .catch(() => {});
  };

  // Quantity input validation: numeric only, no decimals unless the
  // product's unit (kg/meter) is commonly sold in fractional amounts, and
  // never below the product's minimum order quantity (moq) when it has one.
  const allowDecimals = unitAllowsDecimals(product?.unit);
  const moq = product?.moq > 1 ? product.moq : 1;
  const numericQuantity = Number(quantityInput);
  const isWellFormed =
    quantityInput !== '' &&
    !Number.isNaN(numericQuantity) &&
    numericQuantity >= 1 &&
    (allowDecimals || Number.isInteger(numericQuantity));
  const belowMoq = isWellFormed && numericQuantity < moq;
  const isQuantityValid = isWellFormed && !belowMoq;
  const effectiveQuantity = isQuantityValid ? numericQuantity : 0;
  const totalPrice = useMemo(() => (product ? product.price * effectiveQuantity : 0), [product, effectiveQuantity]);

  const handleQuantityChange = (e) => {
    setQuantityInput(sanitizeQuantityInput(e.target.value, allowDecimals));
  };

  const handleQuantityBlur = () => {
    // Only reset unusable input (empty/NaN/wrong format) back to the
    // minimum — a well-formed number that's simply below MOQ is left as-is
    // so the inline error stays visible instead of silently overwriting it.
    if (!isWellFormed) setQuantityInput(String(moq));
  };

  const handleAddToCart = async () => {
    if (!isQuantityValid) return;
    try {
      await addToCart(id, effectiveQuantity);
      setToast(`Added ${effectiveQuantity} ${pluralizeUnit(product.unit, effectiveQuantity)} to cart ✓`);
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to add');
    } finally {
      setTimeout(() => setToast(''), 2200);
    }
  };

  const handleQuickAdd = async (productId) => {
    const quickProduct = similar.find((p) => p._id === productId);
    try {
      await addToCart(productId, 1);
      setToast(`Added 1 ${pluralizeUnit(quickProduct?.unit, 1)} to cart ✓`);
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to add');
    } finally {
      setTimeout(() => setToast(''), 2200);
    }
  };

  const handleRequestQuote = async (e) => {
    e.preventDefault();
    setQuoteSubmitting(true);
    try {
      await requestQuote({
        productId: id,
        requestedQuantity: Number(quoteForm.requestedQuantity),
        targetPrice: quoteForm.targetPrice ? Number(quoteForm.targetPrice) : undefined,
        message: quoteForm.message,
      });
      setToast('Quote request sent ✓');
      setQuoteOpen(false);
      setQuoteForm({ requestedQuantity: '', targetPrice: '', message: '' });
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to request quote');
    } finally {
      setQuoteSubmitting(false);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!requireBuyerLogin()) return;
    setReviewSubmitting(true);
    try {
      await submitReview(id, reviewForm);
      fetchReviews();
      setToast('Review submitted ✓');
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
      setTimeout(() => setToast(''), 2200);
    }
  };

  if (loading) return <p className="text-slate-400 text-center py-16">Loading...</p>;
  if (!product) return <p className="text-slate-400 text-center py-16">Product not found.</p>;

  const images = product.images?.length > 0 ? product.images : [null];
  const wishlisted = wishlist?.isWishlisted?.(product._id);

  return (
    <div>
      <Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-800 transition-colors">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-6">
        {/* Image gallery */}
        <div>
          <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl overflow-hidden flex items-center justify-center shadow-sm">
            {images[activeImage] ? (
              <img src={getImageUrl(images[activeImage])} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-300">No image yet</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 mt-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    activeImage === i ? 'border-emerald-500' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sticky purchase panel */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{product.category}</p>
              <h1 className="font-display text-3xl font-bold text-slate-900 mt-1">{product.name}</h1>
              {ratingCount > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <StarRow value={Math.round(ratingAverage)} />
                  <span className="text-sm text-slate-500">{ratingAverage.toFixed(1)} ({ratingCount})</span>
                </div>
              )}
            </div>
            {wishlist && (
              <button
                onClick={() => {
                  if (!requireBuyerLogin()) return;
                  wishlist.toggleWishlist(product._id);
                }}
                aria-label="Toggle wishlist"
                className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-110 hover:border-rose-200"
              >
                {wishlisted ? <HeartIcon className="w-5 h-5 text-rose-500" /> : <HeartOutlineIcon className="w-5 h-5 text-slate-400" />}
              </button>
            )}
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 mt-6 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Price</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              ₹{product.price} <span className="text-sm font-normal text-slate-400">/ {product.unit || 'unit'}</span>
            </p>
            {product.moq > 1 && <p className="text-xs text-slate-400 mt-1">Minimum order: {product.moq} {product.unit || 'units'}</p>}

            <p className="text-slate-600 mt-4 leading-relaxed text-sm">{product.description}</p>

            {(product.fabricComposition || product.gsm || product.leadTime || product.fabricWidth || product.rollLength) && (
              <div className="mt-4 text-sm text-slate-600 space-y-1">
                {product.fabricComposition && (
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span>Composition</span>
                    <span className="font-medium text-slate-800">{product.fabricComposition}</span>
                  </div>
                )}
                {product.fabricWidth && (
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span>Width</span>
                    <span className="font-medium text-slate-800">{product.fabricWidth}</span>
                  </div>
                )}
                {product.rollLength && (
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span>Roll/piece length</span>
                    <span className="font-medium text-slate-800">{product.rollLength}</span>
                  </div>
                )}
                {product.gsm && (
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span>GSM</span>
                    <span className="font-medium text-slate-800">{product.gsm}</span>
                  </div>
                )}
                {product.leadTime && (
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span>Lead time</span>
                    <span className="font-medium text-slate-800">{product.leadTime}</span>
                  </div>
                )}
              </div>
            )}

            {product.colors?.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-slate-700 mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                        selectedColor === color
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'border-slate-300 text-slate-600 hover:border-emerald-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-slate-700 mb-2">Specifications</p>
                <div className="text-sm text-slate-600 space-y-1">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b border-slate-100 py-1.5">
                      <span className="capitalize">{key}</span>
                      <span className="font-medium text-slate-800">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-slate-500 mt-6">
              {product.stock > 0 ? `${product.stock} units in stock` : 'Out of stock'}
            </p>

            {/* Typed quantity input — numeric only, min 1, decimals only for
                units (kg/meter) that are commonly sold in fractions. */}
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-1.5">Quantity</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode={allowDecimals ? 'decimal' : 'numeric'}
                  value={quantityInput}
                  onChange={handleQuantityChange}
                  onBlur={handleQuantityBlur}
                  aria-label="Quantity"
                  className={`w-28 border rounded-full px-4 py-2.5 text-center font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 transition-shadow ${
                    isQuantityValid ? 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500' : 'border-red-300 focus:ring-red-400 focus:border-red-400'
                  }`}
                />
                <span className="text-slate-600 text-sm font-medium">{product.unit || 'unit'}</span>
              </div>
              {belowMoq ? (
                <p className="text-xs text-red-500 mt-1.5">
                  Minimum order is {moq} {pluralizeUnit(product.unit, moq)}.
                </p>
              ) : (
                !isQuantityValid && quantityInput !== '' && (
                  <p className="text-xs text-red-500 mt-1.5">
                    Enter a valid quantity — minimum 1{allowDecimals ? '' : ', whole numbers only'}.
                  </p>
                )
              )}
            </div>

            {/* Live total price — recalculates instantly as quantity changes. */}
            <div className="mt-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Total Price</p>
                <p className="text-2xl font-bold text-emerald-900 mt-0.5">₹{totalPrice.toFixed(2)}</p>
              </div>
              <p className="text-xs text-emerald-700/80 text-right">
                ₹{product.price}/{product.unit || 'unit'} × {isQuantityValid ? quantityInput : 0} {product.unit || 'unit'}
              </p>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || !isQuantityValid}
                className="flex-1 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-3 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                Add to Cart
              </button>
            </div>

            <button
              onClick={() => {
                if (!requireBuyerLogin()) return;
                setQuoteOpen(true);
              }}
              className="w-full mt-3 flex items-center justify-center gap-1.5 border border-amber-300 text-amber-700 py-2.5 rounded-full font-medium text-sm transition-all duration-200 hover:bg-amber-50"
            >
              <DocumentTextIcon className="w-4 h-4" />
              Request a bulk quote
            </button>
          </div>
        </div>
      </div>

      {/* Quote request modal */}
      {quoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setQuoteOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h3 className="font-display text-xl font-bold text-slate-900">Request a bulk quote</h3>
            <p className="text-sm text-slate-500 mt-1">for {product.name}</p>

            <form onSubmit={handleRequestQuote} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity needed</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quoteForm.requestedQuantity}
                  onChange={(e) => setQuoteForm({ ...quoteForm, requestedQuantity: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target price/unit (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quoteForm.targetPrice}
                  onChange={(e) => setQuoteForm({ ...quoteForm, targetPrice: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message (optional)</label>
                <textarea
                  rows={3}
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={quoteSubmitting}
                className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-3 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 disabled:opacity-50"
              >
                {quoteSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {similar.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">You might also like</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {similar.map((p) => (
              <ProductCard key={p._id} product={p} onAddToCart={handleQuickAdd} />
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="mt-16 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="font-display text-xl font-bold text-slate-900">Reviews {ratingCount > 0 && `(${ratingCount})`}</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
        </div>

        <form onSubmit={handleSubmitReview} className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5 mb-6">
          <p className="text-sm font-medium text-slate-700 mb-2">Leave a review</p>
          <StarRow value={reviewForm.rating} onChange={(n) => setReviewForm({ ...reviewForm, rating: n })} />
          <textarea
            rows={2}
            placeholder="Share your experience with this product..."
            value={reviewForm.comment}
            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
            className="w-full mt-3 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={reviewSubmitting}
            className="mt-3 text-sm bg-emerald-700 text-white px-4 py-2 rounded-full hover:bg-emerald-800 transition-colors disabled:opacity-50"
          >
            {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>

        {reviews.length === 0 ? (
          <p className="text-slate-400 text-sm">No reviews yet — be the first to share your experience.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StarRow value={review.rating} />
                    {review.verifiedPurchase && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Verified purchase</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                {review.comment && <p className="text-sm text-slate-600 mt-2">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-40 md:bottom-6 left-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-50">{toast}</div>
      )}
    </div>
  );
}

export default ProductDetail;
