import { Routes, Route } from 'react-router-dom';

import LandingPage from './features/marketing/LandingPage';
import RegisterPage from './features/auth/RegisterPage';
import BuyerLoginPage from './features/auth/BuyerLoginPage';
import SupplierLoginPage from './features/auth/SupplierLoginPage';

import Discovery from './features/buyer/Discovery';
import ProductsPage from './features/buyer/ProductsPage';
import ProductDetail from './features/buyer/ProductDetail';
import CartPage from './features/buyer/CartPage';
import CheckoutPage from './features/buyer/CheckoutPage';
import OnboardingPage from './features/buyer/OnboardingPage';
import OrdersPage from './features/buyer/OrdersPage';
import DashboardPage from './features/buyer/DashboardPage';
import WishlistPage from './features/buyer/WishlistPage';
import BuyerQuotesPage from './features/buyer/BuyerQuotesPage';
import BuyerLayout from './components/BuyerLayout';

import SupplierOnboardingPage from './features/supplier/SupplierOnboardingPage';
import SupplierDashboardPage from './features/supplier/SupplierDashboardPage';
import InventoryPage from './features/supplier/InventoryPage';
import ProductFormPage from './features/supplier/ProductFormPage';
import SupplierOrdersPage from './features/supplier/SupplierOrdersPage';
import SupplierQuotesPage from './features/supplier/SupplierQuotesPage';
import SupplierProfilePage from './features/supplier/SupplierProfilePage';
import SupplierLayout from './components/SupplierLayout';

import RoleRoute from './components/RoleRoute';

function App() {
  return (
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
    </Routes>
  );
}

export default App;
