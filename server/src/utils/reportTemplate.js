import fs from 'node:fs';
import path from 'node:path';
import { extractCvssDisplayText, getCvssReferenceHref } from './cvss.js';
import { escapeHtml } from './escapeHtml.js';
import { publicUploadPath, UPLOAD_DIR } from './paths.js';

const FINDING_SECTIONS = [
  ['description', 'Mô tả'],
  ['impact', 'Tác động'],
  ['reproduction', 'Tái hiện'],
  ['location', 'Vị trí'],
  ['remediation', 'Phương án phòng ngừa'],
  ['references', 'Tham khảo']
];

const SEVERITY_LABELS = {
  Critical: 'Nghiêm trọng',
  High: 'CAO',
  Medium: 'Trung bình',
  Low: 'Thấp',
  Info: 'Thông tin'
};

function getSeverityTheme(severity) {
  switch (severity) {
    case 'Critical':
      return {
        background: '#6d28d9',
        color: '#ffffff',
        border: '#6d28d9'
      };
    case 'High':
      return {
        background: '#dc2626',
        color: '#ffffff',
        border: '#dc2626'
      };
    case 'Medium':
      return {
        background: '#f59e0b',
        color: '#ffffff',
        border: '#f59e0b'
      };
    case 'Low':
      return {
        background: '#059669',
        color: '#ffffff',
        border: '#059669'
      };
    default:
      return {
        background: '#475569',
        color: '#ffffff',
        border: '#475569'
      };
  }
}

