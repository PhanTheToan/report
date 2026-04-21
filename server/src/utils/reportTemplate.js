import { escapeHtml } from './escapeHtml.js';
import { uploadPublicPathToFileUrl } from './paths.js';

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
    <span
      class="severity-pill"
      style="background:${theme.background}; color:${theme.color}; border-color:${theme.border};"
    >
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

function resolveUploadUrls(html) {
  return String(html || '<p>Chưa có nội dung.</p>').replace(
    /src=(["'])(\/uploads\/[^"']+)\1/g,
    (_match, quote, publicPath) => `src=${quote}${uploadPublicPathToFileUrl(publicPath)}${quote}`
  );
}

function hasMeaningfulHtml(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length > 0;
}

function renderOverview(report) {
  if (!hasMeaningfulHtml(report.overview)) {
    return '';
  }

  return `
    <section class="report-block">
      <h2 class="section-title">Mô tả chung</h2>
      <div class="rich-content">${resolveUploadUrls(report.overview)}</div>
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
          <td>${escapeHtml(finding.name)}</td>
          <td>${renderSeverityPill(finding.severity)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <section class="report-block">
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

function renderFinding(finding, index) {
  const sections = FINDING_SECTIONS.map(([key, label]) => {
    const content = hasMeaningfulHtml(finding[key]) ? resolveUploadUrls(finding[key]) : '<p>Chưa có nội dung.</p>';

    return `
      <section class="finding-section">
        <h3 class="subsection-title">${label}</h3>
        <div class="rich-content">${content}</div>
      </section>
    `;
  }).join('');

  return `
    <article class="finding-card">
      <div class="finding-header">
        <div>
          <div class="finding-index">Lỗ hổng ${index + 1}</div>
          <h2 class="finding-title">${escapeHtml(finding.name)}</h2>
        </div>
        ${renderSeverityPill(finding.severity)}
      </div>
      ${sections}
    </article>
  `;
}

export function buildReportHtml(report) {
  const findingsHtml =
    report.findings.length > 0
      ? report.findings.map((finding, index) => renderFinding(finding, index)).join('')
      : '<div class="empty-state">Chưa có lỗ hổng nào trong báo cáo này.</div>';

  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(report.title)}</title>
        <style>
          * { box-sizing: border-box; }
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
          }
          .meta-table th,
          .summary-table th,
          .rich-content th {
            width: 22%;
            background: #f8fafc;
            font-weight: 700;
          }
          .report-block {
            margin-bottom: 24px;
          }
          .section-title {
            margin: 0 0 12px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #475569;
          }
          .subsection-title {
            margin: 0 0 10px;
            font-size: 15px;
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
            width: 100%;
            margin: 14px 0;
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
          .empty-state {
            padding: 14px 16px;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            color: #475569;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="document">
          <header class="report-header">
            <h1 class="report-title">${escapeHtml(report.title)}</h1>
            <p class="report-subtitle">Báo cáo tổng hợp thông tin chung và danh sách lỗ hổng.</p>
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

          ${renderOverview(report)}
          ${renderFindingSummary(report)}
          ${findingsHtml}
        </div>
      </body>
    </html>
  `;
}
