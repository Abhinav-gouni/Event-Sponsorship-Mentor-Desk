import { Router } from 'express';
import {
  listAgreements,
  getAgreementById,
  approveAgreement,
  requestRevision,
  cancelAgreement,
  getAiAgreementSummary,
  compareVersions
} from '../controllers/agreementController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, listAgreements);
router.get('/:id', requireAuth, getAgreementById);
router.post('/:id/approve', requireAuth, approveAgreement);
router.post('/:id/request-revision', requireAuth, requestRevision);
router.post('/:id/cancel', requireAuth, cancelAgreement);
router.get('/:id/ai-summary', requireAuth, getAiAgreementSummary);
router.post('/compare-versions', requireAuth, compareVersions);

export default router;
