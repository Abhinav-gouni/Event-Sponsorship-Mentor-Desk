import api from './api';

export const getSponsors = () => api.get('/sponsors');
export const createSponsor = (payload) => api.post('/sponsors', payload);
