import { Router } from 'express';
import {
  getOrganizerReport,
  getBusinessValidationReport,
  exportReportData
} from '../controllers/reportController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/pipeline', requireAuth, getOrganizerReport);
router.get('/events-overview', requireAuth, getOrganizerReport);
router.get('/organizer-summary', requireAuth, requireRole('organizer', 'admin'), getOrganizerReport);
router.get('/business-validation', requireAuth, getBusinessValidationReport);
router.get('/export/csv', requireAuth, (req, res, next) => {
  req.params.type = 'agreements';
  req.params.format = 'csv';
  return exportReportData(req, res, next);
});
router.get('/export/json', requireAuth, (req, res, next) => {
  req.params.type = 'agreements';
  req.params.format = 'json';
  return exportReportData(req, res, next);
});
router.get('/export/:type/:format', requireAuth, exportReportData);

export default router;
