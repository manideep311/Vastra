import { lazy, Suspense, useLayoutEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';

import BuyerLayout from './components/BuyerLayout';
import RoleRoute from './components/RoleRoute';
import { PageLoader } from './components/ui/States';

// Every page is its own chunk: a buyer browsing /products never downloads the
// supplier dashboard or product form, and the landing page doesn't ship the
// catalog. Layout shells stay eager so navigation chrome never flashes.
const LandingPage = lazy(() => import('./features/marketing/LandingPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const BuyerLoginPage = lazy(() => import('./features/auth/BuyerLoginPage'));
const SupplierLoginPage = lazy(() => import('./features/auth/SupplierLoginPage'));

const Discovery = lazy(() => import('./features/buyer/Discovery'));
const ProductsPage = lazy(() => import('./features/buyer/ProductsPage'));
const ProductDetail = lazy(() => import('./features/buyer/ProductDetail'));
const CartPage = lazy(() => import('./features/buyer/CartPage'));
const CheckoutPage = lazy(() => import('./features/buyer/CheckoutPage'));
const OnboardingPage = lazy(() => import('./features/buyer/OnboardingPage'));
const OrdersPage = lazy(() => import('./features/buyer/OrdersPage'));
const DashboardPage = lazy(() => import('./features/buyer/DashboardPage'));
const WishlistPage = lazy(() => import('./features/buyer/WishlistPage'));
const BuyerQuotesPage = lazy(() => import('./features/buyer/BuyerQuotesPage'));

const SupplierLayout = lazy(() => import('./components/SupplierLayout'));
const SupplierOnboardingPage = lazy(() => import('./features/supplier/SupplierOnboardingPage'));
const SupplierDashboardPage = lazy(() => import('./features/supplier/SupplierDashboardPage'));
const InventoryPage = lazy(() => import('./features/supplier/InventoryPage'));
const ProductFormPage = lazy(() => import('./features/supplier/ProductFormPage'));
const SupplierOrdersPage = lazy(() => import('./features/supplier/SupplierOrdersPage'));
const SupplierQuotesPage = lazy(() => import('./features/supplier/SupplierQuotesPage'));
const SupplierProfilePage = lazy(() => import('./features/supplier/SupplierProfilePage'));

// New pages start at the top; back/forward keeps the browser's own restoration.
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="page-title mt-2">This page doesn't exist</h1>
      <p className="mt-2 text-sm text-muted">The link may be broken, or the page may have moved.</p>
      <Link to="/home" className="btn btn-primary mt-6">
        Go to the marketplace
      </Link>
    </div>
  );
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ===================== Public routes ===================== */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/buyer/login" element={<BuyerLoginPage />} />
          <Route path="/supplier/login" element={<SupplierLoginPage />} />

          {/* Buyer-facing shell (Navbar/BottomNav/ChatWidget). Home, Products,
              Product Details and Cart are public — no login required to browse. */}
          <Route element={<BuyerLayout />}>
            <Route path="/home" element={<Discovery />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />

            {/* -------- Buyer-protected routes -------- */}
            <Route element={<RoleRoute role="buyer" loginPath="/buyer/login" />}>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<DashboardPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/quotes" element={<BuyerQuotesPage />} />
            </Route>
          </Route>

          <Route element={<RoleRoute role="buyer" loginPath="/buyer/login" />}>
            <Route path="/buyer/onboarding" element={<OnboardingPage />} />
          </Route>

          {/* ===================== Supplier-protected routes ===================== */}
          <Route element={<RoleRoute role="supplier" loginPath="/supplier/login" />}>
            <Route path="/supplier/onboarding" element={<SupplierOnboardingPage />} />

            <Route path="/supplier" element={<SupplierLayout />}>
              <Route index element={<SupplierDashboardPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/new" element={<ProductFormPage />} />
              <Route path="inventory/:id/edit" element={<ProductFormPage />} />
              <Route path="orders" element={<SupplierOrdersPage />} />
              <Route path="quotes" element={<SupplierQuotesPage />} />
              <Route path="profile" element={<SupplierProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
