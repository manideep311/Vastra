import apiClient from './apiClient';

// Buyer-side
export const requestQuote = async (data) => {
  const response = await apiClient.post('/quotes', data);
  return response.data;
};

export const getMyQuotes = async () => {
  const response = await apiClient.get('/quotes');
  return response.data;
};

export const getQuote = async (id) => {
  const response = await apiClient.get(`/quotes/${id}`);
  return response.data;
};

export const acceptQuote = async (id) => {
  const response = await apiClient.patch(`/quotes/${id}/accept`);
  return response.data;
};

export const rejectQuote = async (id) => {
  const response = await apiClient.patch(`/quotes/${id}/reject`);
  return response.data;
};

export const sendQuoteMessage = async (id, text) => {
  const response = await apiClient.post(`/quotes/${id}/messages`, { text });
  return response.data;
};

// Supplier-side
export const getSupplierQuotes = async () => {
  const response = await apiClient.get('/supplier/quotes');
  return response.data;
};

export const respondToQuote = async (id, data) => {
  const response = await apiClient.patch(`/supplier/quotes/${id}/respond`, data);
  return response.data;
};

export const declineQuote = async (id) => {
  const response = await apiClient.patch(`/supplier/quotes/${id}/decline`);
  return response.data;
};

export const sendSupplierQuoteMessage = async (id, text) => {
  const response = await apiClient.post(`/supplier/quotes/${id}/messages`, { text });
  return response.data;
};
