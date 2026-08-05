import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';

const ACCENT = {
  panel: 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950',
  badge: 'bg-emerald-50 text-emerald-800',
  ring: 'focus:ring-emerald-500 focus:border-emerald-500',
  button: 'bg-gradient-to-r from-emerald-700 to-emerald-800 hover:shadow-emerald-700/30',
};

function BuyerLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Cart sends buyers here with state.from = '/checkout' so they land back
  // where they meant to go instead of the generic home page.
  const redirectTo = location.state?.from || '/home';

  return (
    <LoginForm
      role="buyer"
      badgeText="Welcome back"
      heading="Source fabrics directly from verified suppliers, worldwide."
      subheading="One elegant marketplace to browse, compare, and order textiles — built for buyers who value trust."
      accentClasses={ACCENT}
      registerHref="/register"
      onLoggedIn={() => navigate(redirectTo, { replace: true })}
    />
  );
}

export default BuyerLoginPage;
