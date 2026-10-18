import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (
    import.meta.env.PROD
      ? 'https://event-sponsorship-mentor-desk.onrender.com/api'
      : '/api'
  ),
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('c34_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If 401 unauthorized on protected route, clear stale token
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('c34_token');
        localStorage.removeItem('c34_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
