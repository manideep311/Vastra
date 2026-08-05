import apiClient from './apiClient';

export const checkout = async (shippingInfo) => {
  const response = await apiClient.post('/orders/checkout', { shippingInfo });
  return response.data;
};

export const getMyOrders = async () => {
  const response = await apiClient.get('/orders');
  return response.data;
};