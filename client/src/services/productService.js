import apiClient from './apiClient';

const supplier = { authRole: 'supplier' };

// Public catalog
export const getProducts = async (params = {}, { signal } = {}) => {
  const response = await apiClient.get('/products', { params, signal });
  return response.data;
};

export const getProductById = async (id, { signal } = {}) => {
  const response = await apiClient.get(`/products/${id}`, { signal });
  return response.data;
};

export const getProductCategoryStats = async () => {
  const response = await apiClient.get('/products/meta/categories');
  return response.data;
};

// Supplier inventory
export const getMyProducts = async () => {
  const response = await apiClient.get('/products/mine', supplier);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await apiClient.post('/products', data, supplier);
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await apiClient.patch(`/products/${id}`, data, supplier);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await apiClient.delete(`/products/${id}`, supplier);
  return response.data;
};

export const uploadProductImages = async (id, files) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }
  const response = await apiClient.post(`/products/${id}/images`, formData, { ...supplier, timeout: 120_000 });
  return response.data;
};