function renderSeverityPill(severity) {
  const theme = getSeverityTheme(severity);

  return `
    <span class="severity-pill" style="background:${theme.background}; color:${theme.color}; border-color:${theme.border};">
      ${escapeHtml(SEVERITY_LABELS[severity] ?? severity)}
    </span>
  `;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function normalizeUploadSrc(src) {
  if (typeof src !== 'string' || src.length === 0) {
    return null;
  }

  if (src.startsWith('/uploads/')) {
    return src;
  }

  try {
    const parsed = new URL(src);
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    return null;
  }

  return null;
}

function buildAttachmentDataUrlMap(attachments = []) {
  const map = new Map();

  for (const attachment of attachments) {
    if (!attachment?.storedName) {
      continue;
    }

    const publicPath = publicUploadPath(attachment.storedName);
    const filePath = path.join(UPLOAD_DIR, attachment.storedName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const mimeType = attachment.type || 'application/octet-stream';
    const base64 = fs.readFileSync(filePath).toString('base64');
    map.set(publicPath, `data:${mimeType};base64,${base64}`);
  }

  return map;
}

function resolveUploadUrls(html, attachmentDataUrlMap) {
  return String(html || '').replace(/src=(["'])([^"']+)\1/g, (match, quote, src) => {
    const normalizedSrc = normalizeUploadSrc(src);

    if (!normalizedSrc) {
      return match;
    }

    const embeddedSrc = attachmentDataUrlMap.get(normalizedSrc);
    return embeddedSrc ? `src=${quote}${embeddedSrc}${quote}` : match;
  });
}

function hasMeaningfulHtml(html) {
  const value = String(html ?? '');

  if (/<(img|table|pre|blockquote|ul|ol)\b/i.test(value)) {
    return true;
  }

  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length > 0;
}

function renderRichSection(id, title, html, attachmentDataUrlMap, className = '') {
  if (!hasMeaningfulHtml(html)) {
    return '';
  }

  const sectionClassName = ['report-block', id === 'section-appendix' ? 'page-break-before' : '', className]
    .filter(Boolean)
    .join(' ');

  return `
    <section class="${sectionClassName}" id="${id}">
      <h2 class="section-title">${title}</h2>
      <div class="rich-content">${resolveUploadUrls(html, attachmentDataUrlMap)}</div>
    </section>
  `;
}

function renderTableOfContents(report) {
  const items = [];

  if (hasMeaningfulHtml(report.overview)) {
    items.push(`<li><a class="toc-link" href="#section-overview">Mô tả chung</a></li>`);
  }

  if (report.findings.length > 0) {
    items.push(`<li><a class="toc-link" href="#section-summary">Danh sách lỗ hổng</a></li>`);
    items.push(
      ...report.findings.map(
        (finding, index) => `
          <li><a class="toc-link" href="#finding-${index + 1}">Lỗ hổng ${index + 1}: ${escapeHtml(finding.name)}</a></li>
        `
      )
    );
  }

  if (hasMeaningfulHtml(report.appendix)) {
    items.push(`<li><a class="toc-link" href="#section-appendix">Phụ lục</a></li>`);
  }

  if (items.length === 0) {
    return '';
  }

  return `
    <section class="report-block" id="section-toc">
      <h2 class="section-title">Mục lục</h2>
      <ol class="toc-list">
        ${items.join('')}
      </ol>
    </section>
  `;
}

function renderFindingSummary(report) {
  if (report.findings.length === 0) {
    return '';
  }

  const rows = report.findings
    .map(
      (finding, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><a class="summary-link" href="#finding-${index + 1}">${escapeHtml(finding.name)}</a></td>
          <td>${renderSeverityPill(finding.severity)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <section class="report-block" id="section-summary">
      <h2 class="section-title">Danh sách lỗ hổng</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên lỗ hổng</th>
            <th>Mức độ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function renderCvssMeta(cvssScore, cvssRef) {
  const displayText = extractCvssDisplayText(cvssRef);
  const scoreText = typeof cvssScore === 'string' ? cvssScore.trim() : '';

  if (!displayText && !scoreText) {
    return '';
  }

  const href = getCvssReferenceHref(cvssRef);

  return `
    <div class="cvss-meta">
      ${scoreText ? `<span>Điểm CVSS: ${escapeHtml(scoreText)}</span>` : ''}
      ${displayText ? (href ? `<a class="cvss-link" href="${escapeHtml(href)}">${escapeHtml(displayText)}</a>` : `<span>${escapeHtml(displayText)}</span>`) : ''}
    </div>
  `;
}

function renderFinding(finding, index, attachmentDataUrlMap) {
  const findingSections = [
    ['impact', 'Tác động'],
    ['description', 'Nguyên nhân'],
    ['reproduction', 'Tái hiện'],
    ['location', 'Vị trí'],
    ['remediation', 'Phương án phòng ngừa'],
    ['references', 'Tham khảo']
  ];

  const sections = findingSections.map(([key, label]) => {
    const content = hasMeaningfulHtml(finding[key]) ? resolveUploadUrls(finding[key], attachmentDataUrlMap) : '';

    return `
      <section class="finding-section">
        <h3 class="subsection-title">${label}</h3>
        <div class="rich-content">${content}</div>
      </section>
    `;
  }).join('');

  return `
    <article class="finding-card" id="finding-${index + 1}">
      <div class="finding-header">
        <div>
          <div class="finding-index">Lỗ hổng ${index + 1}</div>
          <h2 class="finding-title">${escapeHtml(finding.name)}</h2>
          ${renderCvssMeta(finding.cvssScore, finding.cvssRef)}
        </div>
        ${renderSeverityPill(finding.severity)}
      </div>
      ${sections}
    </article>
  `;
}

export function buildReportHtml(report) {
  const attachmentDataUrlMap = buildAttachmentDataUrlMap(report.attachments);
  const findingsHtml =
    report.findings.length > 0
      ? report.findings.map((finding, index) => renderFinding(finding, index, attachmentDataUrlMap)).join('')
      : '';

  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(report.title)}</title>
        <style>
          * { box-sizing: border-box; }
          html { scroll-behavior: smooth; }
          body {
            margin: 0;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
          }
          .document {
            padding: 36px 40px 48px;
          }
          .report-header {
            margin-bottom: 28px;
            padding-bottom: 18px;
            border-bottom: 2px solid #111827;
          }
          .report-title {
            margin: 0;
            font-size: 28px;
            line-height: 1.2;
          }
          .report-subtitle {
            margin: 8px 0 0;
            font-size: 14px;
            color: #4b5563;
          }
          .meta-table,
          .summary-table,
          .rich-content table {
            width: 100%;
            border-collapse: collapse;
          }
          .meta-table {
            margin-top: 18px;
          }
          .meta-table th,
          .meta-table td,
          .summary-table th,
          .summary-table td,
          .rich-content th,
          .rich-content td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
            font-size: 13px;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .meta-table th,
          .rich-content th {
            width: 22%;
            background: #f8fafc;
            font-weight: 700;
          }
          .summary-table th {
            background: #f8fafc;
            font-weight: 700;
          }
          .summary-table th:first-child,
          .summary-table td:first-child {
            width: 64px;
            text-align: center;
            white-space: nowrap;
          }
          .summary-table th:last-child,
          .summary-table td:last-child {
            width: 128px;
            white-space: nowrap;
          }
          .report-block {
            margin-bottom: 24px;
          }
          .page-break-before {
            break-before: page;
            page-break-before: always;
          }
          .section-title {
            margin: 0 0 12px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #475569;
          }
          .toc-list {
            margin: 0;
            padding-left: 20px;
          }
          .toc-list li {
            margin: 8px 0;
            font-size: 14px;
            color: #1f2937;
          }
          .toc-link,
          .summary-link {
            color: #0f172a;
            text-decoration: none;
          }
          .subsection-title {
            margin: 0 0 10px;
            font-size: 17px;
            font-weight: 700;
            color: #111827;
          }
          .finding-card {
            margin-top: 28px;
            padding-top: 22px;
            border-top: 1px solid #d1d5db;
            page-break-inside: avoid;
          }
          .finding-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }
          .finding-index {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
          }
          .finding-title {
            margin: 6px 0 0;
            font-size: 22px;
            line-height: 1.25;
          }
          .cvss-meta {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-top: 10px;
            font-size: 13px;
            line-height: 1.5;
            color: #475569;
            flex-wrap: wrap;
          }
          .cvss-link {
            color: #475569;
            text-decoration: none;
            word-break: break-all;
          }
          .severity-pill {
            display: inline-flex;
            align-items: center;
            border: 1px solid #cbd5e1;
            border-radius: 999px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
            background: #f8fafc;
            color: #111827;
          }
          .finding-section {
            margin-bottom: 18px;
          }
          .finding-section:last-child {
            margin-bottom: 0;
          }
          .rich-content {
            font-size: 14px;
            line-height: 1.7;
            color: #111827;
          }
          .rich-content p {
            margin: 0 0 12px;
          }
          .rich-content ul,
          .rich-content ol {
            margin: 0 0 14px;
            padding-left: 22px;
          }
          .rich-content table {
            margin: 0 0 14px;
            margin-left: auto;
            margin-right: auto;
            table-layout: fixed;
          }
          .rich-content ul {
            list-style: disc;
          }
          .rich-content ol {
            list-style: decimal;
          }
          .rich-content li {
            margin: 6px 0;
          }
          .rich-content img {
            display: block;
            width: auto;
            max-width: min(520px, 78%);
            height: auto;
            max-height: 560px;
            object-fit: contain;
            margin: 14px auto;
            border: 1px solid #cbd5e1;
          }
          .rich-content pre {
            margin: 0 0 14px;
            padding: 14px;
            background: #111827;
            color: #e5e7eb;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }
          .rich-content blockquote {
            margin: 0 0 14px;
            padding-left: 12px;
            border-left: 3px solid #94a3b8;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="document">
          <header class="report-header">
            <h1 class="report-title">${escapeHtml(report.title)}</h1>
            <p class="report-subtitle">Báo cáo tổng hợp thông tin chung, danh sách lỗ hổng và phụ lục.</p>
            <table class="meta-table">
              <tbody>
                <tr>
                  <th>Mục tiêu</th>
                  <td>${escapeHtml(report.target || '-')}</td>
                  <th>Người viết</th>
                  <td>${escapeHtml(report.author || '-')}</td>
                </tr>
                <tr>
                  <th>Cập nhật</th>
                  <td>${escapeHtml(formatDate(report.updatedAt))}</td>
                  <th>Số lỗ hổng</th>
                  <td>${report.findings.length}</td>
                </tr>
              </tbody>
            </table>
          </header>

          ${renderTableOfContents(report)}
          ${renderRichSection('section-overview', 'Mô tả chung', report.overview, attachmentDataUrlMap)}
          ${renderFindingSummary(report)}
          ${findingsHtml}
          ${renderRichSection('section-appendix', 'Phụ lục', report.appendix, attachmentDataUrlMap)}
        </div>
      </body>
    </html>
  `;
}
