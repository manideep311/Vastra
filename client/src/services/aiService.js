import apiClient from './apiClient';

export const chatWithAssistant = async (message, history, productId) => {
  const response = await apiClient.post('/ai/chat', { message, history, productId });
  return response.data;
};

export const getSimilarProducts = async (productId) => {
  const response = await apiClient.get(`/ai/similar/${productId}`);
  return response.data;
};

export const compareProducts = async (productIds) => {
  const response = await apiClient.post('/ai/compare', { productIds });
  return response.data;
};

export const semanticSearch = async (query) => {
  const response = await apiClient.post('/ai/search', { query });
  return response.data;
};

export const getRecommendations = async () => {
  const response = await apiClient.get('/ai/recommendations');
  return response.data;
};

export const categorizeProduct = async (name, description) => {
  const response = await apiClient.post('/ai/categorize', { name, description });
  return response.data;
};

export const suggestQuote = async (data) => {
  const response = await apiClient.post('/ai/suggest-quote', data);
  return response.data;
};