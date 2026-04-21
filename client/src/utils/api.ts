import type {
  FindingResponse,
  ReportListResponse,
  ReportMutationResponse,
  ReportResponse,
  Severity,
  UploadResponse
} from '../types/report';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export interface UpdateReportPayload {
  title?: string;
  author?: string;
  target?: string;
  overview?: string;
}

export interface UpdateFindingPayload {
  name?: string;
  severity?: Severity;
  description?: string;
  impact?: string;
  reproduction?: string;
  location?: string;
  remediation?: string;
  references?: string;
}

function resolveApiPath(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function readErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);

    if (typeof payload?.message === 'string') {
      return payload.message;
    }

    if (Array.isArray(payload?.errors) && typeof payload.errors[0] === 'string') {
      return payload.errors[0];
    }
  }

  const message = await response.text();
  return message || fallback;
}

async function readJson<T>(response: Response, fallback: string) {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }

  return (await response.json()) as T;
}

export function resolveAssetUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return resolveApiPath(path);
}

export async function fetchReportPdf(reportId: string, disposition: 'inline' | 'attachment' = 'attachment') {
  const response = await fetch(resolveApiPath(`/api/reports/${reportId}/pdf?disposition=${disposition}`));

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Không tạo được PDF.'));
  }

  return response.blob();
}

export async function checkHealth() {
  const response = await fetch(resolveApiPath('/api/health'));

  if (!response.ok) {
    throw new Error('Máy chủ không phản hồi.');
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function fetchReports() {
  const response = await fetch(resolveApiPath('/api/reports'));
  return readJson<ReportListResponse>(response, 'Không tải được danh sách báo cáo.');
}

export async function fetchReport(reportId: string) {
  const response = await fetch(resolveApiPath(`/api/reports/${reportId}`));
  return readJson<ReportResponse>(response, 'Không tải được báo cáo.');
}

export async function createReport() {
  const response = await fetch(resolveApiPath('/api/reports'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  return readJson<ReportResponse>(response, 'Không tạo được báo cáo mới.');
}

export async function updateReport(reportId: string, payload: UpdateReportPayload) {
  const response = await fetch(resolveApiPath(`/api/reports/${reportId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return readJson<ReportMutationResponse>(response, 'Không lưu được báo cáo.');
}

export async function deleteReport(reportId: string) {
  const response = await fetch(resolveApiPath(`/api/reports/${reportId}`), {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Không xóa được báo cáo.'));
  }
}

export async function createFinding(reportId: string) {
  const response = await fetch(resolveApiPath(`/api/reports/${reportId}/findings`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  return readJson<FindingResponse>(response, 'Không tạo được lỗ hổng mới.');
}

export async function updateFinding(findingId: string, payload: UpdateFindingPayload) {
  const response = await fetch(resolveApiPath(`/api/findings/${findingId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return readJson<FindingResponse>(response, 'Không lưu được lỗ hổng.');
}

export async function deleteFinding(findingId: string) {
  const response = await fetch(resolveApiPath(`/api/findings/${findingId}`), {
    method: 'DELETE'
  });

  return readJson<{ success: true; reportId: string; summary: ReportMutationResponse['summary'] }>(
    response,
    'Không xóa được lỗ hổng.'
  );
}

export async function uploadImage(file: File, reportId: string, findingId?: string | null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('reportId', reportId);

  if (findingId) {
    formData.append('findingId', findingId);
  }

  const response = await fetch(resolveApiPath('/api/upload'), {
    method: 'POST',
    body: formData
  });

  return readJson<UploadResponse>(response, 'Tải ảnh lên thất bại.');
}
