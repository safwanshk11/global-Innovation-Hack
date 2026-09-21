export interface CapturedAudio {
  blob: Blob;
  url: string;
  source: "recording" | "upload";
  fileName?: string;
  durationSeconds?: number;
}

export interface CapturedPhoto {
  file: File;
  url: string;
}

export interface CapturedLocation {
  lat: number;
  lng: number;
  source: "browser" | "approximate";
}

export interface ReportDraft {
  audio: CapturedAudio;
  photo: CapturedPhoto;
  location: CapturedLocation;
  // Generated once per submission attempt (not per network request) so the
  // backend can recognize a retry of the same attempt and avoid saving it
  // twice. A genuinely new report gets a new draft and thus a new id.
  submissionId: string;
}
