import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useSupplierAuth } from '../../context/SupplierAuthContext';
import { SparklesIcon, ShieldCheckIcon, TruckIcon, GlobeAltIcon, BuildingStorefrontIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { registerUser: registerBuyer } = useBuyerAuth();
  const { registerUser: registerSupplier } = useSupplierAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Registering as one role only ever creates a session for that role's
      // own context — it never touches the other role's session.
      const user = role === 'buyer' ? await registerBuyer(email, password) : await registerSupplier(email, password);
      navigate(user.role === 'buyer' ? '/buyer/onboarding' : '/supplier/onboarding');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white flex-col justify-between p-12">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-600/25 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-28 left-10 w-80 h-80 bg-emerald-500/25 rounded-full blur-3xl" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-600 flex items-center justify-center font-display font-extrabold text-emerald-950">V</span>
            <span className="flex flex-col leading-none">
              <span className="font-serif-display text-xl font-bold tracking-wide">VASTRA</span>
              <span className="text-[10px] font-medium text-emerald-300 tracking-wide mt-0.5">Where Tradition Meets Trade</span>
            </span>
          </Link>

          <h1 className="font-display text-4xl font-extrabold leading-[1.15] mt-16 max-w-md">
            Join a trusted network of textile buyers and suppliers.
          </h1>
          <p className="text-emerald-200 mt-4 max-w-sm">
            Create your account in minutes and start sourcing — or selling — premium fabrics today.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          <div className="flex flex-col items-start gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-amber-300" />
            <p className="text-sm font-medium text-emerald-100">Verified Suppliers</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <TruckIcon className="w-5 h-5 text-amber-300" />
            <p className="text-sm font-medium text-emerald-100">Reliable Fulfillment</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <GlobeAltIcon className="w-5 h-5 text-amber-300" />
            <p className="text-sm font-medium text-emerald-100">Global Sourcing</p>
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

          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <SparklesIcon className="w-3.5 h-3.5" />
            Get started
          </span>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-2">Set up your marketplace profile in a minute.</p>

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
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 transition-all duration-200 ${
                    role === 'buyer' ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <ShoppingBagIcon className={`w-6 h-6 ${role === 'buyer' ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span className={`text-sm font-semibold ${role === 'buyer' ? 'text-emerald-800' : 'text-slate-600'}`}>Buyer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('supplier')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 transition-all duration-200 ${
                    role === 'supplier' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <BuildingStorefrontIcon className={`w-6 h-6 ${role === 'supplier' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-semibold ${role === 'supplier' ? 'text-amber-700' : 'text-slate-600'}`}>Supplier</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 text-white rounded-full py-3 font-semibold mt-8 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-sm text-slate-500 text-center mt-6">
            Already have an account?{' '}
            <Link to={role === 'buyer' ? '/buyer/login' : '/supplier/login'} className="text-emerald-800 font-medium hover:text-emerald-900">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
