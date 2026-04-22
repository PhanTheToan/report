PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  target TEXT NOT NULL,
  overview_html TEXT NOT NULL DEFAULT '<p></p>',
  appendix_html TEXT NOT NULL DEFAULT '<p></p>',
  language TEXT NOT NULL DEFAULT 'vi',
  template TEXT NOT NULL DEFAULT 'default-v2',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  name TEXT NOT NULL,
  severity TEXT NOT NULL,
  description_html TEXT NOT NULL DEFAULT '<p></p>',
  impact_html TEXT NOT NULL DEFAULT '<p></p>',
  reproduction_html TEXT NOT NULL DEFAULT '<ol><li></li></ol>',
  location_html TEXT NOT NULL DEFAULT '<p></p>',
  remediation_html TEXT NOT NULL DEFAULT '<p></p>',
  cvss_score TEXT NOT NULL DEFAULT '',
  cvss_ref TEXT NOT NULL DEFAULT '',
  references_html TEXT NOT NULL DEFAULT '<p></p>',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  finding_id TEXT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_findings_report_sort ON findings(report_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_attachments_report_created ON attachments(report_id, created_at);
