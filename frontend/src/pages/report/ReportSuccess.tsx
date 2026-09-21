import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Loader2, Home, Mic } from "lucide-react";
import { getReport, ApiError, type ReportReceipt } from "../../lib/api";

type FetchState = "loading" | "found" | "not-found" | "error";

export function ReportSuccess() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<FetchState>("loading");
  const [receipt, setReceipt] = useState<ReportReceipt | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState("loading");

    getReport(id)
      .then((result) => {
        if (cancelled) return;
        setReceipt(result);
        setState("found");
      })
      .catch((err) => {
        if (cancelled) return;
        setState(err instanceof ApiError && err.status === 404 ? "not-found" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [id, retryKey]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sky-50 px-4 text-center">
      {state === "loading" && (
        <>
          <Loader2 className="animate-spin text-sky-600" size={40} aria-hidden="true" />
          <p className="text-sm text-slate-600">Looking up your report…</p>
        </>
      )}

      {state === "found" && receipt && (
        <>
          <CheckCircle2 className="text-emerald-500" size={48} aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Report received</h1>
            <p className="mt-2 text-sm text-slate-600">
              Your report ID is{" "}
              <code className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-800">{receipt.report_id}</code>
            </p>
          </div>
        </>
      )}

      {state === "not-found" && (
        <>
          <AlertTriangle className="text-amber-500" size={40} aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700">We couldn't find that report.</p>
        </>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="text-red-500" size={40} aria-hidden="true" />
          <p className="text-sm text-red-700">Couldn't reach the server. Try again.</p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          to="/report"
          className="flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          <Mic size={16} aria-hidden="true" />
          File another report
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Home size={16} aria-hidden="true" />
          Home
        </Link>
      </div>
    </div>
  );
}
