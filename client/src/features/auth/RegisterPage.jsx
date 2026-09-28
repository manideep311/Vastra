import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShoppingBagIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useSupplierAuth } from '../../context/SupplierAuthContext';
import { AuthLayout, PasswordInput } from '../../components/AuthLayout';
import { InlineError, Spinner } from '../../components/ui/States';
import { getErrorMessage } from '../../utils/errors';

const MIN_PASSWORD = 8; // matches the server-side policy in auth.service.js

const ROLES = [
  { value: 'buyer', label: 'Buyer', hint: 'I source fabric', icon: ShoppingBagIcon },
  { value: 'supplier', label: 'Supplier', hint: 'I sell fabric', icon: BuildingStorefrontIcon },
];

function RegisterPage() {
  const [searchParams] = useSearchParams();
  // Arriving via a role-specific entry point (e.g. "Join as Supplier") locks
  // the form to that role — no toggle, no accidental buyer signup.
  const lockedRole = ['buyer', 'supplier'].includes(searchParams.get('role')) ? searchParams.get('role') : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(lockedRole || 'buyer');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { registerUser: registerBuyer } = useBuyerAuth();
  const { registerUser: registerSupplier } = useSupplierAuth();
  const navigate = useNavigate();

  const passwordLongEnough = password.length >= MIN_PASSWORD;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!passwordLongEnough) {
      setError(`Choose a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      // Registering as one role only ever creates a session for that role's
      // own context — it never touches the other role's session.
      const user = role === 'buyer' ? await registerBuyer(email.trim(), password) : await registerSupplier(email.trim(), password);
      navigate(user.role === 'buyer' ? '/buyer/onboarding' : '/supplier/onboarding', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't create your account."));
      setSubmitting(false);
    }
  };

  const isSupplier = role === 'supplier';

  return (
    <AuthLayout
      heading={isSupplier ? 'Put your mill in front of serious buyers.' : 'Where tradition meets trade.'}
      subheading={
        isSupplier
          ? 'List fabrics with real specs and MOQs, respond to bulk quote requests, and manage orders in one place.'
          : 'One account to compare suppliers, order at minimum quantities and negotiate bulk prices.'
      }
    >
      <h1 className="page-title">{lockedRole === 'supplier' ? 'Create your supplier account' : lockedRole === 'buyer' ? 'Create your buyer account' : 'Create your account'}</h1>
      <p className="mt-2 text-sm text-muted">{isSupplier ? 'Start listing fabrics in a few minutes.' : 'Start sourcing fabric in a few minutes.'}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <InlineError>{error}</InlineError>

        {!lockedRole && (
          <fieldset>
            <legend className="label">I’m joining as a…</legend>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((r) => {
                const active = role === r.value;
                return (
                  <label
                    key={r.value}
                    className={`relative flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/15 ${
                      active ? 'border-ink bg-surface' : 'border-line bg-surface hover:border-line-strong'
                    }`}
                  >
                    <input type="radio" name="role" value={r.value} checked={active} onChange={() => setRole(r.value)} className="sr-only" />
                    <r.icon className={`h-5 w-5 ${active ? 'text-ink' : 'text-muted'}`} aria-hidden="true" />
                    <span className="mt-1 text-sm font-semibold text-ink">{r.label}</span>
                    <span className="text-xs text-muted">{r.hint}</span>
                    {active && <CheckIcon className="absolute right-3 top-3 h-4 w-4 text-ink" aria-hidden="true" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="register-email" className="label">
            Work email
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@company.com"
            maxLength={254}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="register-password" className="label">
            Password
          </label>
          <PasswordInput
            id="register-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            describedBy="register-password-rule"
          />
          <p id="register-password-rule" className={`mt-1.5 flex items-center gap-1.5 text-xs ${passwordLongEnough ? 'text-success' : 'text-muted'}`}>
            <CheckIcon className={`h-3.5 w-3.5 ${passwordLongEnough ? 'opacity-100' : 'opacity-30'}`} aria-hidden="true" />
            At least {MIN_PASSWORD} characters
          </p>
        </div>

        <button type="submit" disabled={submitting} className={`btn btn-lg w-full ${isSupplier ? 'btn-accent' : 'btn-primary'}`}>
          {submitting && <Spinner />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to={isSupplier ? '/supplier/login' : '/buyer/login'} className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;
