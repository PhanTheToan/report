import { Router } from 'express';
import {
  addFinding,
  createNewReport,
  exportReportPdf,
  getReport,
  getReports,
  patchReport,
  removeReport
} from '../controllers/reportsController.js';

const router = Router();

router.get('/', getReports);
router.post('/', createNewReport);
router.get('/:reportId', getReport);
router.patch('/:reportId', patchReport);
router.delete('/:reportId', removeReport);
router.post('/:reportId/findings', addFinding);
router.get('/:reportId/pdf', exportReportPdf);

export default router;

