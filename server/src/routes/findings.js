import { Router } from 'express';
import { patchFinding, removeFinding } from '../controllers/findingsController.js';

const router = Router();

router.patch('/:findingId', patchFinding);
router.delete('/:findingId', removeFinding);

export default router;
