import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { validateAudioUploadFile, ACCEPTED_AUDIO_ACCEPT_ATTR } from "../../lib/mediaValidation";
import type { CapturedAudio } from "../../types/report";

interface AudioCaptureProps {
  value: CapturedAudio | null;
  onChange: (audio: CapturedAudio | null) => void;
}

export function AudioCapture({ value, onChange }: AudioCaptureProps) {
  const recorder = useAudioRecorder();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedUrlRef = useRef<string | null>(null);

  // Once the recorder finishes a take, lift it into the parent's value.
  useEffect(() => {
    if (recorder.status === "recorded" && recorder.audioBlob && recorder.audioUrl) {
      onChange({
        blob: recorder.audioBlob,
        url: recorder.audioUrl,
        source: "recording",
        durationSeconds: recorder.seconds,
      });
    }
  }, [recorder.status, recorder.audioBlob]);

  function handleUploadClick() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const error = validateAudioUploadFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError(null);
    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current);
    const url = URL.createObjectURL(file);
    uploadedUrlRef.current = url;
    onChange({ blob: file, url, source: "upload", fileName: file.name });
  }

  function handleReplace() {
    if (uploadedUrlRef.current) {
      URL.revokeObjectURL(uploadedUrlRef.current);
      uploadedUrlRef.current = null;
    }
    recorder.reset();
    setUploadError(null);
    onChange(null);
  }

  if (value) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-teal-50 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-teal-800">
            {value.source === "recording"
              ? `Voice note captured (${formatTime(value.durationSeconds ?? 0)})`
              : `${value.fileName ?? "Audio file"} attached`}
          </span>
          <button
            type="button"
            onClick={handleReplace}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-teal-700 transition-all duration-150 hover:bg-teal-100 active:scale-95"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Replace
          </button>
        </div>
        <audio controls src={value.url} className="w-full h-10 outline-none" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {recorder.status === "idle" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={recorder.start}
            className="group relative flex flex-1 items-center justify-center gap-3 overflow-hidden rounded-xl bg-navy-950 px-6 py-5 text-base font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-navy-950 transition-transform group-hover:scale-110">
              <Mic size={18} aria-hidden="true" />
            </div>
            Start recording
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-navy-950 active:translate-y-0 active:scale-[0.98]"
          >
            <Upload size={18} aria-hidden="true" />
            Upload file
          </button>
        </div>
      )}

      {recorder.status === "requesting" && (
        <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 py-5">
          <Loader2 size={18} className="animate-spin text-teal-500" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">
            Requesting microphone access…
          </p>
        </div>
      )}

      {recorder.status === "recording" && (
        <button
          type="button"
          onClick={recorder.stop}
          className="group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-navy-950 px-6 py-8 text-base font-bold text-white shadow-lg transition-transform duration-200 hover:scale-[1.01] active:scale-[0.98]"
        >
          {/* Signal rings background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute h-32 w-32 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full border-2 border-teal-500 opacity-20" />
            <div className="absolute h-48 w-48 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full border border-teal-500 opacity-10" style={{ animationDelay: '200ms' }} />
          </div>

          <div className="relative z-10 flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Square size={24} aria-hidden="true" className="fill-white" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <span className="text-2xl font-mono tracking-wider text-teal-400">{formatTime(recorder.seconds)}</span>
            <span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Tap to stop</span>
          </div>
        </button>
      )}

      {(recorder.status === "denied" || recorder.status === "unsupported" || recorder.status === "error") && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertTriangle size={16} aria-hidden="true" />
            {recorder.errorMessage}
          </p>
          <div className="flex flex-wrap gap-4">
            {recorder.status !== "unsupported" && (
              <button
                type="button"
                onClick={recorder.start}
                className="text-sm font-bold text-red-700 underline-offset-4 hover:underline"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={handleUploadClick}
              className="text-sm font-bold text-slate-700 underline-offset-4 hover:underline"
            >
              Upload audio file instead
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          <AlertTriangle size={14} aria-hidden="true" />
          {uploadError}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AUDIO_ACCEPT_ATTR}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload audio file"
      />
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
