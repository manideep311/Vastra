import apiClient from './apiClient';

export const getNotifications = async () => {
  const response = await apiClient.get('/notifications');
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.patch('/notifications/read-all');
  return response.data;
};
