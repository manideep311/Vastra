import apiClient from './apiClient';

const buyer = { authRole: 'buyer' };

export const getWishlist = async () => {
  const response = await apiClient.get('/wishlist', buyer);
  return response.data;
};

export const addToWishlist = async (productId) => {
  const response = await apiClient.post('/wishlist/items', { productId }, buyer);
  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await apiClient.delete(`/wishlist/items/${productId}`, buyer);
  return response.data;
};
