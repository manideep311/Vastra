import { useCallback, useEffect, useState } from 'react';
import { CheckBadgeIcon } from '@heroicons/react/20/solid';
import { getSupplierProfile, updateSupplierProfile } from '../../services/supplierService';
import { useToast } from '../../components/ui/Toast';
import { ErrorState, InlineError, Skeleton, Spinner } from '../../components/ui/States';
import { getErrorMessage } from '../../utils/errors';

const toForm = (p) => ({
  businessName: p.businessName || '',
  phone: p.contactInfo?.phone || '',
  email: p.contactInfo?.email || '',
  businessAddress: p.businessAddress || '',
  operatingHours: p.operatingHours || '',
  about: p.about || '',
});

function SupplierProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getSupplierProfile();
      setProfile(data.profile);
      setForm(toForm(data.profile));
      setStatus('ready');
    } catch (err) {
      setLoadError(getErrorMessage(err, "We couldn't load your profile."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const dirty = profile && form && JSON.stringify(toForm(profile)) !== JSON.stringify(form);
  const nameMissing = form && !form.businessName.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || nameMissing) return;
    setSaving(true);
    setSaveError('');
    try {
      const data = await updateSupplierProfile({
        businessName: form.businessName.trim(),
        businessAddress: form.businessAddress.trim(),
        operatingHours: form.operatingHours.trim(),
        about: form.about.trim(),
        contactInfo: { phone: form.phone.trim(), email: form.email.trim() },
      });
      setProfile(data.profile);
      setForm(toForm(data.profile));
      toast.success('Profile saved');
    } catch (err) {
      setSaveError(getErrorMessage(err, "We couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  if (status === 'error') return <ErrorState message={loadError} onRetry={load} />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">Business profile</h1>
      <p className="mt-1 text-sm text-muted">Shown to buyers on your product pages.</p>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line bg-surface px-5 py-4 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-ink">
          {profile.isVerified ? (
            <>
              <CheckBadgeIcon className="h-5 w-5 text-brand" aria-hidden="true" /> Verified supplier
            </>
          ) : (
            <span className="text-ink-2">Not yet verified</span>
          )}
        </span>
        <span className="text-muted">
          <span className="font-semibold tabular-nums text-ink">{profile.completedOrders || 0}</span> orders completed
        </span>
        <span className="text-xs text-muted sm:ml-auto">Verification and order counts are managed by Vastra.</span>
      </div>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6" noValidate>
        <div>
          <label htmlFor="sp-name" className="label">
            Business name
          </label>
          <input id="sp-name" value={form.businessName} onChange={set('businessName')} maxLength={120} aria-invalid={nameMissing || undefined} className="input" />
          {nameMissing && <p className="field-error">Your business name is required.</p>}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="sp-phone" className="label">
              Contact phone
            </label>
            <input id="sp-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} maxLength={30} className="input" />
          </div>
          <div>
            <label htmlFor="sp-email" className="label">
              Contact email
            </label>
            <input id="sp-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} maxLength={254} className="input" />
          </div>
        </div>
        <div>
          <label htmlFor="sp-address" className="label">
            Business address
          </label>
          <textarea id="sp-address" rows={2} value={form.businessAddress} onChange={set('businessAddress')} maxLength={500} className="input" />
          <p className="field-hint">City and state are shown to buyers next to your listings.</p>
        </div>
        <div>
          <label htmlFor="sp-hours" className="label">
            Operating hours
          </label>
          <input id="sp-hours" value={form.operatingHours} onChange={set('operatingHours')} maxLength={60} placeholder="e.g. Mon–Sat 9am–6pm" className="input" />
        </div>
        <div>
          <label htmlFor="sp-about" className="label">
            About your business <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="sp-about"
            rows={4}
            value={form.about}
            onChange={set('about')}
            maxLength={1000}
            placeholder="What you make, where your mill is, the kinds of buyers you work with…"
            className="input"
          />
          <p className="field-hint">{form.about.length}/1000</p>
        </div>

        <InlineError>{saveError}</InlineError>

        <div className="flex items-center justify-end gap-3 border-t border-line pt-5">
          {dirty && !saving && <span className="text-xs text-muted">Unsaved changes</span>}
          <button type="submit" disabled={saving || !dirty || nameMissing} className="btn btn-accent">
            {saving && <Spinner />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SupplierProfilePage;
