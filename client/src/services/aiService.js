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

// Products matched to the signed-in buyer's onboarding profile. The server
// answers 400 when the buyer hasn't completed onboarding yet.
export const getRecommendations = async ({ signal } = {}) => {
  const response = await apiClient.get('/ai/recommendations', { authRole: 'buyer', signal, timeout: 45_000 });
  return response.data;
};

// Advisory price and lead time for a supplier answering a quote request.
// The supplier always reviews and sends the final numbers themselves.
export const suggestQuote = async ({ productId, requestedQuantity, targetPrice }) => {
  const response = await apiClient.post(
    '/ai/suggest-quote',
    { productId, requestedQuantity, targetPrice },
    { authRole: 'supplier', timeout: 45_000 }
  );
  return response.data;
};
