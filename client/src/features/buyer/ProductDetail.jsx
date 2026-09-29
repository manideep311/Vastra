import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRightIcon, CheckBadgeIcon, StarIcon, MapPinIcon } from '@heroicons/react/20/solid';
import { DocumentTextIcon, CubeIcon, TruckIcon, ScaleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { getProductById } from '../../services/productService';
import { addToCart } from '../../services/cartService';
import { getSimilarProducts } from '../../services/aiService';
import { requestQuote } from '../../services/quoteService';
import { getProductReviews, submitReview } from '../../services/reviewService';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useProductActions } from '../../hooks/useProductActions';
import { useToast } from '../../components/ui/Toast';
import ProductCard from '../../components/ProductCard';
import ProductImage from '../../components/ui/ProductImage';
import Dialog from '../../components/ui/Dialog';
import QuantityStepper from '../../components/ui/QuantityStepper';
import WishlistButton from '../../components/product/WishlistButton';
import StockIndicator from '../../components/product/StockIndicator';
import { stockLevel } from '../../utils/stock';
import { EmptyState, ErrorState, InlineError, Skeleton, SlowServerNotice, Spinner } from '../../components/ui/States';
import { useSlowLoading } from '../../hooks/useSlowLoading';
import { unitAllowsDecimals, pluralizeUnit } from '../../utils/units';
import { effectiveMoq, formatINR, formatQuantity, getEffectivePrice } from '../../utils/pricing';
import { getErrorMessage } from '../../utils/errors';

function Stars({ value, className = 'h-4 w-4' }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={`${className} ${n <= Math.round(value) ? 'text-accent' : 'text-line-strong'}`} />
      ))}
    </span>
  );
}

