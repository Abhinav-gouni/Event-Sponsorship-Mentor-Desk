import api from './api';

export const getMatches = (payload) => api.post('/matching/suggest', payload);
