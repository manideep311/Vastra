import apiClient from './apiClient';

const buyer = { authRole: 'buyer' };
const supplier = { authRole: 'supplier' };

// Buyer-side
export const requestQuote = async (data) => {
  const response = await apiClient.post('/quotes', data, buyer);
  return response.data;
};

export const getMyQuotes = async () => {
  const response = await apiClient.get('/quotes', buyer);
  return response.data;
};

export const acceptQuote = async (id) => {
  const response = await apiClient.patch(`/quotes/${id}/accept`, null, buyer);
  return response.data;
};

export const rejectQuote = async (id) => {
  const response = await apiClient.patch(`/quotes/${id}/reject`, null, buyer);
  return response.data;
};

// Supplier-side
export const getSupplierQuotes = async () => {
  const response = await apiClient.get('/supplier/quotes', supplier);
  return response.data;
};

export const respondToQuote = async (id, data) => {
  const response = await apiClient.patch(`/supplier/quotes/${id}/respond`, data, supplier);
  return response.data;
};

export const declineQuote = async (id) => {
  const response = await apiClient.patch(`/supplier/quotes/${id}/decline`, null, supplier);
  return response.data;
};
