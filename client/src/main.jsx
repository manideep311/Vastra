import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BuyerAuthProvider } from './context/BuyerAuthContext.jsx';
import { SupplierAuthProvider } from './context/SupplierAuthContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Buyer and Supplier auth are fully independent providers — neither
          can read or clear the other's session. */}
      <BuyerAuthProvider>
        <SupplierAuthProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </SupplierAuthProvider>
      </BuyerAuthProvider>
    </BrowserRouter>
  </StrictMode>
);