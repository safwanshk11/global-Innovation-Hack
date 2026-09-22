import { useState, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { AudioCapture } from "../../components/report/AudioCapture";
import { PhotoCapture } from "../../components/report/PhotoCapture";
import { LocationCapture } from "../../components/report/LocationCapture";
import { setReportDraft } from "../../lib/reportDraftStore";
import type { CapturedAudio, CapturedPhoto, CapturedLocation } from "../../types/report";
import { BrandLogo } from "../../components/BrandLogo";

export function ReportForm() {
  const navigate = useNavigate();
  const [audio, setAudio] = useState<CapturedAudio | null>(null);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(audio && photo && location) && !submitting;

  function handleSubmit() {
    if (!audio || !photo || !location || submitting) return;
    setSubmitting(true);
    setReportDraft({ audio, photo, location, submissionId: crypto.randomUUID() });
    navigate("/report/processing");
  }

  return (
    <div className="min-h-screen bg-offwhite pb-20 selection:bg-teal-500 selection:text-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            to="/"
            className="icon-btn flex h-10 w-10 text-slate-500 hover:bg-slate-100 hover:text-navy-950 active:bg-slate-200 focus-visible:bg-slate-100"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </Link>
          <BrandLogo variant="light" className="scale-90 origin-left" />
          <div className="w-10"></div> {/* spacer for centering */}
        </div>
      </header>

      <main className="mx-auto mt-8 flex max-w-2xl flex-col gap-8 px-4">

        <div className="animate-fade-up">
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-950 mb-2">Report an issue</h1>
          <p className="text-slate-600">Complete these three steps to submit your report to the city.</p>
        </div>

        <div className="flex flex-col gap-6">
          <section
            className={`relative rounded-xl border ${audio ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200'} bg-white p-6 shadow-sm transition-all duration-300 animate-fade-up`}
            aria-labelledby="voice-heading"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 id="voice-heading" className="text-lg font-bold text-navy-950 flex items-center gap-2">
                  <StepBadge complete={Boolean(audio)}>1</StepBadge>
                  Voice note
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Describe the problem you are seeing.
                </p>
              </div>
            </div>
            <AudioCapture value={audio} onChange={setAudio} />
          </section>

          <section
            className={`relative rounded-xl border ${photo ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200'} bg-white p-6 shadow-sm transition-all duration-300 animate-fade-up ${!audio && !photo ? 'opacity-50 pointer-events-none grayscale' : ''}`}
            style={{ animationDelay: "80ms" }}
            aria-labelledby="photo-heading"
          >
            <span className={`absolute -top-6 left-9 h-6 w-0.5 transition-colors duration-300 ${audio ? 'bg-teal-500' : 'bg-slate-200'}`} aria-hidden="true" />
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 id="photo-heading" className="text-lg font-bold text-navy-950 flex items-center gap-2">
                  <StepBadge complete={Boolean(photo)}>2</StepBadge>
                  Photo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Take a clear picture of the issue as evidence.
                </p>
              </div>
            </div>
            <PhotoCapture value={photo} onChange={setPhoto} />
          </section>

          <section
            className={`relative rounded-xl border ${location ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200'} bg-white p-6 shadow-sm transition-all duration-300 animate-fade-up ${!photo && !location ? 'opacity-50 pointer-events-none grayscale' : ''}`}
            style={{ animationDelay: "160ms" }}
            aria-labelledby="location-heading"
          >
            <span className={`absolute -top-6 left-9 h-6 w-0.5 transition-colors duration-300 ${photo ? 'bg-teal-500' : 'bg-slate-200'}`} aria-hidden="true" />
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 id="location-heading" className="text-lg font-bold text-navy-950 flex items-center gap-2">
                  <StepBadge complete={Boolean(location)}>3</StepBadge>
                  Location
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Share your location so staff can find it.
                </p>
              </div>
            </div>
            <LocationCapture value={location} onChange={setLocation} />
          </section>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {submitting && <Loader2 size={20} className="animate-spin" aria-hidden="true" />}
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </main>
    </div>
  );
}

function StepBadge({ complete, children }: { complete: boolean; children: ReactNode }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition-colors duration-300 ${
        complete ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {complete ? <Check size={14} className="animate-scale-in" aria-hidden="true" /> : children}
    </span>
  );
}
