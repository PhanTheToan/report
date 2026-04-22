import { createBackupPayload, restoreBackupPayload } from '../services/backupService.js';

function buildBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `vuln-report-backup-${timestamp}.json`;
}

export function exportBackup(_req, res) {
  const payload = createBackupPayload();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${buildBackupFilename()}"`);
  res.send(JSON.stringify(payload, null, 2));
}

export function importBackup(req, res) {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'Thiếu file backup để khôi phục.'
    });
    return;
  }

  let payload;

  try {
    payload = JSON.parse(req.file.buffer.toString('utf8'));
  } catch {
    res.status(400).json({
      success: false,
      message: 'File backup không phải JSON hợp lệ.'
    });
    return;
  }

  const counts = restoreBackupPayload(payload);

  res.json({
    success: true,
    counts
  });
}
