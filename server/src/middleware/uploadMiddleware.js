import multer from 'multer';
import { ensureUploadDirectory, UPLOAD_DIR } from '../utils/paths.js';

ensureUploadDirectory();

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, UPLOAD_DIR);
  },
  filename(_req, file, callback) {
    const safeName = sanitizeFilename(file.originalname);
    callback(null, `${Date.now()}-${safeName}`);
  }
});

function fileFilter(_req, file, callback) {
  if (!file.mimetype.startsWith('image/')) {
    const error = new Error('Chỉ hỗ trợ tải lên file ảnh.');
    error.statusCode = 400;
    callback(error);
    return;
  }

  callback(null, true);
}

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024
  }
}).single('file');
