import { Router } from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/', uploadSingleImage, uploadImage);

export default router;

