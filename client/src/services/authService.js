import apiClient from './apiClient';

export const register = async (email, password, role) => {
  const response = await apiClient.post('/auth/register', { email, password, role });
  return response.data;
};

export const login = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};