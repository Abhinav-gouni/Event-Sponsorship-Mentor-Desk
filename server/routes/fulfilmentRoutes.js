import { Router } from 'express';
import {
  getAgreementDeliverables,
  createDeliverable,
  submitEvidence,
  reviewDeliverable
} from '../controllers/fulfilmentController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/agreement/:agreementId', requireAuth, getAgreementDeliverables);
router.post('/deliverables', requireAuth, requireRole('organizer'), createDeliverable);
router.post('/deliverables/:deliverableId/evidence', requireAuth, requireRole('organizer'), submitEvidence);
router.put('/deliverables/:deliverableId/review', requireAuth, requireRole('sponsor'), reviewDeliverable);

export default router;
