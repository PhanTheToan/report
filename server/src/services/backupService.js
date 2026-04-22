import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db/database.js';
import { getReportById, listReports } from '../repositories/reportRepository.js';
import { ensureUploadDirectory, publicUploadPath, SERVER_ROOT, UPLOAD_DIR } from '../utils/paths.js';

const BACKUP_FORMAT = 'vuln-report-backup';
const BACKUP_VERSION = 1;
const EMPTY_HTML = '<p></p>';
const DEFAULT_REPRODUCTION_HTML = '<ol><li></li></ol>';
const ALLOWED_SEVERITIES = new Set(['Critical', 'High', 'Medium', 'Low', 'Info']);

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function ensureString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function ensureHtml(value, fallback = EMPTY_HTML) {
  const normalized = ensureString(value, fallback);
  return normalized.length > 0 ? normalized : fallback;
}

function ensureIsoDate(value) {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return value;
  }

  return new Date().toISOString();
}

function ensureSeverity(value) {
  return ALLOWED_SEVERITIES.has(value) ? value : 'Medium';
}

function ensureUploadFilename(value) {
  const storedName = path.basename(ensureString(value).trim());

  if (!storedName || storedName === '.' || storedName === '..') {
    throw badRequest('Backup chứa tên file upload không hợp lệ.');
  }

  return storedName;
}

function decodeAttachmentContent(contentBase64, storedName) {
  if (typeof contentBase64 !== 'string' || contentBase64.length === 0) {
    throw badRequest(`Backup thiếu nội dung cho file upload "${storedName}".`);
  }

  return Buffer.from(contentBase64, 'base64');
}

function createStagingDirectory() {
  const root = path.join(SERVER_ROOT, 'data', '.backup-staging');
  const directory = path.join(root, `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function cleanupDirectory(directoryPath) {
  fs.rmSync(directoryPath, { recursive: true, force: true });
}

function cleanupUnusedUploads(activeStoredNames) {
  ensureUploadDirectory();

  for (const entry of fs.readdirSync(UPLOAD_DIR, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') {
      continue;
    }

    const targetPath = path.join(UPLOAD_DIR, entry.name);

    if (entry.isDirectory()) {
      cleanupDirectory(targetPath);
      continue;
    }

    if (!activeStoredNames.has(entry.name)) {
      fs.rmSync(targetPath, { force: true });
    }
  }
}

function buildAttachmentBackup(attachment) {
  const storedName = ensureUploadFilename(attachment.storedName);
  const filePath = path.join(UPLOAD_DIR, storedName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file upload "${attachment.originalName}" để sao lưu.`);
  }

  return {
    ...attachment,
    storedName,
    url: publicUploadPath(storedName),
    contentBase64: fs.readFileSync(filePath).toString('base64')
  };
}

function normalizeFinding(rawFinding, reportId, index) {
  return {
    id: ensureString(rawFinding?.id, `finding_import_${reportId}_${index + 1}`),
    reportId,
    name: ensureString(rawFinding?.name, `Lỗ hổng ${index + 1}`),
    severity: ensureSeverity(rawFinding?.severity),
    description: ensureHtml(rawFinding?.description, EMPTY_HTML),
    impact: ensureHtml(rawFinding?.impact, EMPTY_HTML),
    reproduction: ensureHtml(rawFinding?.reproduction, DEFAULT_REPRODUCTION_HTML),
    location: ensureHtml(rawFinding?.location, EMPTY_HTML),
    remediation: ensureHtml(rawFinding?.remediation, EMPTY_HTML),
    cvssScore: ensureString(rawFinding?.cvssScore, ''),
    cvssRef: ensureString(rawFinding?.cvssRef, ''),
    references: ensureHtml(rawFinding?.references, EMPTY_HTML),
    sortOrder: Number.isFinite(Number(rawFinding?.sortOrder)) ? Number(rawFinding.sortOrder) : index,
    createdAt: ensureIsoDate(rawFinding?.createdAt),
    updatedAt: ensureIsoDate(rawFinding?.updatedAt)
  };
}

function normalizeAttachment(rawAttachment, reportId, findingIds) {
  const storedName = ensureUploadFilename(rawAttachment?.storedName);
  const buffer = decodeAttachmentContent(rawAttachment?.contentBase64, storedName);
  const findingId = typeof rawAttachment?.findingId === 'string' && findingIds.has(rawAttachment.findingId) ? rawAttachment.findingId : null;

  return {
    id: ensureString(rawAttachment?.id, `attachment_${storedName}`),
    reportId,
    findingId,
    originalName: ensureString(rawAttachment?.originalName, storedName),
    storedName,
    url: publicUploadPath(storedName),
    type: ensureString(rawAttachment?.type, 'application/octet-stream'),
    size: Number.isFinite(Number(rawAttachment?.size)) ? Number(rawAttachment.size) : buffer.length,
    createdAt: ensureIsoDate(rawAttachment?.createdAt),
    buffer
  };
}

