import type { ReportDraft } from "../types/report";

// In-memory only, deliberately not router state: Blob/File payloads (up to
// ~15 MB combined) can exceed the browser's history.pushState size limit.
// A full page reload loses an in-progress draft before it's submitted.
let currentDraft: ReportDraft | null = null;

export function setReportDraft(draft: ReportDraft): void {
  currentDraft = draft;
}

export function getReportDraft(): ReportDraft | null {
  return currentDraft;
}

export function clearReportDraft(): void {
  currentDraft = null;
}
