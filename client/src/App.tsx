import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import ActionBar from './components/ActionBar';
import RichTextEditor from './components/RichTextEditor';
import SectionEditor from './components/SectionEditor';
import WorkspaceSidebar from './components/WorkspaceSidebar';
import type { Attachment, FindingRecord, ReportRecord, ReportSummary, Severity } from './types/report';
import {
  checkHealth,
  createFinding,
  createReport,
  deleteFinding,
  deleteReport,
  fetchBackupFile,
  fetchReport,
  fetchReportPdf,
  fetchReports,
  importBackupFile,
  updateFinding,
  updateReport,
  uploadImage,
  type UpdateFindingPayload,
  type UpdateReportPayload
} from './utils/api';
import { extractCvssDisplayText, getCvssReferenceHref } from './utils/cvss';
import {
  SECTION_DEFINITIONS,
  SEVERITY_OPTIONS,
  formatDateTime,
  getSeverityChevronClass,
  getSeverityLabel,
  getSeveritySelectClass,
  slugifyFilename,
  toReportSummary
} from './utils/report';

type Tone = 'info' | 'success' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type EditorMode = 'report' | 'finding';

const SAVE_STATE_LABELS: Record<SaveState, string> = {
  idle: 'Sẵn sàng',
  saving: 'Đang lưu...',
  saved: 'Đã lưu',
  error: 'Lỗi lưu'
};

function nowIso() {
  return new Date().toISOString();
}

function backupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `vuln-report-backup-${timestamp}.json`;
}

function backendStatusClass(status: 'checking' | 'online' | 'offline') {
  switch (status) {
    case 'online':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'offline':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    default:
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }
}

function saveStateClass(state: SaveState) {
  switch (state) {
    case 'saved':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'saving':
      return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
    case 'error':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    default:
      return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  }
}

