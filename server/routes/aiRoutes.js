import { Router } from 'express';
import { checkAiHealth, chatAssistant } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/health', checkAiHealth);
router.post('/chat', requireAuth, chatAssistant);

export default router;
