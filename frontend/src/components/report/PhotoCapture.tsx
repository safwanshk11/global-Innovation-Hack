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
        <div className="flex flex-col gap-3 rounded-xl bg-emerald-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-emerald-700">{value.file.name}</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePickClick}
                className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
              >
                <X size={13} aria-hidden="true" />
                Remove
              </button>
            </div>
          </div>
          <img
            src={value.url}
            alt="Preview of the attached photo"
            className="max-h-48 w-full rounded-lg object-cover"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePickClick}
          className="flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 focus-visible:bg-sky-700"
        >
          <Camera size={18} aria-hidden="true" />
          Add photo
        </button>
      )}

      {error && (
        <p className="flex items-center gap-2 text-xs text-red-600">
          <AlertTriangle size={13} aria-hidden="true" />
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
