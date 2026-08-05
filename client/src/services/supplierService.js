import apiClient from './apiClient';

export const submitSupplierOnboarding = async (data) => {
  const response = await apiClient.post('/supplier/onboarding', data);
  return response.data;
};

export const getSupplierProfile = async () => {
  const response = await apiClient.get('/supplier/profile');
  return response.data;
};

export const updateSupplierProfile = async (data) => {
  const response = await apiClient.patch('/supplier/profile', data);
  return response.data;
};

export const getSupplierDashboard = async () => {
  const response = await apiClient.get('/supplier/dashboard');
  return response.data;
};

export const getSupplierOrders = async () => {
  const response = await apiClient.get('/supplier/orders');
  return response.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await apiClient.patch(`/supplier/orders/${orderId}/status`, { status });
  return response.data;
};