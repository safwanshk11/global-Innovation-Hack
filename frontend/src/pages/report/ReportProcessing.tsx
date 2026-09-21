import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { getReportDraft, clearReportDraft } from "../../lib/reportDraftStore";
import { submitReport, ApiError } from "../../lib/api";

const PROCESSING_STEPS = ["Transcribing voice note…", "Analyzing details…"];

type Stage = "uploading" | "error" | "processing-steps";

export function ReportProcessing() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("uploading");
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const reportIdRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);

  const draft = getReportDraft();

  useEffect(() => {
    if (!draft) {
      navigate("/report", { replace: true });
    }
    // Only need to check once on mount; a null draft means a direct nav
    // or refresh with nothing to submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSubmission() {
    if (!draft) return;
    setStage("uploading");
    try {
      const result = await submitReport(draft);
      reportIdRef.current = result.report_id;
      setStage("processing-steps");
      setStepIndex(0);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : null);
      setStage("error");
    }
  }

  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invocation of mount
    // effects (mount -> cleanup -> mount again on the same instance). This
    // effect has no cleanup, and runSubmission() is a non-idempotent network
    // call, so without this ref the second synthetic invocation would fire
    // a second real POST /api/reports. The ref persists across that
    // synthetic remount (it's not a real unmount), so it isn't reset by it.
    if (!draft || hasStartedRef.current) return;
    hasStartedRef.current = true;
    runSubmission();
    // Run once on mount; retry is triggered manually via runSubmission().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== "processing-steps") return;

    if (stepIndex >= PROCESSING_STEPS.length) {
      const reportId = reportIdRef.current;
      const timeout = window.setTimeout(() => {
        clearReportDraft();
        navigate(`/report/success/${reportId}`, { replace: true });
      }, 500);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => setStepIndex((i) => i + 1), 900);
    return () => window.clearTimeout(timeout);
  }, [stage, stepIndex, navigate]);

  if (!draft) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sky-50 px-4 text-center">
      {stage === "uploading" && (
        <>
          <Loader2 className="animate-spin text-sky-600" size={40} aria-hidden="true" />
          <p className="text-sm text-slate-700">Uploading your report…</p>
        </>
      )}

      {stage === "error" && (
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="text-red-500" size={40} aria-hidden="true" />
          <p className="text-sm text-red-700">
            {errorMessage ?? "Something went wrong submitting your report."} Nothing was lost —
            you can try again.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={runSubmission}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate("/report")}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit report
            </button>
          </div>
        </div>
      )}

      {stage === "processing-steps" && (
        <>
          <Loader2 className="animate-spin text-sky-600" size={40} aria-hidden="true" />
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={16} aria-hidden="true" />
              Report uploaded
            </li>
            {PROCESSING_STEPS.map((step, i) => (
              <li
                key={step}
                className={`flex items-center gap-2 ${
                  i < stepIndex ? "text-emerald-600" : i === stepIndex ? "text-slate-800" : "text-slate-300"
                }`}
              >
                {i < stepIndex ? <CheckCircle2 size={16} aria-hidden="true" /> : <span className="w-4" />}
                {step}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
