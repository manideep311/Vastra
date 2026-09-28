import { Link, useLocation } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';
import { safeRedirect } from '../../utils/navigation';

function SupplierLoginPage() {
  const location = useLocation();
  // Only supplier-area paths are valid destinations after a supplier login.
  const from = safeRedirect(location.state?.from, '/supplier');
  const redirectTo = from.startsWith('/supplier') ? from : '/supplier';

  return (
    <LoginForm
      role="supplier"
      title="Supplier sign in"
      description="Manage your listings, orders and quote requests."
      heading="Put your mill in front of serious buyers."
      subheading="List fabrics with real specs and MOQs, answer bulk quote requests, and track every order in one place."
      registerHref="/register?role=supplier"
      redirectTo={redirectTo}
      switchLink={
        <>
          Buying fabric?{' '}
          <Link to="/buyer/login" className="font-semibold text-ink hover:underline">
            Buyer sign in
          </Link>
        </>
      }
    />
  );
}

export default SupplierLoginPage;
