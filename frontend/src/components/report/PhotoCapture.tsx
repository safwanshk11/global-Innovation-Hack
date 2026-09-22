import { useRef, useState } from "react";
import { Camera, X, AlertTriangle } from "lucide-react";
import { validatePhotoFile, ACCEPTED_PHOTO_ACCEPT_ATTR } from "../../lib/mediaValidation";
import type { CapturedPhoto } from "../../types/report";

interface PhotoCaptureProps {
  value: CapturedPhoto | null;
  onChange: (photo: CapturedPhoto | null) => void;
}

export function PhotoCapture({ value, onChange }: PhotoCaptureProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePickClick() {
    setError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    if (value) URL.revokeObjectURL(value.url);
    const url = URL.createObjectURL(file);
    onChange({ file, url });
  }

  function handleRemove() {
    if (value) URL.revokeObjectURL(value.url);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {value ? (
        <div className="flex flex-col gap-3 rounded-xl bg-teal-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-teal-800">{value.file.name}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePickClick}
                className="rounded-md px-2 py-1 text-xs font-bold text-teal-700 transition-all duration-150 hover:bg-teal-100 active:scale-95"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-red-600 transition-all duration-150 hover:bg-red-100 active:scale-95"
              >
                <X size={14} aria-hidden="true" />
                Remove
              </button>
            </div>
          </div>
          <img
            src={value.url}
            alt="Preview of the attached photo"
            className="max-h-48 w-full rounded-lg object-cover shadow-sm border border-teal-500/20"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePickClick}
          className="group flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-6 py-5 text-base font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-navy-950 hover:shadow-md focus-visible:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          <Camera size={20} aria-hidden="true" className="text-slate-400 transition-transform duration-200 group-hover:scale-110" />
          Add photo evidence
        </button>
      )}

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          <AlertTriangle size={14} aria-hidden="true" />
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_PHOTO_ACCEPT_ATTR}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload photo"
      />
    </div>
  );
}
