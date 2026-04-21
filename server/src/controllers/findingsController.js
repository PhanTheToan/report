import { deleteFinding, getFindingById, getReportSummary, updateFinding } from '../repositories/reportRepository.js';

export function patchFinding(req, res) {
  const finding = updateFinding(req.params.findingId, req.body ?? {});

  if (!finding) {
    res.status(404).json({
      success: false,
      message: 'Không tìm thấy lỗ hổng.'
    });
    return;
  }

  res.json({
    finding,
    summary: getReportSummary(finding.reportId)
  });
}

export function removeFinding(req, res) {
  const finding = getFindingById(req.params.findingId);

  if (!finding) {
    res.status(404).json({
      success: false,
      message: 'Không tìm thấy lỗ hổng.'
    });
    return;
  }

  deleteFinding(req.params.findingId);

  res.json({
    success: true,
    reportId: finding.reportId,
    summary: getReportSummary(finding.reportId)
  });
}

