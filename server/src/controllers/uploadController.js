import { createAttachment } from '../repositories/reportRepository.js';
import { normalizeUploadedImage } from '../services/imageService.js';

export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Thiếu file tải lên.'
      });
      return;
    }

    const { reportId, findingId } = req.body ?? {};

    if (typeof reportId !== 'string' || reportId.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Thiếu `reportId` cho ảnh tải lên.'
      });
      return;
    }

    const normalized = await normalizeUploadedImage(req.file.path, req.file.mimetype);
    const attachment = createAttachment({
      reportId,
      findingId: typeof findingId === 'string' && findingId.length > 0 ? findingId : null,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      type: req.file.mimetype,
      size: normalized.size
    });

    if (!attachment) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy báo cáo hoặc lỗ hổng để gắn ảnh.'
      });
      return;
    }

    res.status(201).json({
      success: true,
      attachment
    });
  } catch (error) {
    next(error);
  }
}
