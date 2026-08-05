import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';

const ACCENT = {
  panel: 'bg-gradient-to-br from-amber-700 via-amber-800 to-emerald-950',
  badge: 'bg-amber-50 text-amber-700',
  ring: 'focus:ring-amber-500 focus:border-amber-500',
  button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:shadow-amber-500/30',
};

function SupplierLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/supplier';

  return (
    <LoginForm
      role="supplier"
      badgeText="Supplier portal"
      heading="List your fabrics in front of thousands of verified buyers."
      subheading="Manage your catalog, quotes, and orders from one dedicated supplier dashboard."
      accentClasses={ACCENT}
      registerHref="/register"
      onLoggedIn={() => navigate(redirectTo, { replace: true })}
    />
  );
}

export default SupplierLoginPage;
