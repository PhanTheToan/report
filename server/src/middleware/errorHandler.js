import multer from 'multer';

export function notFoundHandler(_req, res) {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại.'
  });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: error.code === 'LIMIT_FILE_SIZE' ? 'Ảnh vượt quá giới hạn 8MB.' : error.message
    });
    return;
  }

  if (typeof error?.statusCode === 'number') {
    res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : 'Server gặp lỗi ngoài ý muốn.'
  });
}
