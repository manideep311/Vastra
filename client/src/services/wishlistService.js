import apiClient from './apiClient';

export const getWishlist = async () => {
  const response = await apiClient.get('/wishlist');
  return response.data;
};

export const addToWishlist = async (productId) => {
  const response = await apiClient.post('/wishlist/items', { productId });
  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await apiClient.delete(`/wishlist/items/${productId}`);
  return response.data;
};
