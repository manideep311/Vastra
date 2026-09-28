import apiClient from './apiClient';

const buyer = { authRole: 'buyer' };

export const submitOnboarding = async (data) => {
  const response = await apiClient.post('/buyer/onboarding', data, buyer);
  return response.data;
};

export const getBuyerProfile = async () => {
  const response = await apiClient.get('/buyer/profile', buyer);
  return response.data;
};

export const addAddress = async (address) => {
  const response = await apiClient.post('/buyer/addresses', address, buyer);
  return response.data;
};
