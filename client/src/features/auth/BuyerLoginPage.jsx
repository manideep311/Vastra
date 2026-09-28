import { Link, useLocation } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';
import { safeRedirect } from '../../utils/navigation';

function BuyerLoginPage() {
  const location = useLocation();
  // Cart sends buyers here with state.from = '/checkout' so they land back
  // where they meant to go instead of the generic home page.
  const redirectTo = safeRedirect(location.state?.from, '/home');

  return (
    <LoginForm
      role="buyer"
      title="Sign in to buy"
      description="Access your cart, orders and quotes."
      heading="Source fabric straight from the mill."
      subheading="Compare prices, minimum orders and lead times across Indian textile suppliers."
      registerHref="/register?role=buyer"
      redirectTo={redirectTo}
      switchLink={
        <>
          Selling fabric?{' '}
          <Link to="/supplier/login" className="font-semibold text-ink hover:underline">
            Supplier sign in
          </Link>
        </>
      }
    />
  );
}

export default BuyerLoginPage;
