import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "unsupported"
  | "denied"
  | "error";

interface UseAudioRecorderResult {
  status: RecorderStatus;
  seconds: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// Preferred formats in order; the first one the browser's MediaRecorder
// supports is used. Falls back to the browser default if none match.
const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | undefined>(undefined);
  const audioUrlRef = useRef<string | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const releaseUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      stopTracks();
      releaseUrl();
    };
    // Unmount cleanup only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setStatus("unsupported");
      setErrorMessage("This browser doesn't support in-browser recording. Upload an audio file instead.");
      return;
    }

    setStatus("requesting");
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        releaseUrl();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioBlob(blob);
        setAudioUrl(url);
        setStatus("recorded");
        stopTracks();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      stopTracks();
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setErrorMessage("Microphone access was denied. Allow microphone access or upload an audio file instead.");
      } else {
        setStatus("error");
        setErrorMessage("Couldn't access the microphone. Try again or upload an audio file instead.");
      }
    }
  }, [releaseUrl, stopTracks]);

  const stop = useCallback(() => {
    window.clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    window.clearInterval(timerRef.current);
    stopTracks();
    releaseUrl();
    chunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setSeconds(0);
    setStatus("idle");
    setErrorMessage(null);
  }, [releaseUrl, stopTracks]);

  return { status, seconds, audioBlob, audioUrl, errorMessage, start, stop, reset };
}
