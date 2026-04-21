import {
  createReport,
  createFinding,
  deleteReport,
  getReportById,
  getReportSummary,
  listReports,
  updateReport
} from '../repositories/reportRepository.js';
import { generateReportPdf } from '../services/pdfService.js';

function safeFilename(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getReports(_req, res) {
  res.json({
    reports: listReports()
  });
}

export function createNewReport(req, res) {
  const report = createReport(req.body ?? {});

  res.status(201).json({
    report
  });
}

export function getReport(req, res) {
  const report = getReportById(req.params.reportId);

  if (!report) {
    res.status(404).json({
      success: false,
      message: 'Không tìm thấy báo cáo.'
    });
    return;
  }

  res.json({ report });
}

export function patchReport(req, res) {
  const report = updateReport(req.params.reportId, req.body ?? {});

  if (!report) {
    res.status(404).json({
      success: false,
      message: 'Không tìm thấy báo cáo.'
    });
    return;
  }

  res.json({
    report,
    summary: getReportSummary(req.params.reportId)
  });
}

export function removeReport(req, res) {
  const deleted = deleteReport(req.params.reportId);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: 'Không tìm thấy báo cáo.'
    });
    return;
  }

  res.status(204).send();
}

export function addFinding(req, res) {
  const finding = createFinding(req.params.reportId, req.body ?? {});

  if (!finding) {
    res.status(404).json({
      success: false,
      message: 'Không tìm thấy báo cáo để thêm lỗ hổng.'
    });
    return;
  }

  res.status(201).json({
    finding,
    summary: getReportSummary(req.params.reportId)
  });
}

export async function exportReportPdf(req, res, next) {
  try {
    const report = getReportById(req.params.reportId);

    if (!report) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy báo cáo.'
      });
      return;
    }

    const pdfBytes = await generateReportPdf(report);
    const pdfBuffer = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
    const filename = `${safeFilename(report.title || 'bao-cao-lo-hong')}.pdf`;
    const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
}
