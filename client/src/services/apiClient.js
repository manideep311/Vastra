import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { getToken, hasDeadToken, expireSession } from './session';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30_000,
});

// Which session a request belongs to. Callers can pin it with
// `{ authRole: 'buyer' | 'supplier' }`; otherwise it follows the area of the
// app the request comes from — the /supplier prefix mirrors the route split
// in App.jsx (everything under /supplier is supplier-only, everything else
// belongs to the buyer/public experience).
const resolveRole = (config) => {
  if (config.authRole) return config.authRole;
  return window.location.pathname.startsWith('/supplier') ? 'supplier' : 'buyer';
};

apiClient.interceptors.request.use((config) => {
  const role = resolveRole(config);
  const token = getToken(role);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.sessionRole = role;
  } else if (hasDeadToken(role)) {
    // The stored token expired while the app was open — end that session now
    // so the UI drops to signed-out instead of looking signed in.
    expireSession(role);
  }
  return config;
});

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register'];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response } = error;
    // A token the server rejects means that session is over — clear it so the
    // app recovers to a signed-out state (route guards then redirect).
    if (response?.status === 401 && config?.sessionRole && !AUTH_ENDPOINTS.includes(config.url)) {
      expireSession(config.sessionRole);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
