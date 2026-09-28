import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useBuyerAuth } from '../context/BuyerAuthContext';
import { useSupplierAuth } from '../context/SupplierAuthContext';

/**
 * Layout-style route guard used with nested <Route> groups, e.g.:
 *
 *   <Route element={<RoleRoute role="buyer" loginPath="/buyer/login" />}>
 *     <Route path="/checkout" element={<CheckoutPage />} />
 *   </Route>
 *
 * This is navigation UX only — the API enforces the same rules server-side.
 * Buyer and Supplier auth are fully separate sessions, so this only ever
 * checks the one relevant to `role`: a Supplier session never grants access
 * to Buyer routes, and vice versa. Not signed in -> redirect to `loginPath`,
 * remembering where they were headed.
 */
function RoleRoute({ role, loginPath }) {
  const { isLoggedIn: isBuyerLoggedIn } = useBuyerAuth();
  const { isLoggedIn: isSupplierLoggedIn } = useSupplierAuth();
  const location = useLocation();

  const isLoggedIn = role === 'supplier' ? isSupplierLoggedIn : isBuyerLoggedIn;

  if (!isLoggedIn) {
    return <Navigate to={loginPath} state={{ from: location.pathname + location.search }} replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
