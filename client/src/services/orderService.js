import apiClient from './apiClient';

const buyer = { authRole: 'buyer' };

export const checkout = async (shippingInfo) => {
  const response = await apiClient.post('/orders/checkout', { shippingInfo }, buyer);
  return response.data;
};

export const getMyOrders = async () => {
  const response = await apiClient.get('/orders', buyer);
  return response.data;
};
