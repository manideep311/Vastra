import { useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import Dialog from './ui/Dialog';

/**
 * Shown by the landing page's "Sign in" buttons: picks which sign-in page to
 * open. ("Explore Textile" skips this and goes straight to the marketplace.)
 * A buyer who is already signed in can continue without signing in again.
 */
function SignInRoleModal({ open, onClose }) {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useBuyerAuth();

  const go = (path) => {
    onClose();
    navigate(path);
  };

  // "Not you?": end the current buyer session, then sign in as someone else.
  const switchBuyer = () => {
    logout();
    go('/buyer/login');
  };

  const optionClass =
    'group flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-ink/40 focus-visible:border-ink';

  return (
    <Dialog open={open} onClose={onClose} title="How would you like to continue?">
      <div className="space-y-3">
        {isLoggedIn ? (
          <button type="button" data-autofocus onClick={() => go('/home')} className={optionClass}>
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <ShoppingBagIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-bold text-ink">Continue as a buyer</span>
              <span className="block truncate text-sm text-muted">Signed in as {user?.email}</span>
            </span>
            <ArrowRightIcon className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : (
          <button type="button" data-autofocus onClick={() => go('/buyer/login')} className={optionClass}>
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <ShoppingBagIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-bold text-ink">I’m a buyer</span>
            </span>
            <ArrowRightIcon className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        <button type="button" onClick={() => go('/supplier/login')} className={optionClass}>
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
            <BuildingStorefrontIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display font-bold text-ink">I’m a supplier</span>
          </span>
          <ArrowRightIcon className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {isLoggedIn && (
        <p className="mt-5 text-center text-sm text-muted">
          Not you?{' '}
          <button type="button" onClick={switchBuyer} className="font-semibold text-ink hover:underline">
            Sign in with a different account
          </button>
        </p>
      )}
    </Dialog>
  );
}

export default SignInRoleModal;
