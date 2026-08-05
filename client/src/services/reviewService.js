import apiClient from './apiClient';

export const getProductReviews = async (productId) => {
  const response = await apiClient.get(`/reviews/${productId}`);
  return response.data;
};

export const submitReview = async (productId, data) => {
  const response = await apiClient.post(`/reviews/${productId}`, data);
  return response.data;
};
