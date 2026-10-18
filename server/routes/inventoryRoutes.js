import { Router } from 'express';
import {
  getEventInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getEventPackages,
  createPackage,
  calculateWhatIf
} from '../controllers/inventoryController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Inventory
router.get('/event/:eventId', getEventInventory);
router.post('/', requireAuth, requireRole('organizer'), createInventoryItem);
router.put('/:id', requireAuth, requireRole('organizer'), updateInventoryItem);
router.delete('/:id', requireAuth, requireRole('organizer'), deleteInventoryItem);

// Packages & Package Builder
router.get('/packages/event/:eventId', getEventPackages);
router.post('/packages', requireAuth, requireRole('organizer'), createPackage);

// What-If Calculator
router.post('/calculate-what-if', calculateWhatIf);
router.post('/calculate-pricing', calculateWhatIf);

export default router;
