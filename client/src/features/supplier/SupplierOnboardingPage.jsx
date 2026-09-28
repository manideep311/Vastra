import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitSupplierOnboarding } from '../../services/supplierService';
import { useSupplierAuth } from '../../context/SupplierAuthContext';
import { OnboardingShell, ChoiceChips } from '../../components/OnboardingShell';
import { InlineError, Spinner } from '../../components/ui/States';
import { getErrorMessage } from '../../utils/errors';

const FABRIC_OPTIONS = ['Cotton', 'Linen', 'Silk', 'Wool', 'Polyester', 'Denim', 'Blended', 'Technical Textiles'];
const BUSINESS_TYPES = ['Manufacturer', 'Wholesaler', 'Distributor', 'Trading Company', 'Mill/Factory', 'Other'];
const OPERATING_HOURS_OPTIONS = ['Mon–Fri 9am–5pm', 'Mon–Sat 9am–6pm', 'Mon–Sat 8am–8pm', '24/7', 'Other'];
const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+86', '+61'];

function SupplierOnboardingPage() {
  const [form, setForm] = useState({
    businessName: '',
    businessType: BUSINESS_TYPES[0],
    phone: '',
    email: '',
    businessAddress: '',
    operatingHours: OPERATING_HOURS_OPTIONS[1],
    fabricTypesOffered: [],
    moq: '',
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { updateProfile } = useSupplierAuth();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggleFabric = (value) =>
    setForm((f) => ({
      ...f,
      fabricTypesOffered: f.fabricTypesOffered.includes(value) ? f.fabricTypesOffered.filter((v) => v !== value) : [...f.fabricTypesOffered, value],
    }));

  const nameError = !form.businessName.trim() ? 'Your business name is shown to buyers — it’s required.' : '';
  const phoneError = form.phone && (form.phone.length < 7 || form.phone.length > 15) ? 'Enter 7–15 digits.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (submitting || nameError || phoneError) return;
    setError('');
    setSubmitting(true);
    try {
      await submitSupplierOnboarding({
        businessName: form.businessName.trim(),
        businessType: form.businessType,
        contactInfo: { phone: form.phone ? `${countryCode} ${form.phone}` : '', email: form.email.trim() },
        businessAddress: form.businessAddress.trim(),
        operatingHours: form.operatingHours,
        fabricTypesOffered: form.fabricTypesOffered,
        moq: form.moq ? Number(form.moq) : undefined,
      });
      updateProfile({ onboardingComplete: true });
      navigate('/supplier', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't save your business profile."));
      setSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      step="Supplier setup"
      title="Set up your business profile"
      description="Buyers see this next to every product you list. You can change it later from your profile."
    >
      <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8" noValidate>
        <div>
          <label htmlFor="so-name" className="label">
            Business name
          </label>
          <input
            id="so-name"
            value={form.businessName}
            onChange={set('businessName')}
            maxLength={120}
            autoComplete="organization"
            aria-invalid={Boolean(touched && nameError) || undefined}
            className="input"
          />
          {touched && nameError && <p className="field-error">{nameError}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="so-type" className="label">
              Business type
            </label>
            <select id="so-type" value={form.businessType} onChange={set('businessType')} className="input">
              {BUSINESS_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="so-hours" className="label">
              Operating hours
            </label>
            <select id="so-hours" value={form.operatingHours} onChange={set('operatingHours')} className="input">
              {OPERATING_HOURS_OPTIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="so-phone" className="label">
              Phone <span className="font-normal text-muted">(optional)</span>
            </label>
            <div className="flex gap-2">
              <label htmlFor="so-country" className="sr-only">
                Country code
              </label>
              <select id="so-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="input w-24">
                {COUNTRY_CODES.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
              <input
                id="so-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={15}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                aria-invalid={Boolean(touched && phoneError) || undefined}
                className="input min-w-0 flex-1"
              />
            </div>
            {touched && phoneError && <p className="field-error">{phoneError}</p>}
          </div>
          <div>
            <label htmlFor="so-email" className="label">
              Contact email <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="so-email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={set('email')} className="input" />
          </div>
        </div>

        <div>
          <label htmlFor="so-address" className="label">
            Business address
          </label>
          <textarea id="so-address" rows={2} maxLength={500} value={form.businessAddress} onChange={set('businessAddress')} placeholder="Mill / warehouse address, city, state" className="input" />
        </div>

        <ChoiceChips legend="Fabrics you supply" options={FABRIC_OPTIONS} selected={form.fabricTypesOffered} onToggle={toggleFabric} />

        <div>
          <label htmlFor="so-moq" className="label">
            Typical minimum order <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="so-moq" type="number" min="1" inputMode="numeric" placeholder="e.g. 300" value={form.moq} onChange={set('moq')} className="input sm:w-48" />
          <p className="field-hint">You’ll set an exact MOQ on each product.</p>
        </div>

        <InlineError>{error}</InlineError>

        <div className="flex justify-end border-t border-line pt-6">
          <button type="submit" disabled={submitting} className="btn btn-accent">
            {submitting && <Spinner />}
            {submitting ? 'Saving…' : 'Continue to dashboard'}
          </button>
        </div>
      </form>
    </OnboardingShell>
  );
}

export default SupplierOnboardingPage;
