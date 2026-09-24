import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { getReportDraft, clearReportDraft } from "../../lib/reportDraftStore";
import { submitReport, type SubmitReportResponse } from "../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";

// Share one in-flight upload through StrictMode or navigation away and back.
const submissions = new Map<string, Promise<SubmitReportResponse>>();
export function ReportProcessing() {
  const navigate = useNavigate();
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  const draft = getReportDraft();
  useEffect(() => {
    if (!draft) { navigate("/report", { replace: true }); return; }
    let active = true;
    let request = submissions.get(draft.submissionId);
    if (!request) {
      request = submitReport(draft);
      submissions.set(draft.submissionId, request);
      request.catch(() => submissions.delete(draft.submissionId));
    }
    request.then(result => {
      if (!active) return;
      clearReportDraft();
      navigate(`/report/success/${result.report_id}`, { replace: true, state: { saved: true } });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [draft, navigate, retry]);
  return <div className="min-h-screen bg-offwhite px-4 py-12 flex flex-col items-center justify-center gap-10 text-center">
    <BrandLogo variant="light" />
    <div className="glass-panel-light rounded-2xl p-8 w-full max-w-md space-y-6" role="status">
      {failed ? <>
        <AlertTriangle className="mx-auto text-amber-600" size={40} />
        <h1 className="text-2xl font-bold text-navy-950">Upload not confirmed</h1>
        <p className="text-slate-600">We couldn't confirm the response. Retrying this upload uses the same submission ID to avoid a duplicate.</p>
        <button className="btn-primary rounded-full px-6 py-3" onClick={() => { setFailed(false); setRetry(v => v + 1); }}>Try upload again</button>
        <Link className="block text-slate-600 underline" to="/report">Return to form</Link>
      </> : <>
        <Loader2 className="mx-auto animate-spin text-teal-600" size={40} />
        <h1 className="text-xl font-bold text-navy-950">Uploading your report…</h1>
        <p className="text-slate-600">Your receipt will appear as soon as the upload is saved.</p>
      </>}
    </div>
  </div>;
}
