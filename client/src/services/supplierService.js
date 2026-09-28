import apiClient from './apiClient';

const supplier = { authRole: 'supplier' };

export const submitSupplierOnboarding = async (data) => {
  const response = await apiClient.post('/supplier/onboarding', data, supplier);
  return response.data;
};

export const getSupplierProfile = async () => {
  const response = await apiClient.get('/supplier/profile', supplier);
  return response.data;
};

export const updateSupplierProfile = async (data) => {
  const response = await apiClient.patch('/supplier/profile', data, supplier);
  return response.data;
};

export const getSupplierDashboard = async () => {
  const response = await apiClient.get('/supplier/dashboard', supplier);
  return response.data;
};

export const getSupplierOrders = async () => {
  const response = await apiClient.get('/supplier/orders', supplier);
  return response.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await apiClient.patch(`/supplier/orders/${orderId}/status`, { status }, supplier);
  return response.data;
};
