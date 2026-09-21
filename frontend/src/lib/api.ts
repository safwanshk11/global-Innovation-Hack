import type { ReportDraft } from "../types/report";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface HealthResponse {
  status: string;
}

export interface SubmitReportResponse {
  report_id: string;
  status: string;
}

export interface ReportReceipt {
  report_id: string;
  status: string;
  created_at: string;
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/api/health`);
  if (!response.ok) {
    throw new ApiError(`Health check failed with status ${response.status}`, response.status);
  }
  return response.json();
}

export async function submitReport(draft: ReportDraft): Promise<SubmitReportResponse> {
  const formData = new FormData();
  formData.append(
    "audio",
    draft.audio.blob,
    draft.audio.fileName ?? `voice-note.${extensionFor(draft.audio.blob.type)}`,
  );
  formData.append("photo", draft.photo.file);
  formData.append("latitude", String(draft.location.lat));
  formData.append("longitude", String(draft.location.lng));
  formData.append("location_source", draft.location.source);
  formData.append("submission_id", draft.submissionId);

  const response = await fetch(`${API_URL}/api/reports`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(
      (await safeErrorDetail(response)) ?? `Report submission failed with status ${response.status}`,
      response.status,
    );
  }

  return response.json();
}

export async function getReport(reportId: string): Promise<ReportReceipt> {
  const response = await fetch(`${API_URL}/api/reports/${reportId}`);
  if (!response.ok) {
    throw new ApiError(
      (await safeErrorDetail(response)) ?? `Report lookup failed with status ${response.status}`,
      response.status,
    );
  }
  return response.json();
}

async function safeErrorDetail(response: Response): Promise<string | null> {
  try {
    const data = await response.json();
    return typeof data?.detail === "string" ? data.detail : null;
  } catch {
    return null;
  }
}

function extensionFor(mimeType: string): string {
  return mimeType.split(";")[0].split("/")[1] || "webm";
}
