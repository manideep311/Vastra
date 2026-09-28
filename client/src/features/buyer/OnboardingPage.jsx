import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitOnboarding } from '../../services/buyerService';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { OnboardingShell, ChoiceChips } from '../../components/OnboardingShell';
import { InlineError, Spinner } from '../../components/ui/States';
import { getErrorMessage } from '../../utils/errors';

const FABRIC_OPTIONS = ['Cotton', 'Linen', 'Silk', 'Wool', 'Polyester', 'Organic Cotton', 'Denim', 'Blended'];
const CATEGORY_OPTIONS = ['Apparel', 'Home Textiles', 'Industrial', 'Accessories'];
const BUSINESS_TYPES = ['Retailer', 'Manufacturer', 'Wholesaler', 'Distributor', 'Boutique', 'E-commerce Brand', 'Other'];
const INDUSTRIES = ['Fashion', 'Home Goods', 'Automotive', 'Industrial', 'Hospitality', 'Other'];
const ORDER_QUANTITIES = ['Under 100 units', '100–500 units', '500–1,000 units', '1,000–5,000 units', '5,000+ units'];
const BUDGET_RANGES = ['Under ₹1 lakh', '₹1–5 lakh', '₹5–10 lakh', '₹10–50 lakh', '₹50 lakh+'];

function Select({ id, label, value, options, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

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
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { updateProfile } = useBuyerAuth();

  const setField = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const toggle = (field) => (value) =>
    setForm((f) => ({ ...f, [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await submitOnboarding(form);
      updateProfile({ onboardingComplete: true });
      navigate('/home', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't save your preferences."));
      setSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      step="Buyer setup · 1 minute"
      title="Tell us about your business"
      description="We use this to recommend fabrics and suppliers that fit what you make. You can skip it and browse right away."
    >
      <form onSubmit={handleSubmit} className="card space-y-6 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Select id="ob-type" label="Business type" value={form.businessType} options={BUSINESS_TYPES} onChange={setField('businessType')} />
          <Select id="ob-industry" label="Industry" value={form.industry} options={INDUSTRIES} onChange={setField('industry')} />
        </div>
        <ChoiceChips legend="What do you make?" options={CATEGORY_OPTIONS} selected={form.categoriesOfInterest} onToggle={toggle('categoriesOfInterest')} />
        <ChoiceChips legend="Fabrics you usually buy" hint="Pick as many as apply." options={FABRIC_OPTIONS} selected={form.preferredFabricTypes} onToggle={toggle('preferredFabricTypes')} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select id="ob-qty" label="Typical order size" value={form.typicalOrderQuantity} options={ORDER_QUANTITIES} onChange={setField('typicalOrderQuantity')} />
          <Select id="ob-budget" label="Budget per order" value={form.budgetRange} options={BUDGET_RANGES} onChange={setField('budgetRange')} />
        </div>

        <InlineError>{error}</InlineError>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => navigate('/home', { replace: true })} disabled={submitting} className="btn btn-ghost">
            Skip for now
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting && <Spinner />}
            {submitting ? 'Saving…' : 'Save and start sourcing'}
          </button>
        </div>
      </form>
    </OnboardingShell>
  );
}

export default OnboardingPage;