// Radio-group star picker: arrow keys work, and screen readers hear "4 stars".
function StarInput({ value, onChange }) {
  return (
    <fieldset>
      <legend className="label">Your rating</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded p-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <StarIcon className={`h-7 w-7 transition-colors ${n <= value ? 'text-accent' : 'text-line-strong hover:text-accent/50'}`} aria-hidden="true" />
            <span className="sr-only">
              {n} star{n > 1 ? 's' : ''}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DetailSkeleton({ slow }) {
  return (
    <>
    {slow && <SlowServerNotice className="mb-6" />}
    <div className="grid gap-10 lg:grid-cols-12" aria-busy="true" aria-label="Loading product">
      <Skeleton className="aspect-square w-full rounded-3xl lg:col-span-7" />
      <div className="space-y-4 lg:col-span-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-6 h-10 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
    </>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isLoggedIn } = useBuyerAuth();
  const { quickAdd, onToggleWishlist, wishlistIds } = useProductActions();
  const quantityHelpId = useId();

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const slowLoading = useSlowLoading(status === 'loading');
  const [loadError, setLoadError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [adding, setAdding] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [reviews, setReviews] = useState({ list: [], average: 0, count: 0 });

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ requestedQuantity: '', targetPrice: '', message: '' });
  const [quoteError, setQuoteError] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadReviews = useCallback(
    (signal) =>
      getProductReviews(id, { signal })
        .then((data) => setReviews({ list: data.reviews, average: data.ratingAverage, count: data.ratingCount }))
        .catch(() => {}),
    [id]
  );

  // Product, similar items and reviews load in parallel; switching products
  // cancels anything still in flight for the previous one.
  const load = useCallback(
    (signal) => {
      setStatus('loading');
      setSimilar([]);
      getProductById(id, { signal })
        .then(({ product: p }) => {
          setProduct(p);
          setActiveImage(0);
          setSelectedColor(p.colors?.[0] || '');
          setQuantityInput(String(effectiveMoq(p)));
          setStatus('ready');
        })
        .catch((err) => {
          if (err.code === 'ERR_CANCELED') return;
          if (err.response?.status === 404 || err.response?.status === 400) {
            setStatus('notfound');
          } else {
            setLoadError(getErrorMessage(err, "We couldn't load this product."));
            setStatus('error');
          }
        });
      getSimilarProducts(id, { signal })
        .then((data) => setSimilar(data.results.slice(0, 4)))
        .catch(() => {});
      loadReviews(signal);
    },
    [id, loadReviews]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const requireBuyerLogin = () => {
    if (isLoggedIn) return true;
    navigate('/buyer/login', { state: { from: location.pathname } });
    return false;
  };

  // --- Quantity & pricing -------------------------------------------------
  const unit = product?.unit || 'unit';
  const allowDecimals = unitAllowsDecimals(product?.unit);
  const moq = effectiveMoq(product);
  const numericQuantity = Number(quantityInput);
  const isWellFormed =
    quantityInput !== '' && Number.isFinite(numericQuantity) && numericQuantity > 0 && (allowDecimals || Number.isInteger(numericQuantity));
  const belowMoq = isWellFormed && numericQuantity < moq;
  const overStock = isWellFormed && product && numericQuantity > product.stock;
  const isQuantityValid = isWellFormed && !belowMoq && !overStock;

  const pricing = useMemo(() => {
    if (!product) return null;
    const qty = isQuantityValid ? numericQuantity : moq;
    const unitPrice = getEffectivePrice(product, qty);
    return { unitPrice, total: unitPrice * qty, tierApplied: unitPrice < product.price };
  }, [product, isQuantityValid, numericQuantity, moq]);

  let quantityMessage = moq > 1 ? `Minimum order ${formatQuantity(moq)} ${pluralizeUnit(unit, moq)}` : allowDecimals ? 'Fractional quantities allowed' : 'Whole units only';
  if (quantityInput !== '' && !isWellFormed) quantityMessage = `Enter a valid quantity${allowDecimals ? '' : ' in whole units'}.`;
  else if (belowMoq) quantityMessage = `Minimum order is ${formatQuantity(moq)} ${pluralizeUnit(unit, moq)}.`;
  else if (overStock) quantityMessage = `Only ${formatQuantity(product.stock)} ${pluralizeUnit(unit, product.stock)} in stock — request a quote for larger runs.`;
  const quantityInvalid = quantityInput === '' || !isQuantityValid;

  const handleAddToCart = async () => {
    if (!isQuantityValid || adding) return;
    setAdding(true);
    try {
      await addToCart(id, numericQuantity);
      toast.success(`${formatQuantity(numericQuantity)} ${pluralizeUnit(unit, numericQuantity)} added to your cart`, {
        action: { label: 'View cart', to: '/cart' },
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add that to your cart."));
    } finally {
      setAdding(false);
    }
  };

  // --- Quote ---------------------------------------------------------------
  const openQuote = () => {
    if (!requireBuyerLogin()) return;
    setQuoteError('');
    setQuoteForm((f) => ({ ...f, requestedQuantity: f.requestedQuantity || String(Math.max(moq, isQuantityValid ? numericQuantity : moq)) }));
    setQuoteOpen(true);
  };

  const handleRequestQuote = async (e) => {
    e.preventDefault();
    if (quoteSubmitting) return;
    setQuoteError('');
    setQuoteSubmitting(true);
    try {
      await requestQuote({
        productId: id,
        requestedQuantity: Number(quoteForm.requestedQuantity),
        targetPrice: quoteForm.targetPrice ? Number(quoteForm.targetPrice) : undefined,
        message: quoteForm.message.trim() || undefined,
      });
      setQuoteOpen(false);
      setQuoteForm({ requestedQuantity: '', targetPrice: '', message: '' });
      toast.success('Quote request sent to the supplier', { action: { label: 'My quotes', to: '/quotes' } });
    } catch (err) {
      setQuoteError(getErrorMessage(err, "Couldn't send your quote request."));
    } finally {
      setQuoteSubmitting(false);
    }
  };

  // --- Review --------------------------------------------------------------
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!requireBuyerLogin() || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      await submitReview(id, { rating: reviewForm.rating, comment: reviewForm.comment.trim() });
      await loadReviews();
      setReviewForm({ rating: 5, comment: '' });
      toast.success('Thanks — your review is live');
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't submit your review."));
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (status === 'loading') return <DetailSkeleton slow={slowLoading} />;
  if (status === 'notfound') {
    return (
      <EmptyState
        icon={Squares2X2Icon}
        title="This fabric isn't available"
        description="It may have been removed by the supplier. Browse the catalog for similar fabrics."
        action={{ label: 'Browse the catalog', to: '/products' }}
      />
    );
  }
  if (status === 'error') return <ErrorState message={loadError} onRetry={() => load()} />;

  const images = product.images?.length > 0 ? product.images : [null];
  const soldOut = stockLevel(product) === 'out';
  const supplier = product.supplier;
  const tiers = [...(product.priceTiers || [])].sort((a, b) => a.minQty - b.minQty);
  const specRows = [
    ['Composition', product.fabricComposition],
    ['Weight', product.gsm && `${product.gsm} GSM`],
    ['Width', product.fabricWidth],
    ['Roll / piece length', product.rollLength],
    ['Lead time', product.leadTime],
    ['Colours', product.colors?.length ? product.colors.join(', ') : null],
    ...Object.entries(product.specifications || {}).map(([k, v]) => [k, String(v)]),
  ].filter(([, v]) => v);

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex min-w-0 items-center gap-1 text-sm text-muted">
          <li>
            <Link to="/products" className="hover:text-ink">
              Catalog
            </Link>
          </li>
          <ChevronRightIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <li>
            <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-ink">
              {product.category}
            </Link>
          </li>
          <ChevronRightIcon className="hidden h-4 w-4 flex-shrink-0 sm:block" aria-hidden="true" />
          <li className="hidden truncate text-ink-2 sm:block" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Gallery */}
        <div className="lg:col-span-7">
          <ProductImage src={images[activeImage]} alt={product.name} eager width={960} className="aspect-square w-full rounded-3xl" />
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Product images">
              {images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  aria-current={activeImage === i}
                  className={`flex-shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-canvas transition ${
                    activeImage === i ? 'ring-brand' : 'ring-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <ProductImage src={img} width={160} className="h-16 w-16 md:h-20 md:w-20" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase panel */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="eyebrow">{product.category}</p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-ink md:text-3xl">{product.name}</h1>
              <WishlistButton size="lg" active={wishlistIds.has(product._id)} onToggle={() => onToggleWishlist(product)} productName={product.name} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              {supplier?.businessName && (
                <a href="#supplier" className="inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
                  {supplier.businessName}
                  {supplier.isVerified && <CheckBadgeIcon className="h-4 w-4 text-brand" aria-label="Verified supplier" />}
                </a>
              )}
              {reviews.count > 0 && (
                <a href="#reviews" className="inline-flex items-center gap-1.5 text-muted hover:text-ink">
                  <Stars value={reviews.average} className="h-3.5 w-3.5" />
                  <span>
                    {reviews.average.toFixed(1)} · {reviews.count} review{reviews.count === 1 ? '' : 's'}
                  </span>
                </a>
              )}
            </div>

            {/* Price */}
            <div className="mt-6 border-t border-line pt-6">
              <p className="flex items-baseline gap-2">
                <span className="price text-[2rem] leading-none">{formatINR(product.price)}</span>
                <span className="text-sm text-muted">per {unit}</span>
              </p>
              {tiers.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow mb-2">Bulk pricing</p>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {tiers.map((t) => {
                      const active = pricing.tierApplied && pricing.unitPrice === t.price && (isQuantityValid ? numericQuantity : moq) >= t.minQty;
                      return (
                        <li key={t.minQty} className={`rounded-xl border px-3 py-2 transition-colors ${active ? 'border-brand bg-brand-soft' : 'border-line'}`}>
                          <p className="text-[11px] text-muted">
                            {formatQuantity(t.minQty)}+ {unit}
                          </p>
                          <p className="font-display text-sm font-bold tabular-nums text-ink">{formatINR(t.price)}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Key terms */}
            <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-line">
              <div className="border-b border-r border-line p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <ScaleIcon className="h-4 w-4" aria-hidden="true" /> Minimum order
                </dt>
                <dd className="mt-1 font-display font-bold tabular-nums text-ink">{moq > 1 ? `${formatQuantity(moq)} ${pluralizeUnit(unit, moq)}` : 'No minimum'}</dd>
              </div>
              <div className="border-b border-line p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <CubeIcon className="h-4 w-4" aria-hidden="true" /> Availability
                </dt>
                <dd className="mt-1">
                  <StockIndicator product={product} className="text-sm" />
                </dd>
              </div>
              <div className="border-r border-line p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <TruckIcon className="h-4 w-4" aria-hidden="true" /> Lead time
                </dt>
                <dd className="mt-1 font-display font-bold text-ink">{product.leadTime || 'Ask supplier'}</dd>
              </div>
              <div className="p-4">
                <dt className="text-xs text-muted">Composition</dt>
                <dd className="mt-1 truncate font-display font-bold text-ink" title={product.fabricComposition}>
                  {product.fabricComposition || '—'}
                </dd>
              </div>
            </dl>

            {product.colors?.length > 0 && (
              <fieldset className="mt-6">
                <legend className="label">
                  Colour <span className="font-normal text-muted">· {selectedColor}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      aria-pressed={selectedColor === color}
                      className={`h-9 rounded-full border px-4 text-sm transition-colors ${
                        selectedColor === color ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink/40'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Quantity + total */}
            {!soldOut && (
              <div className="mt-6">
                <label htmlFor="pdp-quantity" className="label">
                  Quantity
                </label>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <QuantityStepper
                    id="pdp-quantity"
                    value={quantityInput}
                    onChange={setQuantityInput}
                    min={moq}
                    max={product.stock}
                    allowDecimals={allowDecimals}
                    unit={pluralizeUnit(unit, numericQuantity || 2)}
                    invalid={quantityInvalid && quantityInput !== ''}
                    describedBy={quantityHelpId}
                  />
                  <div className="min-w-0" aria-live="polite">
                    <p className="price text-xl leading-none">{isQuantityValid ? formatINR(pricing.total) : '—'}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatINR(pricing.unitPrice)}/{unit}
                      {pricing.tierApplied && <span className="font-semibold text-success"> · bulk price</span>}
                    </p>
                  </div>
                </div>
                <p id={quantityHelpId} className={isQuantityValid || quantityInput === '' ? 'field-hint' : 'field-error'}>
                  {quantityMessage}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button type="button" onClick={handleAddToCart} disabled={soldOut || !isQuantityValid || adding} className="btn btn-primary btn-lg w-full">
                {adding && <Spinner />}
                {soldOut ? 'Out of stock' : adding ? 'Adding…' : 'Add to cart'}
              </button>
              <button type="button" onClick={openQuote} className="btn btn-secondary btn-lg w-full">
                <DocumentTextIcon className="h-5 w-5" />
                Request a bulk quote
              </button>
              <p className="text-center text-xs text-muted">Quotes let you negotiate price and lead time for large or custom runs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <section className="mt-16 grid gap-10 border-t border-line pt-10 lg:grid-cols-12" aria-labelledby="pdp-details">
        <div className="lg:col-span-7">
          <h2 id="pdp-details" className="section-title">
            About this fabric
          </h2>
          <p className="mt-3 max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{product.description || 'The supplier has not added a description yet.'}</p>
          {product.tags?.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <li key={tag} className="badge bg-surface-2 text-ink-2">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
        {specRows.length > 0 && (
          <div className="lg:col-span-5">
            <h2 className="section-title">Specifications</h2>
            <dl className="mt-3">
              {specRows.map(([label, value]) => (
                <div key={label} className="data-row">
                  <dt className="capitalize">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      {/* Supplier */}
      {supplier && (
        <section id="supplier" className="mt-12 scroll-mt-24 rounded-2xl border border-line bg-surface p-6 md:p-8" aria-labelledby="pdp-supplier">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Sold by</p>
              <h2 id="pdp-supplier" className="mt-1 flex items-center gap-1.5 font-display text-xl font-bold text-ink">
                {supplier.businessName}
                {supplier.isVerified && <CheckBadgeIcon className="h-5 w-5 text-brand" aria-label="Verified supplier" />}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {supplier.businessType && <span>{supplier.businessType}</span>}
                {supplier.businessAddress && (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                    {supplier.businessAddress}
                  </span>
                )}
              </p>
            </div>
            <dl className="flex gap-8 text-sm">
              <div>
                <dt className="text-muted">Orders completed</dt>
                <dd className="font-display text-lg font-bold tabular-nums text-ink">{supplier.completedOrders || 0}</dd>
              </div>
              {supplier.operatingHours && (
                <div>
                  <dt className="text-muted">Hours</dt>
                  <dd className="font-medium text-ink">{supplier.operatingHours}</dd>
                </div>
              )}
            </dl>
          </div>
          {supplier.about && <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-2">{supplier.about}</p>}
        </section>
      )}

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-16" aria-labelledby="pdp-similar">
          <h2 id="pdp-similar" className="section-title">
            Similar fabrics
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {similar.map((p) => (
              <ProductCard key={p._id} product={p} wishlisted={wishlistIds.has(p._id)} onToggleWishlist={onToggleWishlist} onAddToCart={quickAdd} />
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section id="reviews" className="mt-16 grid scroll-mt-24 gap-10 border-t border-line pt-10 lg:grid-cols-12" aria-labelledby="pdp-reviews">
        <div className="lg:col-span-4">
          <h2 id="pdp-reviews" className="section-title">
            Buyer reviews
          </h2>
          {reviews.count > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="price text-4xl">{reviews.average.toFixed(1)}</span>
              <div>
                <Stars value={reviews.average} />
                <p className="mt-0.5 text-sm text-muted">
                  {reviews.count} review{reviews.count === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No reviews yet.</p>
          )}

          {isLoggedIn ? (
            <form onSubmit={handleSubmitReview} className="mt-6 space-y-4">
              <StarInput value={reviewForm.rating} onChange={(rating) => setReviewForm((f) => ({ ...f, rating }))} />
              <div>
                <label htmlFor="review-comment" className="label">
                  Review <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  maxLength={1000}
                  placeholder="How was the hand-feel, colour accuracy, consistency across rolls?"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  className="input"
                />
              </div>
              <button type="submit" disabled={reviewSubmitting} className="btn btn-secondary">
                {reviewSubmitting && <Spinner />}
                {reviewSubmitting ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-muted">
              <Link to="/buyer/login" state={{ from: location.pathname }} className="font-semibold text-brand hover:underline">
                Sign in
              </Link>{' '}
              to review this fabric.
            </p>
          )}
        </div>

        <div className="lg:col-span-8">
          {reviews.list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">
              Bought this fabric? Your review helps other buyers judge quality before ordering in bulk.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {reviews.list.map((review) => (
                <li key={review._id} className="py-5 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={review.rating} className="h-3.5 w-3.5" />
                    <span className="sr-only">{review.rating} out of 5 stars</span>
                    {review.verifiedPurchase && <span className="badge bg-success-soft text-success">Verified purchase</span>}
                    <span className="text-xs text-muted">{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {review.comment && <p className="mt-2 text-sm leading-relaxed text-ink-2">{review.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Dialog open={quoteOpen} onClose={() => setQuoteOpen(false)} title="Request a bulk quote" description={`${product.name} · list price ${formatINR(product.price)}/${unit}`}>
        <form onSubmit={handleRequestQuote} className="space-y-4" noValidate={false}>
          <InlineError>{quoteError}</InlineError>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quote-qty" className="label">
                Quantity ({pluralizeUnit(unit, 2)})
              </label>
              <input
                id="quote-qty"
                data-autofocus
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                required
                value={quoteForm.requestedQuantity}
                onChange={(e) => setQuoteForm((f) => ({ ...f, requestedQuantity: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="quote-target" className="label">
                Target price <span className="font-normal text-muted">(₹/{unit})</span>
              </label>
              <input
                id="quote-target"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="Optional"
                value={quoteForm.targetPrice}
                onChange={(e) => setQuoteForm((f) => ({ ...f, targetPrice: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="quote-message" className="label">
              Notes for the supplier <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="quote-message"
              rows={3}
              maxLength={1000}
              placeholder="Delivery city, deadline, colour or finish requirements…"
              value={quoteForm.message}
              onChange={(e) => setQuoteForm((f) => ({ ...f, message: e.target.value }))}
              className="input"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setQuoteOpen(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={quoteSubmitting} className="btn btn-primary flex-1">
              {quoteSubmitting && <Spinner />}
              {quoteSubmitting ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default ProductDetail;
