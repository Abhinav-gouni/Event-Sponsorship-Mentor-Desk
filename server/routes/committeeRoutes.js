import express from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  getEventCommittees,
  getCommitteeByType,
  createCommitteeContact,
  updateCommitteeContact,
  verifyCommitteeContact,
  deactivateCommitteeContact
} from '../controllers/committeeController.js';

const router = express.Router();

// List contacts for an event (Sponsors see verified only, Organizers/Admins see all)
router.get('/events/:eventId', requireAuth, getEventCommittees);

// Get specific committee contact by type (Water, Security, Transport, etc.)
router.get('/events/:eventId/:committeeType', requireAuth, getCommitteeByType);

// Organizer/Admin operations
router.post('/events/:eventId', requireAuth, requireRole('organizer', 'admin'), createCommitteeContact);
router.put('/:id', requireAuth, requireRole('organizer', 'admin'), updateCommitteeContact);
router.patch('/:id/verify', requireAuth, requireRole('organizer', 'admin'), verifyCommitteeContact);
router.patch('/:id/deactivate', requireAuth, requireRole('organizer', 'admin'), deactivateCommitteeContact);

export default router;
