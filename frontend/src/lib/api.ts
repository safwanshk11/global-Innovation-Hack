import type { IssueCategory, IssueStatus, IssueList, IssueDetail } from "../types/issue";
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
  processing_status: "not_queued" | "pending" | "transcribing" | "extracting" | "matching" | "retry_wait" | "complete" | "needs_review" | "failed";
  processing_updated_at: string;
  issue_id: string | null;
  match_outcome: "created" | "merged" | null;
  error_code: string | null;
  review_reasons: string[];
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

async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("Connection interrupted. Please check again.");
  }
  if (!response.ok) throw new ApiError(response.status === 404 ? "Not found" : "Unable to refresh data. Please try again.", response.status);
  return response.json();
}

export function getReport(reportId: string, signal?: AbortSignal): Promise<ReportReceipt> {
  return read(`/api/reports/${encodeURIComponent(reportId)}`, signal);
}
export function getIssues(category: IssueCategory | "all", status: IssueStatus | "all", signal?: AbortSignal): Promise<IssueList> {
  const params = new URLSearchParams({ limit: "500" });
  if (category !== "all") params.set("category", category);
  if (status !== "all") params.set("status", status);
  return read(`/api/issues?${params}`, signal);
}
export function getIssue(id: string, signal?: AbortSignal): Promise<IssueDetail> {
  return read(`/api/issues/${encodeURIComponent(id)}`, signal);
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
