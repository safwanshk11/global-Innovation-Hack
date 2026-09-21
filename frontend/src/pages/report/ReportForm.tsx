import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AudioCapture } from "../../components/report/AudioCapture";
import { PhotoCapture } from "../../components/report/PhotoCapture";
import { LocationCapture } from "../../components/report/LocationCapture";
import { setReportDraft } from "../../lib/reportDraftStore";
import type { CapturedAudio, CapturedPhoto, CapturedLocation } from "../../types/report";

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
    <div className="min-h-screen bg-sky-50 pb-16">
      <header className="border-b border-sky-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Link
            to="/"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:bg-slate-100"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Report an issue</h1>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-xl flex-col gap-5 px-4">
        <p className="text-sm text-slate-600">
          Record a short voice note describing the problem, attach a photo, and share your
          location. No account or typing needed.
        </p>

        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="voice-heading">
          <h2 id="voice-heading" className="text-sm font-semibold text-slate-900">
            1. Voice note
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Record in the browser, or upload a file (M4A, MP3, WAV, OGG, WebM — max 10 MB).
          </p>
          <div className="mt-4">
            <AudioCapture value={audio} onChange={setAudio} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="photo-heading">
          <h2 id="photo-heading" className="text-sm font-semibold text-slate-900">
            2. Photo
          </h2>
          <p className="mt-1 text-xs text-slate-500">JPEG, PNG, or WebP — max 5 MB.</p>
          <div className="mt-4">
            <PhotoCapture value={photo} onChange={setPhoto} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="location-heading">
          <h2 id="location-heading" className="text-sm font-semibold text-slate-900">
            3. Location
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Requires this page to be served over localhost or HTTPS. If access is denied, you
            can use an approximate area location instead.
          </p>
          <div className="mt-4">
            <LocationCapture value={location} onChange={setLocation} />
          </div>
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-2 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-800"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </main>
    </div>
  );
}
