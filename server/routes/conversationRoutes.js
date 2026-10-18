import express from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  getThreads,
  getThreadMessages,
  createThread,
  postMessage,
  getPendingApprovals,
  decideApproval,
  getEventRequirements
} from '../controllers/conversationController.js';

const router = express.Router();

// Specific routes first to prevent parameter collisions
router.get('/approvals/pending', requireAuth, requireRole('organizer', 'admin'), getPendingApprovals);
router.post('/approvals/:messageId/decide', requireAuth, requireRole('organizer', 'admin'), decideApproval);
router.get('/requirements/:eventId', requireAuth, requireRole('organizer', 'admin'), getEventRequirements);

// Thread list & creation
router.get('/', requireAuth, getThreads);
router.post('/', requireAuth, createThread);

// Thread message stream & sending
router.get('/:id/messages', requireAuth, getThreadMessages);
router.post('/:id/messages', requireAuth, postMessage);

export default router;
