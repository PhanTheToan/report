import { FileText, ShieldAlert } from 'lucide-react';
import type { FindingRecord, ReportSummary } from '../types/report';
import { formatDateTime, getSeverityBadgeClass, getSeverityLabel } from '../utils/report';

interface WorkspaceSidebarProps {
  reports: ReportSummary[];
  selectedReportId: string | null;
  selectedFindingId: string | null;
  activeEditor: 'report' | 'finding';
  findings: FindingRecord[];
  onSelectReport: (reportId: string) => void;
  onSelectFinding: (findingId: string) => void;
}

function itemClass(active: boolean, contextual: boolean) {
  if (active) {
    return 'border-sky-300 bg-sky-50 shadow-sm';
  }

  if (contextual) {
    return 'border-slate-200 bg-slate-50';
  }

  return 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50';
}

export default function WorkspaceSidebar({
  reports,
  selectedReportId,
  selectedFindingId,
  activeEditor,
  findings,
  onSelectReport,
  onSelectFinding
}: WorkspaceSidebarProps) {
  return (
    <div className="space-y-4">
      <section className="panel-card px-5 py-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Điều hướng</h2>
          <p className="text-sm leading-6 text-slate-500">Chọn báo cáo hoặc lỗ hổng để sửa.</p>
        </div>
      </section>

      <section className="panel-card px-5 py-5">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">Báo cáo</h2>
        </div>

        <div className="space-y-3">
          {reports.map((report) => {
            const isCurrentReport = selectedReportId === report.id;
            const isActive = isCurrentReport && activeEditor === 'report';

            return (
              <button
                key={report.id}
                type="button"
                onClick={() => onSelectReport(report.id)}
                className={`w-full cursor-pointer rounded-2xl border px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${itemClass(isActive, isCurrentReport && !isActive)}`}
              >
                <div className="text-sm font-semibold text-slate-900">{report.title}</div>
                <div className="mt-1 text-xs text-slate-500">{report.target || 'Chưa có mục tiêu'}</div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{report.findingCount} lỗ hổng</span>
                  <span>{formatDateTime(report.updatedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-card px-5 py-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">Lỗ hổng</h2>
        </div>

        <div className="space-y-3">
          {findings.length > 0 ? (
            findings.map((finding) => {
              const isCurrentFinding = selectedFindingId === finding.id;
              const isActive = isCurrentFinding && activeEditor === 'finding';

              return (
                <button
                  key={finding.id}
                  type="button"
                  onClick={() => onSelectFinding(finding.id)}
                  className={`w-full cursor-pointer rounded-2xl border px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${itemClass(isActive, isCurrentFinding && !isActive)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{finding.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDateTime(finding.updatedAt)}</div>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSeverityBadgeClass(finding.severity)}`}>
                      {getSeverityLabel(finding.severity)}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              Báo cáo này chưa có lỗ hổng nào.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
