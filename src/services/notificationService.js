import api from './api';

export const fetchNotifications = () => api.get('/notifications');
