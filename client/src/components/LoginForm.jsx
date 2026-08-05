import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import { useSupplierAuth } from '../context/SupplierAuthContext';
import { SparklesIcon, ShieldCheckIcon, TruckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

/**
 * Shared login form used by both BuyerLoginPage and SupplierLoginPage — the
 * two pages only differ in copy, branding accent, and what happens after a
 * successful login, so all of that is passed in as props instead of
 * duplicating the form markup/logic per role.
 */
function LoginForm({ role, badgeText, heading, subheading, accentClasses, registerHref, onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Each role's login is backed by its own isolated auth context/session —
  // whichever one matches this form's `role` prop is the only one used.
  const buyerAuth = useBuyerAuth();
  const supplierAuth = useSupplierAuth();
  const { loginUser } = role === 'supplier' ? supplierAuth : buyerAuth;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await loginUser(email, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
      {/* Brand panel */}
      <div className={`hidden lg:flex lg:col-span-2 relative overflow-hidden ${accentClasses.panel} text-white flex-col justify-between p-12`}>
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-28 left-10 w-80 h-80 bg-white/10 rounded-full blur-3xl" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-600 flex items-center justify-center font-display font-extrabold text-emerald-950">V</span>
            <span className="flex flex-col leading-none">
              <span className="font-serif-display text-xl font-bold tracking-wide">VASTRA</span>
              <span className="text-[10px] font-medium text-emerald-300 tracking-wide mt-0.5">Where Tradition Meets Trade</span>
            </span>
          </Link>

          <h1 className="font-display text-4xl font-extrabold leading-[1.15] mt-16 max-w-md">{heading}</h1>
          <p className="text-white/80 mt-4 max-w-sm">{subheading}</p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          <div className="flex flex-col items-start gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-amber-300" />
            <p className="text-sm font-medium text-white/90">Verified Suppliers</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <TruckIcon className="w-5 h-5 text-amber-300" />
            <p className="text-sm font-medium text-white/90">Reliable Fulfillment</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <GlobeAltIcon className="w-5 h-5 text-amber-300" />
            <p className="text-sm font-medium text-white/90">Global Sourcing</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="lg:col-span-3 flex items-center justify-center px-6 py-16 bg-[#fdfbf8]">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-800 flex items-center justify-center font-display font-extrabold text-white">V</span>
            <span className="flex flex-col leading-none">
              <span className="font-serif-display text-xl font-bold tracking-wide text-slate-900">VASTRA</span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wide mt-0.5">Where Tradition Meets Trade</span>
            </span>
          </div>

          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4 ${accentClasses.badge}`}>
            <SparklesIcon className="w-3.5 h-3.5" />
            {badgeText}
          </span>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">{role === 'supplier' ? 'Supplier sign in' : 'Log in to your account'}</h1>
          <p className="text-slate-500 text-sm mt-2">
            {role === 'supplier' ? 'Access your supplier dashboard and manage your listings.' : 'Access your marketplace dashboard and orders.'}
          </p>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mt-6">{error}</p>
          )}

          <div className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className={`w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 transition-shadow ${accentClasses.ring}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={`w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 transition-shadow ${accentClasses.ring}`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-full py-3 font-semibold mt-8 text-white transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50 ${accentClasses.button}`}
          >
            {submitting ? 'Logging in...' : 'Log in'}
          </button>

          <p className="text-sm text-slate-500 text-center mt-6">
            No account? <Link to={registerHref} className="text-emerald-800 font-medium hover:text-emerald-900">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginForm;
