import { Router } from 'express';
import {
  findSponsorsForEvent,
  findEventsForSponsor,
  checkProhibitedCategories
} from '../controllers/matchingController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/event-to-sponsors', requireAuth, requireRole('organizer'), findSponsorsForEvent);
router.post('/sponsor-to-events', requireAuth, requireRole('sponsor'), findEventsForSponsor);
router.post('/prohibited-check', requireAuth, requireRole('organizer', 'sponsor', 'admin'), checkProhibitedCategories);

export default router;
