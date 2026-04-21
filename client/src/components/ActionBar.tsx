import type { ReactNode } from 'react';
import { Eye, FileDown, FilePlus2, ShieldAlert, Trash2 } from 'lucide-react';

interface ActionBarProps {
  onCreateReport: () => void;
  onDeleteReport: () => void;
  onCreateFinding: () => void;
  onDeleteFinding: () => void;
  onPreviewPdf: () => void;
  onDownloadPdf: () => void;
  canCreateFinding: boolean;
  canDeleteReport: boolean;
  canDeleteFinding: boolean;
  canExportPdf: boolean;
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'soft',
  icon
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'soft' | 'primary' | 'danger';
  icon: ReactNode;
}) {
  const className =
    variant === 'primary'
      ? 'border border-sky-700 bg-skybrand text-white hover:bg-sky-800 hover:border-sky-800'
      : variant === 'danger'
        ? 'border border-rose-200 bg-white text-rose-700 hover:border-rose-400 hover:text-rose-800'
        : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-800';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${className} ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function ActionBar({
  onCreateReport,
  onDeleteReport,
  onCreateFinding,
  onDeleteFinding,
  onPreviewPdf,
  onDownloadPdf,
  canCreateFinding,
  canDeleteReport,
  canDeleteFinding,
  canExportPdf
}: ActionBarProps) {
  return (
    <div className="panel-card flex flex-wrap items-center gap-3 px-5 py-4">
      <ActionButton label="Báo cáo mới" onClick={onCreateReport} icon={<FilePlus2 className="h-4 w-4" />} />
      <ActionButton label="Thêm lỗ hổng" onClick={onCreateFinding} icon={<ShieldAlert className="h-4 w-4" />} disabled={!canCreateFinding} />
      <ActionButton label="Xem PDF" onClick={onPreviewPdf} icon={<Eye className="h-4 w-4" />} disabled={!canExportPdf} variant="primary" />
      <ActionButton label="Tải PDF" onClick={onDownloadPdf} icon={<FileDown className="h-4 w-4" />} disabled={!canExportPdf} />
      <div className="ml-auto flex flex-wrap gap-3">
        <ActionButton
          label="Xóa lỗ hổng"
          onClick={onDeleteFinding}
          icon={<Trash2 className="h-4 w-4" />}
          disabled={!canDeleteFinding}
          variant="danger"
        />
        <ActionButton
          label="Xóa báo cáo"
          onClick={onDeleteReport}
          icon={<Trash2 className="h-4 w-4" />}
          disabled={!canDeleteReport}
          variant="danger"
        />
      </div>
    </div>
  );
}
