export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export interface ReportSummary {
  id: string;
  title: string;
  author: string;
  target: string;
  findingCount: number;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  reportId: string;
  findingId: string | null;
  originalName: string;
  storedName: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface FindingRecord {
  id: string;
  reportId: string;
  name: string;
  severity: Severity;
  description: string;
  impact: string;
  reproduction: string;
  location: string;
  remediation: string;
  references: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  author: string;
  target: string;
  overview: string;
  language: 'vi' | 'en';
  template: 'default-v2';
  createdAt: string;
  updatedAt: string;
  findings: FindingRecord[];
  attachments: Attachment[];
}

export interface UploadResponse {
  success: true;
  attachment: Attachment;
}

export interface ReportListResponse {
  reports: ReportSummary[];
}

export interface ReportResponse {
  report: ReportRecord;
}

export interface FindingResponse {
  finding: FindingRecord;
  summary: ReportSummary | null;
}

export interface ReportMutationResponse {
  report: ReportRecord;
  summary: ReportSummary | null;
}
