import { Router } from 'express';
import {
  listProposals,
  getProposalById,
  createProposal,
  sendCounteroffer,
  acceptProposal,
  rejectProposal,
  getAiNegotiationAdvice
} from '../controllers/proposalController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, listProposals);
router.get('/:id', requireAuth, getProposalById);
router.post('/', requireAuth, requireRole('sponsor'), createProposal);
router.post('/:id/counteroffer', requireAuth, sendCounteroffer);
router.post('/:id/accept', requireAuth, acceptProposal);
router.post('/:id/reject', requireAuth, rejectProposal);
router.get('/:id/ai-advice', requireAuth, getAiNegotiationAdvice);

export default router;
