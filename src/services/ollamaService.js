import api from './api';

export const getAIRecommendation = (payload) => api.post('/ai/recommend', payload);
