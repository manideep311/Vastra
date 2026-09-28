import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import { useSupplierAuth } from '../context/SupplierAuthContext';
import { AuthLayout, PasswordInput } from './AuthLayout';
import { InlineError, Spinner } from './ui/States';
import { getErrorMessage } from '../utils/errors';

/**
 * Shared login form used by both BuyerLoginPage and SupplierLoginPage. Each
 * role signs in through its own isolated auth context — whichever matches
 * `role` is the only one used, so a buyer login can never create a supplier
 * session or vice versa.
 */
function LoginForm({ role, heading, subheading, title, description, registerHref, redirectTo, switchLink }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const buyerAuth = useBuyerAuth();
  const supplierAuth = useSupplierAuth();
  const { loginUser, isLoggedIn } = role === 'supplier' ? supplierAuth : buyerAuth;

  // Already signed in as this role — nothing to do here.
  if (isLoggedIn && !submitting) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await loginUser(email.trim(), password);
      // The <Navigate> above takes over once the session exists.
      setSubmitting(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Sign in failed. Please try again.'));
      setPassword('');
      setSubmitting(false);
    }
  };

  const primary = role === 'supplier' ? 'btn-accent' : 'btn-primary';

  return (
    <AuthLayout heading={heading} subheading={subheading}>
      <h1 className="page-title">{title}</h1>
      <p className="mt-2 text-sm text-muted">{description}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <InlineError>{error}</InlineError>
        <div>
          <label htmlFor={`${role}-login-email`} className="label">
            Email
          </label>
          <input
            id={`${role}-login-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
            className="input"
          />
        </div>
        <div>
          <label htmlFor={`${role}-login-password`} className="label">
            Password
          </label>
          <PasswordInput id={`${role}-login-password`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <button type="submit" disabled={submitting} className={`btn btn-lg w-full ${primary}`}>
          {submitting && <Spinner />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to Vastra?{' '}
        <Link to={registerHref} className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
      {switchLink && <p className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">{switchLink}</p>}
    </AuthLayout>
  );
}

export default LoginForm;
