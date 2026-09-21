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
        className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
          value.source === "approximate" ? "bg-amber-50" : "bg-emerald-50"
        }`}
      >
        <span className={`text-sm ${value.source === "approximate" ? "text-amber-700" : "text-emerald-700"}`}>
          {value.source === "browser"
            ? `Location captured: ${value.lat.toFixed(5)}°, ${value.lng.toFixed(5)}°`
            : "Using approximate area location (Ward 7, Rivermill District)"}
        </span>
        <button
          type="button"
          onClick={requestLocation}
          className={`flex items-center gap-1 whitespace-nowrap text-xs font-medium underline-offset-2 hover:underline ${
            value.source === "approximate" ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          <RotateCcw size={13} aria-hidden="true" />
          {value.source === "approximate" ? "Use my location" : "Update"}
        </button>
      </div>
    );
  }

  if (requesting) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Waiting for location permission…
      </p>
    );
  }

  if (errorKind) {
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-red-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle size={15} aria-hidden="true" />
          {errorMessageFor(errorKind)}
        </p>
        <div className="flex flex-wrap gap-3">
          {errorKind !== "unsupported" && (
            <button
              type="button"
              onClick={requestLocation}
              className="text-xs font-medium text-red-700 underline-offset-2 hover:underline"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={useApproximateLocation}
            className="text-xs font-medium text-red-700 underline-offset-2 hover:underline"
          >
            Use approximate area location instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestLocation}
      className="flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 focus-visible:bg-sky-700"
    >
      <MapPin size={18} aria-hidden="true" />
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
