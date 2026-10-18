import api from './api';

export const getEvents = () => api.get('/events');
export const getMyEvents = () => api.get('/events/my-events');
export const getEventById = (id) => api.get(`/events/${id}`);
export const createEvent = (payload) => api.post('/events', payload);

export const eventService = {
  getEvents,
  getMyEvents,
  getEventById,
  createEvent
};

export default eventService;
