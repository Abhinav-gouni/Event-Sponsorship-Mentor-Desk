import { Router } from 'express';
import {
  listEvents,
  getMyEvents,
  getEventById,
  createEvent,
  updateEvent,
  setEventStatus
} from '../controllers/eventController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public / Filterable
router.get('/', listEvents);

// Organizer specific
router.get('/my-events', requireAuth, requireRole('organizer'), getMyEvents);

// Event Details
router.get('/:id', getEventById);

// Create / Edit
router.post('/', requireAuth, requireRole('organizer'), createEvent);
router.put('/:id', requireAuth, requireRole('organizer', 'admin'), updateEvent);
router.patch('/:id/status', requireAuth, requireRole('organizer', 'admin'), setEventStatus);

export default router;
