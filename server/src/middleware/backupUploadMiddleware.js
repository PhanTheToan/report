import multer from 'multer';

function fileFilter(_req, file, callback) {
  const isJsonFile =
    file.mimetype === 'application/json' ||
    file.mimetype === 'text/json' ||
    file.mimetype === 'application/octet-stream' ||
    file.originalname.toLowerCase().endsWith('.json');

  if (!isJsonFile) {
    const error = new Error('Chỉ hỗ trợ file backup định dạng JSON.');
    error.statusCode = 400;
    callback(error);
    return;
  }

  callback(null, true);
}

export const uploadSingleBackup = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 64 * 1024 * 1024
  }
}).single('file');
