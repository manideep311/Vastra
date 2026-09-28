import apiClient from './apiClient';

// Notifications exist for both roles; `role` pins which session is used.
export const getNotifications = async (role) => {
  const response = await apiClient.get('/notifications', { authRole: role, params: { limit: 15 } });
  return response.data;
};

export const markNotificationRead = async (id, role) => {
  const response = await apiClient.patch(`/notifications/${id}/read`, null, { authRole: role });
  return response.data;
};

export const markAllNotificationsRead = async (role) => {
  const response = await apiClient.patch('/notifications/read-all', null, { authRole: role });
  return response.data;
};
