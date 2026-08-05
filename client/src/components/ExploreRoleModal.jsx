import { useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, BuildingStorefrontIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Shown after the landing page's "Explore Website" button is clicked.
 * Buyers go straight into the public marketplace, no login required.
 * Suppliers must authenticate first, so they're sent to the supplier login.
 */
function ExploreRoleModal({ onClose }) {
  const navigate = useNavigate();

  const chooseBuyer = () => {
    // Guest buyer — no login required, just remember the chosen role.
    localStorage.setItem('currentRole', 'buyer');
    onClose();
    navigate('/home');
  };

  const chooseSupplier = () => {
    // Suppliers must authenticate before doing anything else.
    localStorage.setItem('currentRole', 'supplier');
    onClose();
    navigate('/supplier/login');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>

        <h2 className="font-serif-display text-2xl md:text-3xl font-bold text-slate-900 text-center">How would you like to continue?</h2>
        <p className="text-slate-500 text-sm text-center mt-2">Choose how you'd like to explore VASTRA.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <button
            type="button"
            onClick={chooseBuyer}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 bg-white px-6 py-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <ShoppingBagIcon className="w-7 h-7 text-emerald-700" />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-slate-900">I'm a Buyer</p>
              <p className="text-xs text-slate-500 mt-1">Browse the marketplace instantly — no login needed.</p>
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700 mt-1">
              Continue <ArrowRightIcon className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={chooseSupplier}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white px-6 py-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <BuildingStorefrontIcon className="w-7 h-7 text-amber-600" />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-slate-900">I'm a Supplier</p>
              <p className="text-xs text-slate-500 mt-1">Sign in to manage your listings and orders.</p>
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-700 mt-1">
              Sign in <ArrowRightIcon className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExploreRoleModal;
