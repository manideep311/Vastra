import apiClient from './apiClient';

// The assistant is available to guests; a signed-in buyer's token is sent
// when present so they get their own (higher) rate limit.
export const chatWithAssistant = async (message, history, productId) => {
  const response = await apiClient.post(
    '/ai/chat',
    { message, history, productId },
    { authRole: 'buyer', timeout: 45_000 }
  );
  return response.data;
};

export const getSimilarProducts = async (productId, { signal } = {}) => {
  const response = await apiClient.get(`/ai/similar/${productId}`, { signal });
  return response.data;
};

export const categorizeProduct = async (name, description) => {
  const response = await apiClient.post('/ai/categorize', { name, description }, { authRole: 'supplier', timeout: 45_000 });
  return response.data;
};
