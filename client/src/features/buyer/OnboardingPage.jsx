import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitOnboarding } from '../../services/buyerService';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { SparklesIcon } from '@heroicons/react/24/outline';

const FABRIC_OPTIONS = ['Cotton', 'Linen', 'Silk', 'Wool', 'Polyester', 'Organic Cotton'];
const CATEGORY_OPTIONS = ['Apparel', 'Home Textiles', 'Industrial', 'Accessories'];
const BUSINESS_TYPES = ['Retailer', 'Manufacturer', 'Wholesaler', 'Distributor', 'Boutique', 'E-commerce Brand', 'Other'];
const INDUSTRIES = ['Fashion', 'Home Goods', 'Automotive', 'Industrial', 'Hospitality', 'Other'];
const ORDER_QUANTITIES = ['Under 100 units', '100-500 units', '500-1000 units', '1000-5000 units', '5000+ units'];
const BUDGET_RANGES = ['Under $1,000', '$1,000-$5,000', '$5,000-$10,000', '$10,000-$50,000', '$50,000+'];

function OnboardingPage() {
  const [form, setForm] = useState({
    businessType: BUSINESS_TYPES[0],
    industry: INDUSTRIES[0],
    categoriesOfInterest: [],
    preferredFabricTypes: [],
    typicalOrderQuantity: ORDER_QUANTITIES[0],
    budgetRange: BUDGET_RANGES[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { updateProfile } = useBuyerAuth();

  const toggleValue = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitOnboarding(form);
      updateProfile({ onboardingComplete: true });
      navigate('/home');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fdfbf8] flex items-center justify-center px-4 py-12">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
      <form onSubmit={handleSubmit} className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-emerald-900/5 border border-slate-200/70 p-8 max-w-lg w-full space-y-6">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <SparklesIcon className="w-3.5 h-3.5" />
            One quick step
          </span>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Tell us about your business</h1>
          <p className="text-slate-500 text-sm mt-1">This helps us personalize product recommendations for you.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
          <select
            value={form.businessType}
            onChange={(e) => setForm({ ...form, businessType: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          >
            {BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
          <select
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Product Categories of Interest</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => toggleValue('categoriesOfInterest', cat)}
                className={`px-3.5 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                  form.categoriesOfInterest.includes(cat) ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm shadow-emerald-700/20' : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Fabric Types</label>
          <div className="flex gap-2 flex-wrap">
            {FABRIC_OPTIONS.map((fabric) => (
              <button
                type="button"
                key={fabric}
                onClick={() => toggleValue('preferredFabricTypes', fabric)}
                className={`px-3.5 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                  form.preferredFabricTypes.includes(fabric) ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                }`}
              >
                {fabric}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Typical Order Quantity</label>
          <select
            value={form.typicalOrderQuantity}
            onChange={(e) => setForm({ ...form, typicalOrderQuantity: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          >
            {ORDER_QUANTITIES.map((qty) => (
              <option key={qty} value={qty}>{qty}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Budget Range</label>
          <select
            value={form.budgetRange}
            onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          >
            {BUDGET_RANGES.map((range) => (
              <option key={range} value={range}>{range}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-3 rounded-full font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Continue to Marketplace'}
        </button>
      </form>
    </div>
  );
}

export default OnboardingPage;