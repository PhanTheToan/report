import type { FindingRecord, ReportRecord, ReportSummary, Severity } from '../types/report';

export const DEFAULT_REPORT_TITLE = 'Báo cáo lỗ hổng mới';

export interface SectionDefinition {
  key: keyof Pick<FindingRecord, 'description' | 'impact' | 'reproduction' | 'location' | 'remediation' | 'references'>;
  label: string;
  helper: string;
  placeholder: string;
}

export const SEVERITY_OPTIONS: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

export const SEVERITY_LABELS: Record<Severity, string> = {
  Critical: 'Nghiêm trọng',
  High: 'CAO',
  Medium: 'Trung bình',
  Low: 'Thấp',
  Info: 'Thông tin'
};

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: 'impact',
    label: 'Tác động',
    helper: 'Nêu rõ ảnh hưởng đến bí mật, toàn vẹn và sẵn sàng của hệ thống.',
    placeholder: 'Mô tả khả năng leo thang, truy cập trái phép, lộ dữ liệu hoặc gây gián đoạn.'
  },
  {
    key: 'description',
    label: 'Nguyên nhân',
    helper: 'Mô tả nguồn gốc vấn đề, bối cảnh xảy ra và điều kiện khiến lỗ hổng xuất hiện.',
    placeholder: 'Nêu nguyên nhân gốc rễ, logic xử lý hoặc cấu hình sai khiến lỗ hổng tồn tại.'
  },
  {
    key: 'reproduction',
    label: 'Tái hiện',
    helper: 'Ghi lại các bước proof-of-concept theo thứ tự rõ ràng.',
    placeholder: 'Thêm từng bước tái hiện, request/response, payload và kết quả quan sát được.'
  },
  {
    key: 'location',
    label: 'Vị trí',
    helper: 'Chỉ rõ endpoint, màn hình, tham số hoặc service bị ảnh hưởng.',
    placeholder: 'Ví dụ: GET /search?q= trên https://example.com/search'
  },
  {
    key: 'remediation',
    label: 'Phương án phòng ngừa',
    helper: 'Đưa ra hướng khắc phục ở mức kỹ thuật và quy trình.',
    placeholder: 'Nêu biện pháp fix, hardening, validate input, parameterized query hoặc WAF.'
  },
  {
    key: 'references',
    label: 'Tham khảo',
    helper: 'Chèn liên kết OWASP, CVE, tài liệu nhà cung cấp hoặc ảnh minh họa.',
    placeholder: 'Thêm danh sách reference, CVE, guideline hoặc wiki nội bộ.'
  }
];

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(iso));
}

export function getSeverityLabel(severity: Severity) {
  return SEVERITY_LABELS[severity];
}

export function getSeverityBadgeClass(severity: Severity) {
  switch (severity) {
    case 'Critical':
      return 'bg-violet-700 text-white ring-1 ring-violet-700';
    case 'High':
      return 'bg-red-600 text-white ring-1 ring-red-600';
    case 'Medium':
      return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
    case 'Low':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  }
}

export function getSeveritySelectClass(severity: Severity) {
  switch (severity) {
    case 'Critical':
      return '!border-violet-700 !bg-violet-700 !text-white';
    case 'High':
      return '!border-red-600 !bg-red-600 !text-white';
    case 'Medium':
      return '!border-amber-500 !bg-amber-500 !text-white';
    case 'Low':
      return '!border-emerald-600 !bg-emerald-600 !text-white';
    default:
      return '!border-slate-600 !bg-slate-600 !text-white';
  }
}

export function getSeverityChevronClass(severity: Severity) {
  return severity === 'Critical' || severity === 'High' || severity === 'Medium' || severity === 'Low' || severity === 'Info'
    ? '!text-white'
    : 'text-slate-500';
}

export function slugifyFilename(value: string, fallback = 'vuln-report') {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

export function toReportSummary(report: ReportRecord): ReportSummary {
  return {
    id: report.id,
    title: report.title,
    author: report.author,
    target: report.target,
    findingCount: report.findings.length,
    updatedAt: report.updatedAt
  };
}
