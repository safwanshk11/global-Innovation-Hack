import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getReport, type ReportReceipt } from "../../lib/api";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { BrandLogo } from "../../components/BrandLogo";

const messages: Record<ReportReceipt["processing_status"], [string, string]> = {
  pending: ["Waiting for analysis", "Your report is saved and waiting to be processed."],
  transcribing: ["Listening to your report", "Your saved voice note is being transcribed."],
  extracting: ["Understanding the issue", "The reported details are being checked."],
  matching: ["Checking related issues", "Your report is being compared with nearby issues."],
  retry_wait: ["Processing will retry", "A temporary interruption occurred. Your report remains saved."],
  complete: ["Analysis complete", "Your report has been linked to the issue below. This does not mean the issue has been resolved."],
  needs_review: ["Review needed", "Your report is saved, but needs review before automatic processing can finish. You don't need to upload again."],
  failed: ["Analysis couldn't finish", "Your report and uploads are saved. An operator can retry processing; you don't need to upload again."],
  not_queued: ["Report saved", "This earlier report is not queued for automatic analysis."],
};
const reasons: Record<string, string> = {
  approximate_location: "The location is approximate.", unclear_speech: "The voice note wasn't clear enough.",
  insufficient_detail: "More detail needs review.", multiple_issues: "More than one issue was described.",
  uncertain_category: "The issue category needs review.", invalid_extraction: "The extracted details could not be validated.",
};
const terminal = (r: ReportReceipt) => ["complete", "needs_review", "failed", "not_queued"].includes(r.processing_status);
export function ReportSuccess() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { data: receipt, error, loading, paused, refresh } = useLiveQuery(id, signal => getReport(id, signal), { interval: 2000, maxWait: 90000, terminal });
  const [copyMessage, setCopyMessage] = useState("");
  const saved = Boolean(receipt || location.state?.saved);
  const message = receipt ? messages[receipt.processing_status] : null;
  async function copy() {
    try { await navigator.clipboard.writeText(id); setCopyMessage("Receipt ID copied."); }
    catch { setCopyMessage("Copy unavailable. Select and copy the ID below."); }
  }
  return <div className="min-h-screen bg-offwhite px-4 py-10 flex flex-col items-center justify-center gap-8 text-center">
    <BrandLogo variant="light" />
    <main className="glass-panel-light w-full max-w-lg rounded-2xl p-6 sm:p-10 space-y-6">
      <CheckCircle2 className="mx-auto text-teal-600" size={44} />
      <h1 className="text-3xl font-bold text-navy-950">{saved ? "Report received" : error?.status === 404 ? "Report not found" : "Your report receipt"}</h1>
      <p className="text-slate-600">{saved ? "Your upload is saved. Keep this receipt ID to check its status later." : "Keep this ID while we check the saved report."}</p>
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-xs uppercase font-bold text-slate-500">Receipt ID</p>
        <code className="block break-all select-all text-sm text-navy-950">{id}</code>
        <button onClick={copy} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-navy-950">Copy ID</button>
        <p role="status" className="text-sm text-teal-600">{copyMessage}</p>
      </div>
      <section aria-live="polite" className="space-y-3 text-slate-600">
        {loading && !receipt && <p><Loader2 className="inline animate-spin mr-2" size={18} />Checking saved report status…</p>}
        {message && <><h2 className="text-xl font-bold text-navy-950">{message[0]}</h2><p>{message[1]}</p></>}
        {receipt?.review_reasons.map(reason => <p key={reason} className="text-sm">{reasons[reason] ?? "An operator needs to review this report."}</p>)}
        {receipt?.issue_id && <Link className="btn-primary inline-flex rounded-full px-6 py-3" to={`/dashboard/issues/${receipt.issue_id}`}>View linked issue</Link>}
        {error && <p role="alert" className="text-amber-700">{error.status === 404 ? "No report was found for this ID. Check the receipt link." : "Connection interrupted. The latest status is unavailable; keep your receipt ID."}</p>}
        {paused && <p>Automatic checking has paused. Your report remains saved; processing may continue in the background.</p>}
        {receipt && <p className="text-xs">Status updated {new Date(receipt.processing_updated_at).toLocaleString()}</p>}
      </section>
      <button onClick={refresh} disabled={loading} className="btn-outline rounded-full px-5 py-3 disabled:opacity-50">Check saved report status</button>
    </main>
    <nav className="flex flex-wrap justify-center gap-5 text-sm text-navy-950"><Link to="/report" className="underline">File another report</Link><Link to="/" className="underline">Home</Link></nav>
  </div>;
}
