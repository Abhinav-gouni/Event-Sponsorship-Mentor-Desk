import { Router } from 'express';
import { getUserNotifications, markAsRead, markAllAsRead } from '../services/notificationService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await getUserNotifications(req.user.id, unreadOnly);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const success = await markAsRead(req.params.id, req.user.id);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', requireAuth, async (req, res, next) => {
  try {
    const count = await markAllAsRead(req.user.id);
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
});

export default router;
