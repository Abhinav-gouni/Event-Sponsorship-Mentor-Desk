import { Router } from 'express';
import {
  listSponsors,
  getSponsorById,
  getMyPreferences,
  updatePreferences,
  getShortlist,
  toggleShortlist,
  updateOutreachStatus
} from '../controllers/sponsorController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Listing
router.get('/', listSponsors);

// Sponsor's own preferences
router.get('/preferences/me', requireAuth, requireRole('sponsor'), getMyPreferences);
router.put('/preferences/me', requireAuth, requireRole('sponsor'), updatePreferences);

// Organizer shortlisting & outreach tracking
router.get('/shortlist/my', requireAuth, requireRole('organizer'), getShortlist);
router.post('/shortlist', requireAuth, requireRole('organizer'), toggleShortlist);
router.put('/shortlist/:id', requireAuth, requireRole('organizer'), updateOutreachStatus);

// Sponsor Details
router.get('/:id', getSponsorById);

export default router;
