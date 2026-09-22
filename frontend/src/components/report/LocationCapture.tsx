import { useState } from "react";
import { MapPin, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import type { CapturedLocation } from "../../types/report";

interface LocationCaptureProps {
  value: CapturedLocation | null;
  onChange: (location: CapturedLocation | null) => void;
}

// Fallback used only when the user explicitly opts in after location access
// fails — the approximate center of the covered area (Ward 7, Rivermill).
const FALLBACK_LOCATION = { lat: 13.0827, lng: 80.2707 };

type ErrorKind = "denied" | "timeout" | "unavailable" | "unsupported" | null;

export function LocationCapture({ value, onChange }: LocationCaptureProps) {
  const [requesting, setRequesting] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorKind("unsupported");
      return;
    }

    setRequesting(true);
    setErrorKind(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRequesting(false);
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "browser",
        });
      },
      (error) => {
        setRequesting(false);
        if (error.code === error.PERMISSION_DENIED) setErrorKind("denied");
        else if (error.code === error.TIMEOUT) setErrorKind("timeout");
        else setErrorKind("unavailable");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }

  function useApproximateLocation() {
    setErrorKind(null);
    onChange({ ...FALLBACK_LOCATION, source: "approximate" });
  }

  if (value) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-xl px-4 py-4 ${
          value.source === "approximate" ? "bg-amber-50" : "bg-teal-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <MapPin size={18} className={value.source === "approximate" ? "text-amber-500" : "text-teal-500"} />
          <span className={`text-sm font-medium ${value.source === "approximate" ? "text-amber-800" : "text-teal-800"}`}>
            {value.source === "browser"
              ? `Location: ${value.lat.toFixed(5)}°, ${value.lng.toFixed(5)}°`
              : "Using approximate area location"}
          </span>
        </div>
        <button
          type="button"
          onClick={requestLocation}
          className={`flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold transition-all duration-150 active:scale-95 ${
            value.source === "approximate"
              ? "text-amber-700 hover:bg-amber-100"
              : "text-teal-700 hover:bg-teal-100"
          }`}
        >
          <RotateCcw size={14} aria-hidden="true" />
          {value.source === "approximate" ? "Retry" : "Update"}
        </button>
      </div>
    );
  }

  if (requesting) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 py-5">
        <Loader2 size={18} className="animate-spin text-teal-500" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-600">
          Waiting for location permission…
        </p>
      </div>
    );
  }

  if (errorKind) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
          <AlertTriangle size={16} aria-hidden="true" />
          {errorMessageFor(errorKind)}
        </p>
        <div className="flex flex-wrap gap-4">
          {errorKind !== "unsupported" && (
            <button
              type="button"
              onClick={requestLocation}
              className="text-sm font-bold text-red-700 underline-offset-4 hover:underline"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={useApproximateLocation}
            className="text-sm font-bold text-slate-700 underline-offset-4 hover:underline"
          >
            Use approximate area instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestLocation}
      className="group flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-6 py-5 text-base font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-navy-950 hover:shadow-md focus-visible:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
    >
      <MapPin size={20} aria-hidden="true" className="text-teal-500 transition-transform duration-200 group-hover:scale-110" />
      Share my location
    </button>
  );
}

function errorMessageFor(kind: Exclude<ErrorKind, null>): string {
  switch (kind) {
    case "denied":
      return "Location access was denied.";
    case "timeout":
      return "Location request timed out.";
    case "unsupported":
      return "This browser doesn't support location sharing.";
    case "unavailable":
    default:
      return "Couldn't determine your location.";
  }
}
