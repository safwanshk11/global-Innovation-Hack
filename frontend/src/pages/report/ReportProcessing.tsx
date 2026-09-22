import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { getReportDraft, clearReportDraft } from "../../lib/reportDraftStore";
import { submitReport, ApiError } from "../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";

const PROCESSING_STEPS = ["Processing media…", "Saving report…"];

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

  const progressPercent =
    stage === "uploading"
      ? 15
      : stage === "processing-steps"
        ? 40 + Math.round((stepIndex / PROCESSING_STEPS.length) * 60)
        : 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-offwhite px-4 text-center selection:bg-teal-500 selection:text-white">

      <div className="absolute top-8 w-full flex justify-center">
        <BrandLogo variant="light" className="scale-90 origin-left" />
      </div>

      <div className="animate-scale-in relative w-full max-w-md flex flex-col items-center gap-8 overflow-hidden bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        {stage !== "error" && (
          <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        {stage === "uploading" && (
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="animate-spin text-teal-500" size={48} aria-hidden="true" />
            <p className="text-lg font-medium text-navy-950">Uploading your report…</p>
          </div>
        )}

        {stage === "error" && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-100 text-red-600 shadow-sm">
              <AlertTriangle size={40} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-950 mb-2">Submission failed</h1>
              <p className="text-base text-slate-600">
                {errorMessage ?? "Something went wrong submitting your report."} Nothing was lost — you can try again.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row mt-2">
              <button
                type="button"
                onClick={runSubmission}
                className="btn-primary flex flex-1 items-center justify-center rounded-full px-6 py-3.5 text-base focus-visible:-translate-y-0.5"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => navigate("/report")}
                className="btn-outline flex flex-1 items-center justify-center rounded-full px-6 py-3.5 text-base focus-visible:-translate-y-0.5"
              >
                Edit report
              </button>
            </div>
          </div>
        )}

        {stage === "processing-steps" && (
          <div className="flex flex-col items-center w-full gap-8">
            <Loader2 className="animate-spin text-teal-500" size={48} aria-hidden="true" />
            <ul className="space-y-4 text-base text-left w-full max-w-xs">
              <li className="flex items-center gap-3 text-teal-600 font-bold bg-teal-50 p-3 rounded-xl border border-teal-100">
                <CheckCircle2 size={20} aria-hidden="true" />
                Report uploaded
              </li>
              {PROCESSING_STEPS.map((step, i) => (
                <li
                  key={step}
                  className={`flex items-center gap-3 font-medium transition-all duration-300 p-3 rounded-xl ${
                    i < stepIndex
                      ? "text-teal-600 bg-teal-50 border border-teal-100"
                      : i === stepIndex
                        ? "text-navy-950 bg-slate-50 border border-slate-200 shadow-sm"
                        : "text-slate-400 border border-transparent"
                  }`}
                >
                  {i < stepIndex ? <CheckCircle2 size={20} className="animate-scale-in" aria-hidden="true" /> : <span className="w-5" />}
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
