import apiClient from './apiClient';

export const submitOnboarding = async (data) => {
  const response = await apiClient.post('/buyer/onboarding', data);
  return response.data;
};

export const getBuyerProfile = async () => {
  const response = await apiClient.get('/buyer/profile');
  return response.data;
};