export default function App() {
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const reportTimerRef = useRef<number | null>(null);
  const findingTimerRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const pendingReportPatchRef = useRef<{ reportId: string; patch: UpdateReportPayload } | null>(null);
  const pendingFindingPatchRef = useRef<{ findingId: string; patch: UpdateFindingPayload } | null>(null);

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<EditorMode>('report');
  const [workspaceState, setWorkspaceState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ tone: Tone; message: string } | null>(null);

  const selectedFinding = report?.findings.find((item) => item.id === selectedFindingId) ?? null;
  const selectedFindingIndex = selectedFinding ? report?.findings.findIndex((item) => item.id === selectedFinding.id) ?? -1 : -1;

  useEffect(() => {
    void bootstrap();

    checkHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));

    return () => {
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }

      if (reportTimerRef.current) {
        window.clearTimeout(reportTimerRef.current);
      }

      if (findingTimerRef.current) {
        window.clearTimeout(findingTimerRef.current);
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  async function bootstrap() {
    try {
      setWorkspaceState('loading');
      const { reports: initialReports } = await fetchReports();

      if (initialReports.length === 0) {
        const created = await createReport();
        setReports([toReportSummary(created.report)]);
        setReport(created.report);
        setSelectedReportId(created.report.id);
        setSelectedFindingId(created.report.findings[0]?.id ?? null);
        setActiveEditor('report');
      } else {
        setReports(initialReports);
        await loadReport(initialReports[0].id);
        setActiveEditor('report');
      }

      setWorkspaceState('ready');
    } catch (error) {
      setWorkspaceState('error');
      showFlash(error instanceof Error ? error.message : 'Không thể khởi tạo workspace.', 'error');
    }
  }

  function showFlash(message: string, tone: Tone = 'info') {
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }

    setFlash({ message, tone });
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 3200);
  }

  function syncSummary(summary: ReportSummary | null) {
    if (!summary) {
      return;
    }

    setReports((current) => {
      const exists = current.some((item) => item.id === summary.id);

      if (!exists) {
        return [summary, ...current];
      }

      return current
        .map((item) => (item.id === summary.id ? summary : item))
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
    });
  }

  function patchCurrentReportLocally(patch: Partial<ReportRecord>) {
    setReport((current) => (current ? { ...current, ...patch } : current));
  }

  function patchFindingLocally(findingId: string, patch: Partial<FindingRecord>) {
    setReport((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        updatedAt: nowIso(),
        findings: current.findings.map((item) => (item.id === findingId ? { ...item, ...patch } : item))
      };
    });
  }

  function queueReportPatch(reportId: string, patch: UpdateReportPayload) {
    setSaveState('saving');

    const existingPatch = pendingReportPatchRef.current?.reportId === reportId ? pendingReportPatchRef.current.patch : {};
    pendingReportPatchRef.current = {
      reportId,
      patch: {
        ...existingPatch,
        ...patch
      }
    };

    if (reportTimerRef.current) {
      window.clearTimeout(reportTimerRef.current);
    }

    reportTimerRef.current = window.setTimeout(() => {
      void commitReportPatch();
    }, 650);
  }

  function queueFindingPatch(findingId: string, patch: UpdateFindingPayload) {
    setSaveState('saving');

    const existingPatch = pendingFindingPatchRef.current?.findingId === findingId ? pendingFindingPatchRef.current.patch : {};
    pendingFindingPatchRef.current = {
      findingId,
      patch: {
        ...existingPatch,
        ...patch
      }
    };

    if (findingTimerRef.current) {
      window.clearTimeout(findingTimerRef.current);
    }

    findingTimerRef.current = window.setTimeout(() => {
      void commitFindingPatch();
    }, 650);
  }

  async function commitReportPatch() {
    const pending = pendingReportPatchRef.current;

    if (!pending) {
      return;
    }

    pendingReportPatchRef.current = null;
    reportTimerRef.current = null;

    try {
      const response = await updateReport(pending.reportId, pending.patch);
      syncSummary(response.summary ?? toReportSummary(response.report));
      setReport((current) => {
        if (!current || current.id !== pending.reportId) {
          return current;
        }

        return {
          ...current,
          title: response.report.title,
          author: response.report.author,
          target: response.report.target,
          overview: response.report.overview,
          appendix: response.report.appendix,
          language: response.report.language,
          template: response.report.template,
          createdAt: response.report.createdAt,
          updatedAt: response.report.updatedAt,
          attachments: response.report.attachments
        };
      });
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      showFlash(error instanceof Error ? error.message : 'Không thể lưu báo cáo.', 'error');
    }
  }

  async function commitFindingPatch() {
    const pending = pendingFindingPatchRef.current;

    if (!pending) {
      return;
    }

    pendingFindingPatchRef.current = null;
    findingTimerRef.current = null;

    try {
      const response = await updateFinding(pending.findingId, pending.patch);
      syncSummary(response.summary);
      setReport((current) => {
        if (!current || current.id !== response.finding.reportId) {
          return current;
        }

        return {
          ...current,
          updatedAt: response.summary?.updatedAt ?? nowIso(),
          findings: current.findings.map((item) => (item.id === response.finding.id ? response.finding : item))
        };
      });
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      showFlash(error instanceof Error ? error.message : 'Không thể lưu lỗ hổng.', 'error');
    }
  }

  async function flushPendingSaves() {
    if (reportTimerRef.current) {
      window.clearTimeout(reportTimerRef.current);
      reportTimerRef.current = null;
    }

    if (findingTimerRef.current) {
      window.clearTimeout(findingTimerRef.current);
      findingTimerRef.current = null;
    }

    await commitFindingPatch();
    await commitReportPatch();
  }

  async function loadReport(reportId: string, preferredFindingId?: string | null) {
    const response = await fetchReport(reportId);
    setReport(response.report);
    setSelectedReportId(response.report.id);
    setSelectedFindingId(
      preferredFindingId && response.report.findings.some((item) => item.id === preferredFindingId)
        ? preferredFindingId
        : response.report.findings[0]?.id ?? null
    );
  }

  async function handleSelectReport(reportId: string) {
    if (busyAction) {
      return;
    }

    if (reportId === selectedReportId) {
      setActiveEditor('report');
      return;
    }

    try {
      setBusyAction('switch-report');
      await flushPendingSaves();
      await loadReport(reportId);
      setActiveEditor('report');
      setSaveState('idle');
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không chuyển được báo cáo.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSelectFinding(findingId: string) {
    if (busyAction) {
      return;
    }

    if (findingId === selectedFindingId) {
      setActiveEditor('finding');
      return;
    }

    try {
      setBusyAction('switch-finding');
      await flushPendingSaves();
      setSelectedFindingId(findingId);
      setActiveEditor('finding');
      setSaveState('idle');
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không chuyển được lỗ hổng.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateReport() {
    try {
      setBusyAction('create-report');
      await flushPendingSaves();
      const response = await createReport();
      const summary = toReportSummary(response.report);
      setReports((current) => [summary, ...current]);
      setReport(response.report);
      setSelectedReportId(response.report.id);
      setSelectedFindingId(response.report.findings[0]?.id ?? null);
      setActiveEditor('report');
      setSaveState('saved');
      showFlash('Đã tạo báo cáo mới.', 'success');
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không tạo được báo cáo.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteReport() {
    if (!report) {
      return;
    }

    const shouldDelete = window.confirm(`Xóa báo cáo "${report.title}"?`);

    if (!shouldDelete) {
      return;
    }

    try {
      setBusyAction('delete-report');
      pendingReportPatchRef.current = null;
      pendingFindingPatchRef.current = null;
      await deleteReport(report.id);

      const remaining = reports.filter((item) => item.id !== report.id);
      setReports(remaining);

      if (remaining.length === 0) {
        const created = await createReport();
        setReports([toReportSummary(created.report)]);
        setReport(created.report);
        setSelectedReportId(created.report.id);
        setSelectedFindingId(created.report.findings[0]?.id ?? null);
      } else {
        await loadReport(remaining[0].id);
      }

      setActiveEditor('report');
      setSaveState('saved');
      showFlash('Đã xóa báo cáo.', 'success');
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không xóa được báo cáo.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateFinding() {
    if (!report) {
      return;
    }

    try {
      setBusyAction('create-finding');
      await flushPendingSaves();
      const response = await createFinding(report.id);
      syncSummary(response.summary);
      setReport((current) =>
        current
          ? {
              ...current,
              updatedAt: response.summary?.updatedAt ?? nowIso(),
              findings: [...current.findings, response.finding]
            }
          : current
      );
      setSelectedFindingId(response.finding.id);
      setActiveEditor('finding');
      setSaveState('saved');
      showFlash('Đã thêm lỗ hổng mới.', 'success');
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không tạo được lỗ hổng.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteFinding() {
    if (!selectedFinding || !report) {
      return;
    }

    const shouldDelete = window.confirm(`Xóa lỗ hổng "${selectedFinding.name}"?`);

    if (!shouldDelete) {
      return;
    }

    try {
      setBusyAction('delete-finding');
      const nextFindingId = report.findings.filter((item) => item.id !== selectedFinding.id)[0]?.id ?? null;

      if (pendingFindingPatchRef.current?.findingId === selectedFinding.id) {
        pendingFindingPatchRef.current = null;
      }

      const response = await deleteFinding(selectedFinding.id);
      syncSummary(response.summary);
      setSelectedFindingId(nextFindingId);
      setActiveEditor(nextFindingId ? 'finding' : 'report');
      setReport((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          updatedAt: response.summary?.updatedAt ?? nowIso(),
          findings: current.findings.filter((item) => item.id !== selectedFinding.id)
        };
      });
      setSaveState('saved');
      showFlash('Đã xóa lỗ hổng.', 'success');
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không xóa được lỗ hổng.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePreviewPdf() {
    if (!report) {
      return;
    }

    const previewWindow = window.open('', '_blank');

    try {
      setBusyAction('preview-pdf');
      await flushPendingSaves();
      const blob = await fetchReportPdf(report.id, 'inline');
      const objectUrl = URL.createObjectURL(blob);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = objectUrl;

      if (previewWindow) {
        previewWindow.location.href = objectUrl;
      } else {
        window.location.assign(objectUrl);
      }
    } catch (error) {
      previewWindow?.close();
      showFlash(error instanceof Error ? error.message : 'Không thể mở PDF.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownloadPdf() {
    if (!report) {
      return;
    }

    try {
      setBusyAction('download-pdf');
      await flushPendingSaves();
      const blob = await fetchReportPdf(report.id, 'attachment');
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${slugifyFilename(report.title, report.id)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không thể tải PDF.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExportBackup() {
    try {
      setBusyAction('export-backup');
      await flushPendingSaves();
      const blob = await fetchBackupFile();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = backupFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      showFlash('Đã tạo file sao lưu dữ liệu.', 'success');
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không tạo được file sao lưu.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  function handleImportBackupClick() {
    if (busyAction) {
      return;
    }

    backupInputRef.current?.click();
  }

  async function handleImportBackup(file: File) {
    const shouldRestore = window.confirm('Khôi phục backup sẽ thay thế toàn bộ dữ liệu hiện tại, bao gồm cả ảnh upload. Tiếp tục?');

    if (!shouldRestore) {
      return;
    }

    try {
      setBusyAction('import-backup');
      await flushPendingSaves();
      const response = await importBackupFile(file);
      const { reports: restoredReports } = await fetchReports();

      if (restoredReports.length === 0) {
        const created = await createReport();
        setReports([toReportSummary(created.report)]);
        setReport(created.report);
        setSelectedReportId(created.report.id);
        setSelectedFindingId(created.report.findings[0]?.id ?? null);
      } else {
        setReports(restoredReports);
        await loadReport(restoredReports[0].id);
      }

      setActiveEditor('report');
      setSaveState('saved');
      showFlash(
        `Đã khôi phục ${response.counts.reports} báo cáo, ${response.counts.findings} lỗ hổng và ${response.counts.attachments} tệp đính kèm.`,
        'success'
      );
    } catch (error) {
      showFlash(error instanceof Error ? error.message : 'Không khôi phục được file backup.', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  function handleBackupFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    void handleImportBackup(file);
  }

  async function handleImageUpload(file: File, findingId?: string | null): Promise<Attachment> {
    if (!report) {
      throw new Error('Chưa có báo cáo đang chọn.');
    }

    const response = await uploadImage(file, report.id, findingId ?? null);
    setReport((current) =>
      current
        ? {
            ...current,
            updatedAt: nowIso(),
            attachments: [response.attachment, ...current.attachments.filter((item) => item.id !== response.attachment.id)]
          }
        : current
    );

    setReports((current) =>
      current.map((item) => (item.id === report.id ? { ...item, updatedAt: nowIso() } : item)).sort((left, right) => {
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      })
    );

    return response.attachment;
  }

  function updateReportField<K extends keyof Pick<ReportRecord, 'title' | 'author' | 'target'>>(key: K, value: ReportRecord[K]) {
    if (!report) {
      return;
    }

    patchCurrentReportLocally({
      [key]: value,
      updatedAt: nowIso()
    });
    queueReportPatch(report.id, {
      [key]: value
    });
  }

  function updateOverview(value: string) {
    if (!report) {
      return;
    }

    patchCurrentReportLocally({
      overview: value,
      updatedAt: nowIso()
    });
    queueReportPatch(report.id, {
      overview: value
    });
  }

  function updateAppendix(value: string) {
    if (!report) {
      return;
    }

    patchCurrentReportLocally({
      appendix: value,
      updatedAt: nowIso()
    });
    queueReportPatch(report.id, {
      appendix: value
    });
  }

  function updateFindingField<
    K extends keyof Pick<
      FindingRecord,
      'name' | 'severity' | 'description' | 'impact' | 'reproduction' | 'location' | 'remediation' | 'cvssScore' | 'cvssRef' | 'references'
    >
  >(key: K, value: FindingRecord[K]) {
    if (!selectedFinding) {
      return;
    }

    patchFindingLocally(selectedFinding.id, {
      [key]: value,
      updatedAt: nowIso()
    });
    queueFindingPatch(selectedFinding.id, {
      [key]: value
    });
  }

  const backendStatusLabel =
    backendStatus === 'online' ? 'Máy chủ đang hoạt động' : backendStatus === 'offline' ? 'Máy chủ ngoại tuyến' : 'Đang kiểm tra máy chủ';

  if (workspaceState === 'loading' && !report) {
    return (
      <div className="min-h-screen bg-mist text-slate-900">
        <div className="background-grid" />
        <main className="relative mx-auto flex min-h-screen max-w-[1600px] items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="panel-card flex items-center gap-3 text-slate-600">
            <LoaderCircle className="h-5 w-5 animate-spin text-sky-700" />
            Đang tải workspace báo cáo...
          </div>
        </main>
      </div>
    );
  }

  const contextBadgeLabel =
    activeEditor === 'report'
      ? 'Đang sửa báo cáo'
      : selectedFindingIndex >= 0
        ? `Lỗ hổng ${selectedFindingIndex + 1}`
        : 'Lỗ hổng';

  return (
    <div className="min-h-screen bg-mist text-slate-900">
      <div className="background-grid" />
      <main className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <ActionBar
          onCreateReport={handleCreateReport}
          onDeleteReport={handleDeleteReport}
          onCreateFinding={handleCreateFinding}
          onDeleteFinding={handleDeleteFinding}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackupClick}
          onPreviewPdf={handlePreviewPdf}
          onDownloadPdf={handleDownloadPdf}
          canBackup={workspaceState === 'ready' && busyAction === null}
          canCreateFinding={Boolean(report) && busyAction === null}
          canDeleteReport={Boolean(report) && busyAction === null}
          canDeleteFinding={Boolean(selectedFinding) && activeEditor === 'finding' && busyAction === null}
          canExportPdf={Boolean(report) && busyAction === null}
        />
        <input ref={backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleBackupFileChange} />

        <section className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside>
            <WorkspaceSidebar
              reports={reports}
              selectedReportId={selectedReportId}
              selectedFindingId={selectedFindingId}
              activeEditor={activeEditor}
              findings={report?.findings ?? []}
              onSelectReport={(reportId) => {
                void handleSelectReport(reportId);
              }}
              onSelectFinding={(findingId) => {
                void handleSelectFinding(findingId);
              }}
            />
          </aside>

          <div className="space-y-6">
            <section className="panel-card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0 space-y-1">
                <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{contextBadgeLabel}</div>
                <p className="text-sm text-slate-500">{activeEditor === 'report' ? 'Đang sửa báo cáo.' : 'Đang sửa lỗ hổng đã chọn.'}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className={`inline-flex rounded-full px-3 py-2 text-xs font-semibold ${backendStatusClass(backendStatus)}`}>
                  {backendStatusLabel}
                </div>
                <div className={`inline-flex rounded-full px-3 py-2 text-xs font-semibold ${saveStateClass(saveState)}`}>
                  {SAVE_STATE_LABELS[saveState]}
                </div>
              </div>
            </section>

            {activeEditor === 'report' ? (
              <>
                <section className="panel-card">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-slate-900">Thông tin báo cáo</h2>
                    <p className="text-sm leading-6 text-slate-500">Sửa tên báo cáo và thông tin chung.</p>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <label className="grid gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Tiêu đề báo cáo</span>
                      <input
                        value={report?.title ?? ''}
                        onChange={(event) => updateReportField('title', event.target.value)}
                        className="input-shell"
                        placeholder="Báo cáo đánh giá lỗ hổng"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Người viết</span>
                      <input
                        value={report?.author ?? ''}
                        onChange={(event) => updateReportField('author', event.target.value)}
                        className="input-shell"
                        placeholder="Toàn PT"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600 md:col-span-2">
                      <span className="font-medium text-slate-700">Mục tiêu</span>
                      <input
                        value={report?.target ?? ''}
                        onChange={(event) => updateReportField('target', event.target.value)}
                        className="input-shell"
                        placeholder="example.com"
                      />
                    </label>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Tạo lúc</div>
                      <div className="mt-1 text-sm font-medium text-slate-700">{report ? formatDateTime(report.createdAt) : '-'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Lần cập nhật</div>
                      <div className="mt-1 text-sm font-medium text-slate-700">{report ? formatDateTime(report.updatedAt) : '-'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Số lỗ hổng</div>
                      <div className="mt-1 text-sm font-medium text-slate-700">{report?.findings.length ?? 0}</div>
                    </div>
                  </div>
                </section>

                <section className="panel-card">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">Mô tả chung</h2>
                    <p className="text-sm leading-6 text-slate-500">Tóm tắt phạm vi và bối cảnh.</p>
                  </div>
                  <div className="mt-5">
                    <RichTextEditor
                      value={report?.overview ?? '<p></p>'}
                      placeholder="Tóm tắt phạm vi, cách tiếp cận và bối cảnh đánh giá."
                      onChange={updateOverview}
                      onImageUpload={(file) => handleImageUpload(file, null)}
                      onEditorMessage={showFlash}
                    />
                  </div>
                </section>
                <section className="panel-card">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">Phụ lục</h2>
                    <p className="text-sm leading-6 text-slate-500">Bằng chứng và nội dung bổ sung.</p>
                  </div>
                  <div className="mt-5">
                    <RichTextEditor
                      value={report?.appendix ?? '<p></p>'}
                      placeholder="Bổ sung phụ lục, bằng chứng hoặc nội dung tham khảo cuối báo cáo."
                      onChange={updateAppendix}
                      onImageUpload={(file) => handleImageUpload(file, null)}
                      onEditorMessage={showFlash}
                    />
                  </div>
                </section>
              </>
            ) : (
              <section className="panel-card">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-slate-900">Chi tiết lỗ hổng</h2>
                  <p className="text-sm leading-6 text-slate-500">Sửa nội dung của lỗ hổng đang chọn.</p>
                </div>

                {selectedFinding ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">Tên lỗ hổng</span>
                        <input
                          value={selectedFinding.name}
                          onChange={(event) => updateFindingField('name', event.target.value)}
                          className="input-shell"
                          placeholder="SQL Injection trong tham số search"
                        />
                      </label>

                      <div className="grid gap-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">Mức độ</span>
                        <div className="relative">
                          <select
                            value={selectedFinding.severity}
                            onChange={(event) => updateFindingField('severity', event.target.value as Severity)}
                            className={`select-shell ${getSeveritySelectClass(selectedFinding.severity)}`}
                          >
                            {SEVERITY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {getSeverityLabel(option)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className={`select-chevron ${getSeverityChevronClass(selectedFinding.severity)}`} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">Điểm CVSS</span>
                        <input
                          value={selectedFinding.cvssScore}
                          onChange={(event) => updateFindingField('cvssScore', event.target.value)}
                          className="input-shell"
                          inputMode="decimal"
                          placeholder="9.8"
                        />
                      </label>

                      <div className="grid gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">CVSS / Link tham chiếu</span>
                      <input
                        value={selectedFinding.cvssRef}
                        onChange={(event) => updateFindingField('cvssRef', event.target.value)}
                        className="input-shell"
                        placeholder="Dán vector CVSS hoặc link calculator từ first.org"
                      />
                      {selectedFinding.cvssScore || selectedFinding.cvssRef ? (
                        (() => {
                          const displayText = extractCvssDisplayText(selectedFinding.cvssRef);
                          const href = getCvssReferenceHref(selectedFinding.cvssRef);

                          return (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-600">
                              {selectedFinding.cvssScore ? <span>Điểm CVSS: {selectedFinding.cvssScore}</span> : null}
                              {displayText ? (
                                href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4"
                                  >
                                    {displayText}
                                  </a>
                                ) : (
                                  <span>{displayText}</span>
                                )
                              ) : null}
                            </div>
                          );
                        })()
                      ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Báo cáo</div>
                        <div className="mt-1 text-sm font-medium text-slate-700">{report?.title ?? '-'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Thứ tự</div>
                        <div className="mt-1 text-sm font-medium text-slate-700">
                          {selectedFindingIndex >= 0 ? `Lỗ hổng ${selectedFindingIndex + 1}` : '-'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Lần cập nhật</div>
                        <div className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(selectedFinding.updatedAt)}</div>
                      </div>
                    </div>

                    {SECTION_DEFINITIONS.map((section) => (
                      <SectionEditor
                        key={section.key}
                        label={section.label}
                        helper={section.helper}
                        placeholder={section.placeholder}
                        value={selectedFinding[section.key]}
                        onChange={(nextValue) => updateFindingField(section.key, nextValue)}
                        onImageUpload={(file) => handleImageUpload(file, selectedFinding.id)}
                        onEditorMessage={showFlash}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-500">
                    Chưa có lỗ hổng.
                  </div>
                )}
              </section>
            )}
          </div>
        </section>
      </main>

      {flash ? (
        <div
          className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium shadow-soft ${
            flash.tone === 'success'
              ? 'bg-emerald-600 text-white'
              : flash.tone === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-900 text-white'
          }`}
        >
          {flash.message}
        </div>
      ) : null}
    </div>
  );
}

