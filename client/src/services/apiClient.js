import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Buyer and Supplier sessions carry separate tokens (buyerToken / supplierToken)
// so the two never share credentials. Which one a request should use is
// determined by which area of the app it originates from — the /supplier
// prefix mirrors the route split in App.jsx (everything under /supplier is
// supplier-only, everything else belongs to the buyer/public experience).
apiClient.interceptors.request.use((config) => {
  const isSupplierArea = typeof window !== 'undefined' && window.location.pathname.startsWith('/supplier');
  const tokenKey = isSupplierArea ? 'supplierToken' : 'buyerToken';
  const token = localStorage.getItem(tokenKey);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
