import apiClient from './apiClient';

export const register = async (email, password, role) => {
  const response = await apiClient.post('/auth/register', { email, password, role }, { authRole: role });
  return response.data;
};

export const login = async (email, password, role) => {
  const response = await apiClient.post('/auth/login', { email, password }, { authRole: role });
  return response.data;
};

// Confirms a stored session is still accepted by the server. `role` pins
// which token is sent, independent of the current page.
export const getSessionUser = async (role) => {
  const response = await apiClient.get('/auth/me', { authRole: role });
  return response.data;
};

// Tells the server the session is ending. Tokens are stateless, so the client
// clears its own storage regardless of whether this request succeeds.
export const logout = async (role) => {
  await apiClient.post('/auth/logout', null, { authRole: role });
};
