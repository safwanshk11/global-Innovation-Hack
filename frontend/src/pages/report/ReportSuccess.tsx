import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Loader2, Home, Mic, FileText, Check } from "lucide-react";
import { getReport, ApiError, type ReportReceipt } from "../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";

type FetchState = "loading" | "found" | "not-found" | "error";

export function ReportSuccess() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<FetchState>("loading");
  const [receipt, setReceipt] = useState<ReportReceipt | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  function handleCopy() {
    if (!receipt?.report_id) return;
    navigator.clipboard
      .writeText(receipt.report_id)
      .then(() => {
        setCopied(true);
        if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-offwhite px-4 py-12 text-center selection:bg-teal-500 selection:text-white">

      <div className="absolute top-8 w-full flex justify-center">
        <BrandLogo variant="light" className="scale-90 origin-left" />
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-8">

        {state === "loading" && (
          <div className="animate-scale-in flex flex-col items-center gap-6 bg-white p-10 rounded-2xl shadow-sm border border-slate-200 w-full">
            <Loader2 className="animate-spin text-teal-500" size={48} aria-hidden="true" />
            <p className="text-lg font-medium text-navy-950">Retrieving digital receipt…</p>
          </div>
        )}

        {state === "found" && receipt && (
          <div className="animate-scale-in flex flex-col items-center gap-6 bg-white p-8 md:p-10 rounded-2xl shadow-md border border-slate-200 w-full relative overflow-hidden">
            {/* Receipt top pattern */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400"></div>

            <div
              className="animate-scale-in flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 border border-teal-100 text-teal-600 shadow-sm mt-2"
              style={{ animationDelay: "150ms" }}
            >
              <CheckCircle2 size={40} aria-hidden="true" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-navy-950 tracking-tight">Report Received</h1>
              <p className="mt-3 text-base text-slate-600 leading-relaxed">
                Your civic issue has been officially logged. Save this receipt ID to check on it later.
              </p>
            </div>

            <div className="w-full rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-center gap-1.5">
                <FileText size={14} /> Receipt ID
              </div>
              <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <code className="pl-3 text-lg font-mono font-bold text-navy-950 tracking-tight truncate">{receipt.report_id}</code>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                    copied ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={14} className="animate-scale-in" aria-hidden="true" />
                      Copied!
                    </>
                  ) : (
                    "Copy"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {state === "not-found" && (
          <div className="animate-scale-in flex flex-col items-center gap-6 bg-white p-10 rounded-2xl shadow-sm border border-slate-200 w-full">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 border border-amber-100 text-amber-600">
              <AlertTriangle size={40} aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-navy-950">Report not found</h1>
            <p className="text-slate-600">We couldn't locate a report with that ID.</p>
          </div>
        )}

        {state === "error" && (
          <div className="animate-scale-in flex flex-col items-center gap-6 bg-white p-10 rounded-2xl shadow-sm border border-slate-200 w-full">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-100 text-red-600">
              <AlertTriangle size={40} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-950 mb-2">Connection Error</h1>
              <p className="text-slate-600">Couldn't reach the server to fetch your receipt.</p>
            </div>
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="btn-primary rounded-full px-8 py-3.5 text-base"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link
            to="/report"
            className="btn-primary group flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-base focus-visible:-translate-y-0.5"
          >
            <Mic size={18} aria-hidden="true" className="text-teal-400 group-hover:scale-110 transition-transform" />
            File another
          </Link>
          <Link
            to="/"
            className="btn-outline group flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-base focus-visible:-translate-y-0.5"
          >
            <Home size={18} aria-hidden="true" className="group-hover:scale-110 transition-transform" />
            Home
          </Link>
        </div>

      </div>
    </div>
  );
}
