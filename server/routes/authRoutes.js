import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
  listAdminUsers,
  toggleUserStatus,
  deleteUser,
  getSystemHealth
} from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public
router.post('/register', register);
router.post('/login', login);

// Authenticated
router.get('/me', requireAuth, getCurrentUser);
router.put('/profile', requireAuth, updateProfile);

// Admin-only
router.get('/admin/users', requireAuth, requireRole('admin'), listAdminUsers);
router.patch('/admin/users/:id/status', requireAuth, requireRole('admin'), toggleUserStatus);
router.delete('/admin/users/:id', requireAuth, requireRole('admin'), deleteUser);
router.get('/admin/health', requireAuth, requireRole('admin'), getSystemHealth);

export default router;
