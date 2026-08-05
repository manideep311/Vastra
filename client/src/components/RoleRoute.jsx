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
 * Buyer and Supplier auth are fully separate sessions, so this only ever
 * checks the one relevant to `role`:
 * - Not logged in as `role`  -> redirect to `loginPath`, remembering the
 *   page they wanted so the login page can send them back afterwards.
 * - Logged in as `role`      -> render the nested routes via <Outlet />.
 *
 * A Supplier session being active never grants access to Buyer-protected
 * routes, and vice versa — each guard only looks at its own role's session.
 */
function RoleRoute({ role, loginPath }) {
  const { isLoggedIn: isBuyerLoggedIn } = useBuyerAuth();
  const { isLoggedIn: isSupplierLoggedIn } = useSupplierAuth();
  const location = useLocation();

  const isLoggedIn = role === 'supplier' ? isSupplierLoggedIn : isBuyerLoggedIn;

  if (!isLoggedIn) {
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
