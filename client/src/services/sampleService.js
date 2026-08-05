import apiClient from './apiClient';

// Buyer-side
export const requestSample = async (data) => {
  const response = await apiClient.post('/samples', data);
  return response.data;
};

export const getMySamples = async () => {
  const response = await apiClient.get('/samples');
  return response.data;
};

// Supplier-side
export const getSupplierSamples = async () => {
  const response = await apiClient.get('/supplier/samples');
  return response.data;
};

export const updateSampleStatus = async (id, status) => {
  const response = await apiClient.patch(`/supplier/samples/${id}/status`, { status });
  return response.data;
};
