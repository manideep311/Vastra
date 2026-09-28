import apiClient from './apiClient';

export const getProductReviews = async (productId, { signal } = {}) => {
  const response = await apiClient.get(`/reviews/${productId}`, { signal });
  return response.data;
};

export const submitReview = async (productId, data) => {
  const response = await apiClient.post(`/reviews/${productId}`, data, { authRole: 'buyer' });
  return response.data;
};
