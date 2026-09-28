import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowUpTrayIcon, XMarkIcon, SparklesIcon, PlusIcon, TrashIcon, StarIcon } from '@heroicons/react/20/solid';
import { getProductById, createProduct, updateProduct, uploadProductImages } from '../../services/productService';
import { categorizeProduct } from '../../services/aiService';
import { useToast } from '../../components/ui/Toast';
import ProductImage from '../../components/ui/ProductImage';
import { ErrorState, InlineError, Skeleton, Spinner } from '../../components/ui/States';
import { UNIT_OPTIONS, unitAllowsDecimals } from '../../utils/units';
import { getErrorMessage } from '../../utils/errors';

const CATEGORIES = ['Cotton', 'Linen', 'Silk', 'Wool', 'Polyester', 'Denim', 'Blended', 'Organic Cotton', 'Technical Textiles', 'Home Textiles'];

const MAX_IMAGES = 8;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const EMPTY_FORM = {
  name: '',
  category: CATEGORIES[0],
  description: '',
  colors: '',
  stock: '',
  price: '',
  unit: UNIT_OPTIONS[0].value,
  moq: '',
  fabricWidth: '',
  rollLength: '',
  gsm: '',
  fabricComposition: '',
  leadTime: '',
  tags: '',
};

const splitList = (value) => [...new Set(value.split(',').map((v) => v.trim()).filter(Boolean))];
const num = (value) => (value === '' || value === null ? NaN : Number(value));

// Mirrors the server's rules (server/src/modules/products/product.service.js)
// so most mistakes are caught before a round trip. The server still decides.
function validate(form, tiers) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Give the product a name buyers will recognise.';
  else if (form.name.trim().length > 120) errors.name = 'Keep the name under 120 characters.';
  if (!form.description.trim()) errors.description = 'Describe the fabric — weave, finish, typical uses.';
  if (!form.category.trim()) errors.category = 'Choose or type a category.';
  if (!(num(form.price) > 0)) errors.price = 'Enter a price above ₹0.';
  if (!(num(form.stock) >= 0)) errors.stock = 'Enter the quantity you have available (0 or more).';
  else if (!unitAllowsDecimals(form.unit) && !Number.isInteger(num(form.stock))) errors.stock = 'Stock must be a whole number for this unit.';
  if (form.moq !== '' && !(num(form.moq) >= 1)) errors.moq = 'Minimum order must be at least 1.';
  if (form.gsm !== '' && !(num(form.gsm) > 0 && num(form.gsm) <= 2000)) errors.gsm = 'GSM is usually between 30 and 600.';
  tiers.forEach((t, i) => {
    if (!(num(t.minQty) >= 1) || !(num(t.price) > 0)) errors[`tier${i}`] = 'Enter a quantity of 1+ and a price above ₹0.';
  });
  return errors;
}

function Field({ id, label, hint, error, optional, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="grid gap-6 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-3">
      <div>
        <h2 className="font-display text-base font-bold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="space-y-5 lg:col-span-2">{children}</div>
    </section>
  );
}

function ProductFormPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // After a create whose image upload failed we keep editing the saved product.
  const [productId, setProductId] = useState(routeId || null);
  const isEditing = Boolean(productId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [tiers, setTiers] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageNotice, setImageNotice] = useState('');
  const [loadStatus, setLoadStatus] = useState(routeId ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiStatus, setAiStatus] = useState('idle'); // idle | loading | error
  const formRef = useRef(null);

  useEffect(() => {
    if (!routeId) return undefined;
    const controller = new AbortController();
    getProductById(routeId, { signal: controller.signal })
      .then(({ product: p }) => {
        setForm({
          name: p.name,
          category: p.category,
          description: p.description || '',
          colors: (p.colors || []).join(', '),
          stock: String(p.stock ?? ''),
          price: String(p.price ?? ''),
          unit: p.unit || UNIT_OPTIONS[0].value,
          moq: p.moq > 1 ? String(p.moq) : '',
          fabricWidth: p.fabricWidth || '',
          rollLength: p.rollLength || '',
          gsm: p.gsm ? String(p.gsm) : '',
          fabricComposition: p.fabricComposition || '',
          leadTime: p.leadTime || '',
          tags: (p.tags || []).join(', '),
        });
        setTiers((p.priceTiers || []).map((t) => ({ minQty: String(t.minQty), price: String(t.price) })));
        setExistingImages(p.images || []);
        setLoadStatus('ready');
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED') return;
        setLoadError(getErrorMessage(err, "We couldn't load this product."));
        setLoadStatus('error');
      });
    return () => controller.abort();
  }, [routeId]);

  // One object URL per selected file, revoked when the file is removed or the
  // page unmounts (previously a new URL leaked on every render).
  const previews = useMemo(() => imageFiles.map((file) => ({ file, url: URL.createObjectURL(file) })), [imageFiles]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const inputProps = (field) => ({
    id: `pf-${field}`,
    value: form[field],
    onChange: set(field),
    'aria-invalid': Boolean(errors[field]) || undefined,
    'aria-describedby': errors[field] ? `pf-${field}-error` : `pf-${field}-hint`,
    className: 'input',
  });

  const slotsLeft = MAX_IMAGES - existingImages.length - imageFiles.length;

  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file later
    const rejected = [];
    const accepted = [];
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) rejected.push(`${file.name} isn't a JPG, PNG, WebP or GIF`);
      else if (file.size > MAX_FILE_BYTES) rejected.push(`${file.name} is over 5MB`);
      else accepted.push(file);
    }
    setImageFiles((prev) => {
      const isDuplicate = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
      const merged = [...prev];
      for (const file of accepted) {
        if (merged.length >= MAX_IMAGES - existingImages.length) {
          rejected.push(`Only ${MAX_IMAGES} images per product`);
          break;
        }
        if (!merged.some((f) => isDuplicate(f, file))) merged.push(file);
      }
      return merged;
    });
    setImageNotice([...new Set(rejected)].join('. '));
  };

  const removeExisting = (img) => setExistingImages((list) => list.filter((i) => i !== img));
  const makeCover = (img) => setExistingImages((list) => [img, ...list.filter((i) => i !== img)]);

  const handleAiSuggest = async () => {
    if (!form.name.trim() || aiStatus === 'loading') return;
    setAiStatus('loading');
    try {
      const result = await categorizeProduct(form.name.trim(), form.description.trim());
      if (!result.category && !result.tags?.length) throw new Error('empty');
      setForm((f) => ({
        ...f,
        category: result.category || f.category,
        tags: result.tags?.length ? splitList([f.tags, ...result.tags].join(',')).join(', ') : f.tags,
      }));
      setAiStatus('idle');
      toast.success('Category and tags suggested — review before saving');
    } catch {
      setAiStatus('error');
    }
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    category: form.category.trim(),
    description: form.description.trim(),
    colors: splitList(form.colors),
    tags: splitList(form.tags),
    stock: Number(form.stock),
    price: Number(form.price),
    unit: form.unit,
    moq: form.moq ? Number(form.moq) : 1,
    gsm: form.gsm ? Number(form.gsm) : null,
    fabricWidth: form.fabricWidth.trim(),
    rollLength: form.rollLength.trim(),
    fabricComposition: form.fabricComposition.trim(),
    leadTime: form.leadTime.trim(),
    priceTiers: tiers.map((t) => ({ minQty: Number(t.minQty), price: Number(t.price) })),
    ...(isEditing ? { images: existingImages } : {}),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError('');

    const found = validate(form, tiers);
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      // Look the field up by id — the aria-invalid attributes from setErrors
      // haven't been rendered yet at this point.
      const id = firstError.startsWith('tier') ? `tier-qty-${firstError.slice(4)}` : `pf-${firstError}`;
      const field = document.getElementById(id);
      field?.focus({ preventScroll: true });
      field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    let savedId = productId;
    try {
      if (isEditing) {
        await updateProduct(productId, buildPayload());
      } else {
        const data = await createProduct(buildPayload());
        savedId = data.product._id;
        setProductId(savedId); // any retry now edits this product instead of creating a duplicate
      }
    } catch (err) {
      setSubmitError(getErrorMessage(err, "We couldn't save this product."));
      setSubmitting(false);
      return;
    }

    if (imageFiles.length > 0) {
      try {
        const data = await uploadProductImages(savedId, imageFiles);
        setExistingImages(data.product.images);
        setImageFiles([]);
      } catch (err) {
        setSubmitError(`Product details were saved, but the images didn't upload: ${getErrorMessage(err, 'upload failed')}. Your selected images are still here — save again to retry.`);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    toast.success(routeId ? 'Changes saved' : 'Product listed — buyers can find it now');
    navigate('/supplier/inventory');
  };

  if (loadStatus === 'loading') {
    return (
      <div className="mx-auto max-w-4xl space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (loadStatus === 'error') {
    return <ErrorState title="This product can't be edited" message={loadError} onRetry={() => navigate(0)} />;
  }

  const allowDecimals = unitAllowsDecimals(form.unit);
  const moqWarning = form.moq && form.stock !== '' && num(form.moq) > num(form.stock);

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/supplier/inventory" className="text-sm font-medium text-muted hover:text-ink">
        ← Inventory
      </Link>
      <h1 className="page-title mt-3">{routeId ? 'Edit product' : 'Add a product'}</h1>
      <p className="mt-1 text-sm text-muted">Complete specs and clear terms help buyers decide without back-and-forth.</p>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8">
        <div className="card px-5 py-8 sm:px-8">
          <Section title="Basics" description="What buyers see first in search results.">
            <Field id="pf-name" label="Product name" error={errors.name} hint="e.g. “Organic Cotton Poplin 120s”">
              <input {...inputProps('name')} maxLength={120} autoComplete="off" />
            </Field>
            <Field id="pf-description" label="Description" error={errors.description} hint="Weave, hand-feel, finish and typical end uses.">
              <textarea {...inputProps('description')} rows={4} maxLength={2000} />
            </Field>

            <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-2">
                <span className="font-semibold text-ink">Suggest category &amp; tags</span>
                <span className="block text-xs text-muted">Uses your name and description. You can edit the result.</span>
              </p>
              <button type="button" onClick={handleAiSuggest} disabled={!form.name.trim() || aiStatus === 'loading'} className="btn btn-sm btn-secondary flex-shrink-0">
                {aiStatus === 'loading' ? <Spinner className="h-3.5 w-3.5" /> : <SparklesIcon className="h-4 w-4 text-accent" />}
                {aiStatus === 'loading' ? 'Suggesting…' : 'Suggest'}
              </button>
            </div>
            {aiStatus === 'error' && <p className="field-error -mt-3">Suggestions are unavailable right now — you can fill these in yourself.</p>}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="pf-category" label="Category" error={errors.category}>
                <input {...inputProps('category')} list="category-options" maxLength={60} />
                <datalist id="category-options">
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </Field>
              <Field id="pf-tags" label="Tags" optional hint="Comma separated — e.g. breathable, summer">
                <input {...inputProps('tags')} maxLength={400} />
              </Field>
            </div>
            <Field id="pf-colors" label="Colours" optional hint="Comma separated — e.g. White, Indigo, Rust">
              <input {...inputProps('colors')} maxLength={400} />
            </Field>
          </Section>

          <Section title="Pricing & terms" description="Buyers filter and compare on these. The MOQ is enforced in the cart.">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field id="pf-unit" label="Selling unit">
                <select {...inputProps('unit')}>
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="pf-price" label={`Price per ${form.unit} (₹)`} error={errors.price}>
                <input {...inputProps('price')} type="number" inputMode="decimal" min="0.01" step="0.01" />
              </Field>
              <Field id="pf-stock" label={`Stock (${form.unit})`} error={errors.stock} hint={allowDecimals ? 'Decimals allowed' : 'Whole units'}>
                <input {...inputProps('stock')} type="number" inputMode={allowDecimals ? 'decimal' : 'numeric'} min="0" step={allowDecimals ? '0.01' : '1'} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="pf-moq"
                label="Minimum order quantity"
                optional
                error={errors.moq}
                hint={moqWarning ? '⚠ MOQ is higher than your stock — buyers won’t be able to order.' : 'Leave empty for no minimum.'}
              >
                <input {...inputProps('moq')} type="number" inputMode="decimal" min="1" step="any" placeholder="e.g. 50" />
              </Field>
              <Field id="pf-leadTime" label="Lead time" optional hint="How long until dispatch, e.g. 7–10 days">
                <input {...inputProps('leadTime')} maxLength={40} />
              </Field>
            </div>

            <fieldset>
              <legend className="label">
                Bulk price tiers <span className="font-normal text-muted">(optional)</span>
              </legend>
              <p className="field-hint -mt-1 mb-3">Lower per-{form.unit} prices that apply automatically at larger quantities.</p>
              {tiers.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {tiers.map((tier, i) => (
                    <li key={i}>
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`tier-qty-${i}`}>
                          Tier {i + 1} minimum quantity
                        </label>
                        <input
                          id={`tier-qty-${i}`}
                          type="number"
                          min="1"
                          step="any"
                          inputMode="decimal"
                          placeholder={`From qty (${form.unit})`}
                          value={tier.minQty}
                          aria-invalid={Boolean(errors[`tier${i}`]) || undefined}
                          onChange={(e) => setTiers((list) => list.map((t, j) => (j === i ? { ...t, minQty: e.target.value } : t)))}
                          className="input"
                        />
                        <label className="sr-only" htmlFor={`tier-price-${i}`}>
                          Tier {i + 1} price
                        </label>
                        <input
                          id={`tier-price-${i}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputMode="decimal"
                          placeholder={`₹ per ${form.unit}`}
                          value={tier.price}
                          aria-invalid={Boolean(errors[`tier${i}`]) || undefined}
                          onChange={(e) => setTiers((list) => list.map((t, j) => (j === i ? { ...t, price: e.target.value } : t)))}
                          className="input"
                        />
                        <button type="button" onClick={() => setTiers((list) => list.filter((_, j) => j !== i))} className="icon-btn flex-shrink-0 hover:text-danger" aria-label={`Remove tier ${i + 1}`}>
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      {errors[`tier${i}`] && <p className="field-error">{errors[`tier${i}`]}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {tiers.length < 10 && (
                <button type="button" onClick={() => setTiers((list) => [...list, { minQty: '', price: '' }])} className="btn btn-sm btn-ghost -ml-2">
                  <PlusIcon className="h-4 w-4" /> Add a tier
                </button>
              )}
            </fieldset>
          </Section>

          <Section title="Fabric specifications" description="The numbers buyers use to calculate yield and suitability.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="pf-fabricComposition" label="Composition" optional hint="e.g. 100% Cotton, 80/20 Poly-Cotton" className="sm:col-span-2">
                <input {...inputProps('fabricComposition')} maxLength={120} />
              </Field>
              <Field id="pf-gsm" label="Weight (GSM)" optional error={errors.gsm}>
                <input {...inputProps('gsm')} type="number" inputMode="numeric" min="1" max="2000" placeholder="e.g. 180" />
              </Field>
              <Field id="pf-fabricWidth" label="Width" optional hint="e.g. 58 in / 147 cm">
                <input {...inputProps('fabricWidth')} maxLength={40} />
              </Field>
              <Field id="pf-rollLength" label="Roll / piece length" optional hint="e.g. 50 m per roll">
                <input {...inputProps('rollLength')} maxLength={40} />
              </Field>
            </div>
          </Section>

          <Section title="Photos" description={`Up to ${MAX_IMAGES} images. The first is the cover shown in search. Close-ups of weave and drape work best.`}>
            {(existingImages.length > 0 || previews.length > 0) && (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {existingImages.map((img, i) => (
                  <li key={img} className="group relative">
                    <ProductImage src={img} className="aspect-square w-full rounded-xl" />
                    {i === 0 && <span className="badge absolute bottom-2 left-2 bg-ink/80 text-white">Cover</span>}
                    <div className="absolute right-1.5 top-1.5 flex gap-1">
                      {i > 0 && (
                        <button type="button" onClick={() => makeCover(img)} className="flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-ink shadow-sm hover:text-accent" aria-label={`Make image ${i + 1} the cover`} title="Make cover">
                          <StarIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => removeExisting(img)} className="flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-ink shadow-sm hover:text-danger" aria-label={`Remove image ${i + 1}`}>
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {previews.map(({ file, url }, i) => (
                  <li key={url} className="relative">
                    <img src={url} alt="" className="aspect-square w-full rounded-xl object-cover ring-2 ring-accent/40" />
                    <span className="badge absolute bottom-2 left-2 bg-accent-strong text-white">New</span>
                    <button
                      type="button"
                      onClick={() => setImageFiles((list) => list.filter((f) => f !== file))}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-ink shadow-sm hover:text-danger"
                      aria-label={`Remove new image ${i + 1}`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {routeId && existingImages.length === 0 && previews.length === 0 && <p className="text-sm text-warning">Buyers can’t judge a fabric without photos — add at least one.</p>}

            <label
              htmlFor="product-image-upload"
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                slotsLeft > 0 ? 'cursor-pointer border-line-strong hover:border-accent hover:bg-accent-soft/30' : 'cursor-not-allowed border-line opacity-60'
              }`}
            >
              <ArrowUpTrayIcon className="h-6 w-6 text-muted" aria-hidden="true" />
              <span className="mt-2 text-sm font-semibold text-ink">{slotsLeft > 0 ? 'Choose images' : 'Image limit reached'}</span>
              <span className="mt-0.5 text-xs text-muted">JPG, PNG, WebP or GIF · up to 5MB each · {Math.max(slotsLeft, 0)} slot{slotsLeft === 1 ? '' : 's'} left</span>
              <input id="product-image-upload" type="file" accept={ACCEPTED_TYPES.join(',')} multiple onChange={handleFileChange} disabled={slotsLeft <= 0} className="sr-only" />
            </label>
            {imageNotice && <p className="field-error">{imageNotice}</p>}
          </Section>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line bg-canvas/95 px-4 py-4 supports-[backdrop-filter]:backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
          {submitError && (
            <div className="mb-3">
              <InlineError>{submitError}</InlineError>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Link to="/supplier/inventory" className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" disabled={submitting} className="btn btn-accent min-w-[9rem]">
              {submitting && <Spinner />}
              {submitting ? (imageFiles.length ? 'Saving & uploading…' : 'Saving…') : isEditing ? 'Save changes' : 'List product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ProductFormPage;
