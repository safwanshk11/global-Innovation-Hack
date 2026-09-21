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
    // Only react to a freshly recorded blob, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="flex flex-col gap-3 rounded-xl bg-emerald-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-emerald-700">
            {value.source === "recording"
              ? `Voice note captured (${formatTime(value.durationSeconds ?? 0)})`
              : `${value.fileName ?? "Audio file"} attached`}
          </span>
          <button
            type="button"
            onClick={handleReplace}
            className="flex items-center gap-1 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Replace
          </button>
        </div>
        <audio controls src={value.url} className="w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {recorder.status === "idle" && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={recorder.start}
            className="flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 focus-visible:bg-sky-700"
          >
            <Mic size={18} aria-hidden="true" />
            Start recording
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload size={16} aria-hidden="true" />
            Upload audio file instead
          </button>
        </div>
      )}

      {recorder.status === "requesting" && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Requesting microphone access…
        </p>
      )}

      {recorder.status === "recording" && (
        <button
          type="button"
          onClick={recorder.stop}
          className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus-visible:bg-red-700"
        >
          <Square size={16} aria-hidden="true" />
          Stop · {formatTime(recorder.seconds)}
        </button>
      )}

      {(recorder.status === "denied" || recorder.status === "unsupported" || recorder.status === "error") && (
        <div className="flex flex-col gap-2 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={15} aria-hidden="true" />
            {recorder.errorMessage}
          </p>
          <div className="flex flex-wrap gap-3">
            {recorder.status !== "unsupported" && (
              <button
                type="button"
                onClick={recorder.start}
                className="text-xs font-medium text-red-700 underline-offset-2 hover:underline"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={handleUploadClick}
              className="text-xs font-medium text-red-700 underline-offset-2 hover:underline"
            >
              Upload audio file instead
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <p className="flex items-center gap-2 text-xs text-red-600">
          <AlertTriangle size={13} aria-hidden="true" />
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
