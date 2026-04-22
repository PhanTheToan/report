import { Router } from 'express';
import { exportBackup, importBackup } from '../controllers/backupController.js';
import { uploadSingleBackup } from '../middleware/backupUploadMiddleware.js';

const router = Router();

router.get('/export', exportBackup);
router.post('/import', uploadSingleBackup, importBackup);

export default router;
