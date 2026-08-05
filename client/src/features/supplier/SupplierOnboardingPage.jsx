import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitSupplierOnboarding } from '../../services/supplierService';
import { useSupplierAuth } from '../../context/SupplierAuthContext';
import { SparklesIcon } from '@heroicons/react/24/outline';

const CATEGORY_OPTIONS = ['Cotton', 'Linen', 'Silk', 'Wool', 'Polyester'];
const BUSINESS_TYPES = ['Manufacturer', 'Wholesaler', 'Distributor', 'Trading Company', 'Mill/Factory', 'Other'];
const OPERATING_HOURS_OPTIONS = ['Mon-Fri 9am-5pm', 'Mon-Sat 9am-6pm', 'Mon-Sat 8am-8pm', '24/7', 'Other'];
const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA/Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+61', label: 'Australia (+61)' },
];

function SupplierOnboardingPage() {
  const [form, setForm] = useState({
    businessName: '',
    businessType: BUSINESS_TYPES[0],
    contactInfo: { phone: '', email: '' },
    businessAddress: '',
    operatingHours: OPERATING_HOURS_OPTIONS[0],
    productCategories: [],
    fabricTypesOffered: [],
    moq: '',
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { updateProfile } = useSupplierAuth();

  const toggleCategory = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
    }));
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setForm({ ...form, contactInfo: { ...form.contactInfo, phone: digitsOnly } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        contactInfo: { ...form.contactInfo, phone: `${countryCode} ${form.contactInfo.phone}` },
        moq: Number(form.moq) || 0,
      };
      await submitSupplierOnboarding(payload);
      updateProfile({ onboardingComplete: true });
      navigate('/supplier');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fdfbf8] flex items-center justify-center px-4 py-12">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl" />
      <form onSubmit={handleSubmit} className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-emerald-900/5 border border-slate-200/70 p-8 max-w-lg w-full space-y-5">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <SparklesIcon className="w-3.5 h-3.5" />
            Supplier setup
          </span>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Set up your business profile</h1>
          <p className="text-slate-500 text-sm mt-1">This appears to buyers browsing the marketplace.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
          <input
            type="text"
            required
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          />
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="border border-slate-200 rounded-xl px-2.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="numeric"
                value={form.contactInfo.phone}
                onChange={handlePhoneChange}
                minLength={7}
                maxLength={12}
                placeholder="9876543210"
                className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
            <input
              type="email"
              value={form.contactInfo.email}
              onChange={(e) => setForm({ ...form, contactInfo: { ...form.contactInfo, email: e.target.value } })}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
          <textarea
            rows={2}
            value={form.businessAddress}
            onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Operating Hours</label>
          <select
            value={form.operatingHours}
            onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          >
            {OPERATING_HOURS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Fabric Types Offered</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => toggleCategory('fabricTypesOffered', cat)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                  form.fabricTypesOffered.includes(cat) ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Order Quantity (MOQ)</label>
          <input
            type="number"
            min="1"
            list="moq-suggestions"
            placeholder="e.g. 300"
            value={form.moq}
            onChange={(e) => setForm({ ...form, moq: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
          />
          <datalist id="moq-suggestions">
            <option value="50" />
            <option value="100" />
            <option value="250" />
            <option value="500" />
            <option value="1000" />
          </datalist>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-3 rounded-full font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Continue to Dashboard'}
        </button>
      </form>
    </div>
  );
}

export default SupplierOnboardingPage;