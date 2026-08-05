import apiClient from './apiClient';

export const getCategories = async () => {
  const response = await apiClient.get('/categories');
  return response.data;
};

export const getProductCategoryStats = async () => {
  const response = await apiClient.get('/products/meta/categories');
  return response.data;
};
