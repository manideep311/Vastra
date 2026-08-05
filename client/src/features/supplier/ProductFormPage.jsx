import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById, createProduct, updateProduct, uploadProductImages } from '../../services/productService';
import { categorizeProduct } from '../../services/aiService';
import { getImageUrl } from '../../utils/config';
import { UNIT_OPTIONS } from '../../utils/units';
import { ArrowUpTrayIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
  'Cotton', 'Linen', 'Silk', 'Wool', 'Polyester',
  'Denim', 'Blended', 'Organic Cotton', 'Technical Textiles', 'Home Textiles',
];

function ProductFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
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
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imageLimitNotice, setImageLimitNotice] = useState('');
  const [existingImages, setExistingImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      getProductById(id).then((data) => {
        const p = data.product;
        setForm({
          name: p.name,
          category: p.category,
          description: p.description || '',
          colors: (p.colors || []).join(', '),
          stock: p.stock,
          price: p.price,
          unit: p.unit || UNIT_OPTIONS[0].value,
          moq: p.moq || '',
          fabricWidth: p.fabricWidth || '',
          rollLength: p.rollLength || '',
          gsm: p.gsm || '',
          fabricComposition: p.fabricComposition || '',
          leadTime: p.leadTime || '',
          tags: (p.tags || []).join(', '),
        });
        setExistingImages(p.images || []);
      });
    }
  }, [id]);

  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files);
    setImageFiles((prev) => {
      // Append to whatever's already picked (instead of replacing it), skip
      // exact duplicates, and cap the combined total at 5.
      const isDuplicate = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
      const merged = [...prev];
      for (const file of incoming) {
        if (merged.length >= 5) break;
        if (!merged.some((f) => isDuplicate(f, file))) merged.push(file);
      }
      const wasTrimmed = merged.length < prev.length + incoming.length;
      setImageLimitNotice(wasTrimmed ? 'Only 5 images allowed per product — extra selections were skipped.' : '');
      return merged;
    });
    // Reset the input so picking the same file(s) again later still fires onChange.
    e.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImageLimitNotice('');
  };

  const handleAiSuggest = async () => {
    if (!form.name || !form.description) return;
    setAiLoading(true);
    try {
      const result = await categorizeProduct(form.name, form.description);
      setForm((prev) => ({
        ...prev,
        category: result.category || prev.category,
        tags: result.tags?.length ? result.tags.join(', ') : prev.tags,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description,
        colors: form.colors.split(',').map((c) => c.trim()).filter(Boolean),
        stock: Number(form.stock),
        price: Number(form.price),
        unit: form.unit,
        moq: form.moq ? Number(form.moq) : undefined,
        fabricWidth: form.fabricWidth || undefined,
        rollLength: form.rollLength || undefined,
        gsm: form.gsm ? Number(form.gsm) : undefined,
        fabricComposition: form.fabricComposition || undefined,
        leadTime: form.leadTime || undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      let productId = id;
      if (isEditing) {
        await updateProduct(id, payload);
      } else {
        const data = await createProduct(payload);
        productId = data.product._id;
      }

      if (imageFiles.length > 0) {
        await uploadProductImages(productId, imageFiles);
      }

      navigate('/supplier/inventory');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">{isEditing ? 'Edit Product' : 'Add Product'}</h1>

      <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 space-y-4 shadow-sm">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            rows={3}
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
          />
        </div>

        <div className="flex items-center justify-between bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-800">Let AI suggest a category &amp; tags from your name/description.</p>
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={aiLoading || !form.name || !form.description}
            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500 text-white px-3 py-1.5 rounded-full hover:bg-amber-600 transition-colors disabled:opacity-40 flex-shrink-0 ml-3"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            {aiLoading ? 'Thinking...' : 'AI Suggest'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <input
              type="text"
              list="category-options"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
            />
            <datalist id="category-options">
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (optional)</label>
            <input
              type="text"
              placeholder="e.g. breathable, summer"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Colors (comma-separated)</label>
          <input
            type="text"
            placeholder="e.g. White, Beige, Indigo"
            value={form.colors}
            onChange={(e) => setForm({ ...form, colors: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
            <input
              type="number"
              min="0"
              required
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price per unit (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
            />
          </div>
        </div>

        {/* Fabric measurements — textile-specific specs buyers rely on to calculate yield */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-800 mb-3 mt-3">Fabric Measurements</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">MOQ (min. order qty)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={form.moq}
                onChange={(e) => setForm({ ...form, moq: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fabric width</label>
              <input
                type="text"
                placeholder="e.g. 44 in / 150 cm"
                value={form.fabricWidth}
                onChange={(e) => setForm({ ...form, fabricWidth: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Roll/piece length</label>
              <input
                type="text"
                placeholder="e.g. 25 meters/roll"
                value={form.rollLength}
                onChange={(e) => setForm({ ...form, rollLength: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (GSM)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 180"
                value={form.gsm}
                onChange={(e) => setForm({ ...form, gsm: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead time</label>
              <input
                type="text"
                placeholder="e.g. 10-15 days"
                value={form.leadTime}
                onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fabric composition</label>
              <input
                type="text"
                placeholder="e.g. 100% Cotton, 80/20 Poly-Cotton"
                value={form.fabricComposition}
                onChange={(e) => setForm({ ...form, fabricComposition: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
              />
            </div>
          </div>
        </div>

        {existingImages.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Current Images</p>
            <div className="flex gap-2 flex-wrap">
              {existingImages.map((img) => (
                <img key={img} src={getImageUrl(img)} alt="" className="w-16 h-16 object-cover rounded-xl" />
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {existingImages.length > 0 ? 'Add More Images' : 'Product Images'}
          </label>
          <label
            htmlFor="product-image-upload"
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl px-4 py-10 text-center cursor-pointer transition-all duration-200 hover:border-amber-400 hover:bg-amber-50/30"
          >
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
              <ArrowUpTrayIcon className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-slate-600 font-medium">
              {imageFiles.length > 0 ? `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} selected` : 'Click to upload images'}
            </span>
            <span className="text-xs text-slate-400 mt-1">PNG or JPG, up to 5 images, 5MB each</span>
            <input
              id="product-image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={imageFiles.length >= 5}
              className="hidden"
            />
          </label>

          {imageLimitNotice && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 mt-2">{imageLimitNotice}</p>
          )}

          {imageFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              {imageFiles.map((file, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Product'}
        </button>
      </form>
    </div>
  );
}

export default ProductFormPage;