function normalizeReport(rawReport, index) {
  const reportId = ensureString(rawReport?.id, `report_import_${index + 1}`);
  const findings = Array.isArray(rawReport?.findings)
    ? rawReport.findings.map((finding, findingIndex) => normalizeFinding(finding, reportId, findingIndex))
    : [];
  const findingIds = new Set(findings.map((finding) => finding.id));
  const attachments = Array.isArray(rawReport?.attachments)
    ? rawReport.attachments.map((attachment) => normalizeAttachment(attachment, reportId, findingIds))
    : [];

  return {
    id: reportId,
    title: ensureString(rawReport?.title, `Báo cáo ${index + 1}`),
    author: ensureString(rawReport?.author, ''),
    target: ensureString(rawReport?.target, ''),
    overview: ensureHtml(rawReport?.overview, EMPTY_HTML),
    appendix: ensureHtml(rawReport?.appendix, EMPTY_HTML),
    language: ensureString(rawReport?.language, 'vi'),
    template: ensureString(rawReport?.template, 'default-v2'),
    createdAt: ensureIsoDate(rawReport?.createdAt),
    updatedAt: ensureIsoDate(rawReport?.updatedAt),
    findings,
    attachments
  };
}

function normalizeBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw badRequest('File backup không hợp lệ.');
  }

  if (!Array.isArray(payload.reports)) {
    throw badRequest('Backup không có danh sách báo cáo hợp lệ.');
  }

  return {
    format: ensureString(payload.format, BACKUP_FORMAT),
    version: Number.isFinite(Number(payload.version)) ? Number(payload.version) : BACKUP_VERSION,
    exportedAt: ensureIsoDate(payload.exportedAt),
    reports: payload.reports.map((report, index) => normalizeReport(report, index))
  };
}

function stageAttachments(reports) {
  const stagingDirectory = createStagingDirectory();
  const files = [];
  const seenFiles = new Map();

  for (const report of reports) {
    for (const attachment of report.attachments) {
      const existing = seenFiles.get(attachment.storedName);

      if (existing) {
        if (!existing.buffer.equals(attachment.buffer)) {
          throw badRequest(`Backup chứa nhiều file khác nhau nhưng cùng tên "${attachment.storedName}".`);
        }

        continue;
      }

      const filePath = path.join(stagingDirectory, attachment.storedName);
      fs.writeFileSync(filePath, attachment.buffer);
      seenFiles.set(attachment.storedName, { buffer: attachment.buffer, filePath });
      files.push({ storedName: attachment.storedName, filePath });
    }
  }

  return {
    stagingDirectory,
    files
  };
}

function replaceDatabaseContents(reports) {
  const insertReport = db.prepare(`
    INSERT INTO reports (id, title, author, target, overview_html, appendix_html, language, template, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFinding = db.prepare(`
    INSERT INTO findings (
      id,
      report_id,
      name,
      severity,
      description_html,
      impact_html,
      reproduction_html,
      location_html,
      remediation_html,
      cvss_score,
      cvss_ref,
      references_html,
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAttachment = db.prepare(`
    INSERT INTO attachments (id, report_id, finding_id, original_name, stored_name, url, mime_type, size, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');

  try {
    db.prepare('DELETE FROM reports').run();

    for (const report of reports) {
      insertReport.run(
        report.id,
        report.title,
        report.author,
        report.target,
        report.overview,
        report.appendix,
        report.language,
        report.template,
        report.createdAt,
        report.updatedAt
      );

      for (const finding of report.findings) {
        insertFinding.run(
          finding.id,
          report.id,
          finding.name,
          finding.severity,
          finding.description,
          finding.impact,
          finding.reproduction,
          finding.location,
          finding.remediation,
          finding.cvssScore,
          finding.cvssRef,
          finding.references,
          finding.sortOrder,
          finding.createdAt,
          finding.updatedAt
        );
      }

      for (const attachment of report.attachments) {
        insertAttachment.run(
          attachment.id,
          report.id,
          attachment.findingId,
          attachment.originalName,
          attachment.storedName,
          attachment.url,
          attachment.type,
          attachment.size,
          attachment.createdAt
        );
      }
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function summarizeReports(reports) {
  return reports.reduce(
    (result, report) => ({
      reports: result.reports + 1,
      findings: result.findings + report.findings.length,
      attachments: result.attachments + report.attachments.length
    }),
    { reports: 0, findings: 0, attachments: 0 }
  );
}

export function createBackupPayload() {
  const reports = listReports()
    .map((summary) => getReportById(summary.id))
    .filter(Boolean)
    .map((report) => ({
      ...report,
      attachments: report.attachments.map(buildAttachmentBackup)
    }));

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: summarizeReports(reports),
    reports
  };
}

export function restoreBackupPayload(payload) {
  const backup = normalizeBackupPayload(payload);
  const staged = stageAttachments(backup.reports);

  try {
    ensureUploadDirectory();

    for (const file of staged.files) {
      fs.copyFileSync(file.filePath, path.join(UPLOAD_DIR, file.storedName));
    }

    replaceDatabaseContents(backup.reports);
    cleanupUnusedUploads(new Set(backup.reports.flatMap((report) => report.attachments.map((attachment) => attachment.storedName))));

    return summarizeReports(backup.reports);
  } finally {
    cleanupDirectory(staged.stagingDirectory);
  }
}
