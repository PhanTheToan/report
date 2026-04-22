import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { publicUploadPath } from '../utils/paths.js';

const ALLOWED_SEVERITIES = new Set(['Critical', 'High', 'Medium', 'Low', 'Info']);
const EMPTY_HTML = '<p></p>';
const DEFAULT_REPRODUCTION_HTML = '<ol><li></li></ol>';

function now() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function sanitizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function sanitizeHtml(value, fallback = EMPTY_HTML) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function sanitizeSeverity(value) {
  return ALLOWED_SEVERITIES.has(value) ? value : 'Medium';
}

function sanitizeCvssRef(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeCvssScore(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).trim().replace(',', '.');

  if (!normalized) {
    return '';
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return '';
  }

  const clamped = Math.min(10, Math.max(0, parsed));
  const rounded = Math.round(clamped * 10) / 10;
  return rounded % 1 === 0 ? String(rounded.toFixed(0)) : String(rounded.toFixed(1));
}

function mapFindingRow(row) {
  return {
    id: row.id,
    reportId: row.report_id,
    name: row.name,
    severity: row.severity,
    description: row.description_html,
    impact: row.impact_html,
    reproduction: row.reproduction_html,
    location: row.location_html,
    remediation: row.remediation_html,
    cvssScore: row.cvss_score,
    cvssRef: row.cvss_ref,
    references: row.references_html,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAttachmentRow(row) {
  return {
    id: row.id,
    reportId: row.report_id,
    findingId: row.finding_id,
    originalName: row.original_name,
    storedName: row.stored_name,
    url: row.url,
    type: row.mime_type,
    size: row.size,
    createdAt: row.created_at
  };
}

function mapReportRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    target: row.target,
    overview: row.overview_html,
    appendix: row.appendix_html,
    language: row.language,
    template: row.template,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildSummary(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    target: row.target,
    findingCount: row.finding_count,
    updatedAt: row.updated_at
  };
}

export function listReports() {
  const rows = db
    .prepare(
      `
        SELECT
          reports.id,
          reports.title,
          reports.author,
          reports.target,
          reports.updated_at,
          COUNT(findings.id) AS finding_count
        FROM reports
        LEFT JOIN findings ON findings.report_id = reports.id
        GROUP BY reports.id
        ORDER BY reports.updated_at DESC
      `
    )
    .all();

  return rows.map(buildSummary);
}

export function getReportById(reportId) {
  const reportRow = db
    .prepare(
      `
        SELECT id, title, author, target, overview_html, appendix_html, language, template, created_at, updated_at
        FROM reports
        WHERE id = ?
      `
    )
    .get(reportId);

  if (!reportRow) {
    return null;
  }

  const findings = db
    .prepare(
      `
        SELECT
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
        FROM findings
        WHERE report_id = ?
        ORDER BY sort_order ASC, updated_at DESC
      `
    )
    .all(reportId)
    .map(mapFindingRow);

  const attachments = db
    .prepare(
      `
        SELECT
          id,
          report_id,
          finding_id,
          original_name,
          stored_name,
          url,
          mime_type,
          size,
          created_at
        FROM attachments
        WHERE report_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(reportId)
    .map(mapAttachmentRow);

  return {
    ...mapReportRow(reportRow),
    findings,
    attachments
  };
}

export function createReport(payload = {}) {
  const timestamp = now();
  const reportId = makeId('report');
  const report = {
    id: reportId,
    title: sanitizeText(payload.title, 'Báo cáo lỗ hổng mới'),
    author: sanitizeText(payload.author, 'Security Team'),
    target: sanitizeText(payload.target, 'example.com'),
    overview: sanitizeHtml(payload.overview, EMPTY_HTML),
    appendix: sanitizeHtml(payload.appendix, EMPTY_HTML),
    language: 'vi',
    template: 'default-v2',
    createdAt: timestamp,
    updatedAt: timestamp
  };

  db.prepare(
    `
      INSERT INTO reports (id, title, author, target, overview_html, appendix_html, language, template, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
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

  createFinding(reportId, {});

  return getReportById(reportId);
}

export function updateReport(reportId, patch = {}) {
  const existing = getReportById(reportId);

  if (!existing) {
    return null;
  }

  const next = {
    ...existing,
    title: sanitizeText(patch.title, existing.title),
    author: sanitizeText(patch.author, existing.author),
    target: sanitizeText(patch.target, existing.target),
    overview: patch.overview !== undefined ? sanitizeHtml(patch.overview, EMPTY_HTML) : existing.overview,
    appendix: patch.appendix !== undefined ? sanitizeHtml(patch.appendix, EMPTY_HTML) : existing.appendix,
    updatedAt: now()
  };

  db.prepare(
    `
      UPDATE reports
      SET title = ?, author = ?, target = ?, overview_html = ?, appendix_html = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(next.title, next.author, next.target, next.overview, next.appendix, next.updatedAt, reportId);

  return getReportById(reportId);
}

export function deleteReport(reportId) {
  return db.prepare('DELETE FROM reports WHERE id = ?').run(reportId).changes > 0;
}

export function createFinding(reportId, payload = {}) {
  const reportExists = db.prepare('SELECT id FROM reports WHERE id = ?').get(reportId);

  if (!reportExists) {
    return null;
  }

  const timestamp = now();
  const sortRow = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM findings WHERE report_id = ?').get(reportId);
  const finding = {
    id: makeId('finding'),
    reportId,
    name: sanitizeText(payload.name, 'Lỗ hổng mới'),
    severity: sanitizeSeverity(payload.severity),
    description: sanitizeHtml(payload.description, EMPTY_HTML),
    impact: sanitizeHtml(payload.impact, EMPTY_HTML),
    reproduction: sanitizeHtml(payload.reproduction, DEFAULT_REPRODUCTION_HTML),
    location: sanitizeHtml(payload.location, EMPTY_HTML),
    remediation: sanitizeHtml(payload.remediation, EMPTY_HTML),
    cvssScore: sanitizeCvssScore(payload.cvssScore),
    cvssRef: sanitizeCvssRef(payload.cvssRef),
    references: sanitizeHtml(payload.references, EMPTY_HTML),
    sortOrder: Number(sortRow?.max_sort ?? -1) + 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  db.prepare(
    `
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
    `
  ).run(
    finding.id,
    finding.reportId,
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

  touchReport(reportId);

  return getFindingById(finding.id);
}

export function getFindingById(findingId) {
  const row = db
    .prepare(
      `
        SELECT
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
        FROM findings
        WHERE id = ?
      `
    )
    .get(findingId);

  return row ? mapFindingRow(row) : null;
}

export function updateFinding(findingId, patch = {}) {
  const existing = getFindingById(findingId);

  if (!existing) {
    return null;
  }

  const next = {
    ...existing,
    name: patch.name !== undefined ? sanitizeText(patch.name, existing.name) : existing.name,
    severity: patch.severity !== undefined ? sanitizeSeverity(patch.severity) : existing.severity,
    description: patch.description !== undefined ? sanitizeHtml(patch.description, EMPTY_HTML) : existing.description,
    impact: patch.impact !== undefined ? sanitizeHtml(patch.impact, EMPTY_HTML) : existing.impact,
    reproduction: patch.reproduction !== undefined ? sanitizeHtml(patch.reproduction, DEFAULT_REPRODUCTION_HTML) : existing.reproduction,
    location: patch.location !== undefined ? sanitizeHtml(patch.location, EMPTY_HTML) : existing.location,
    remediation: patch.remediation !== undefined ? sanitizeHtml(patch.remediation, EMPTY_HTML) : existing.remediation,
    cvssScore: patch.cvssScore !== undefined ? sanitizeCvssScore(patch.cvssScore) : existing.cvssScore,
    cvssRef: patch.cvssRef !== undefined ? sanitizeCvssRef(patch.cvssRef) : existing.cvssRef,
    references: patch.references !== undefined ? sanitizeHtml(patch.references, EMPTY_HTML) : existing.references,
    updatedAt: now()
  };

  db.prepare(
    `
      UPDATE findings
      SET
        name = ?,
        severity = ?,
        description_html = ?,
        impact_html = ?,
        reproduction_html = ?,
        location_html = ?,
        remediation_html = ?,
        cvss_score = ?,
        cvss_ref = ?,
        references_html = ?,
        updated_at = ?
      WHERE id = ?
    `
  ).run(
    next.name,
    next.severity,
    next.description,
    next.impact,
    next.reproduction,
    next.location,
    next.remediation,
    next.cvssScore,
    next.cvssRef,
    next.references,
    next.updatedAt,
    findingId
  );

  touchReport(existing.reportId);

  return getFindingById(findingId);
}

export function deleteFinding(findingId) {
  const finding = getFindingById(findingId);

  if (!finding) {
    return false;
  }

  const deleted = db.prepare('DELETE FROM findings WHERE id = ?').run(findingId).changes > 0;

  if (deleted) {
    db.prepare('UPDATE attachments SET finding_id = NULL WHERE finding_id = ?').run(findingId);
    touchReport(finding.reportId);
  }

  return deleted;
}

export function createAttachment({ reportId, findingId, originalName, storedName, type, size }) {
  const report = db.prepare('SELECT id FROM reports WHERE id = ?').get(reportId);

  if (!report) {
    return null;
  }

  if (findingId) {
    const finding = db.prepare('SELECT id FROM findings WHERE id = ? AND report_id = ?').get(findingId, reportId);

    if (!finding) {
      return null;
    }
  }

  const attachment = {
    id: makeId('attachment'),
    reportId,
    findingId: findingId ?? null,
    originalName,
    storedName,
    url: publicUploadPath(storedName),
    type,
    size,
    createdAt: now()
  };

  db.prepare(
    `
      INSERT INTO attachments (id, report_id, finding_id, original_name, stored_name, url, mime_type, size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    attachment.id,
    attachment.reportId,
    attachment.findingId,
    attachment.originalName,
    attachment.storedName,
    attachment.url,
    attachment.type,
    attachment.size,
    attachment.createdAt
  );

  touchReport(reportId);

  return attachment;
}

export function getReportSummary(reportId) {
  const row = db
    .prepare(
      `
        SELECT
          reports.id,
          reports.title,
          reports.author,
          reports.target,
          reports.updated_at,
          COUNT(findings.id) AS finding_count
        FROM reports
        LEFT JOIN findings ON findings.report_id = reports.id
        WHERE reports.id = ?
        GROUP BY reports.id
      `
    )
    .get(reportId);

  return row ? buildSummary(row) : null;
}

export function touchReport(reportId) {
  db.prepare('UPDATE reports SET updated_at = ? WHERE id = ?').run(now(), reportId);
}
