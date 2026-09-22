import { useEffect, useRef, useState } from "react";

const TRANSITION_START_TIME = 6.2;
const TRANSITION_HARD_CUTOFF = 6.5;

interface HeroVideoProps {
  onTransitionStateChange: (hasTransitioned: boolean) => void;
  onTransitionStart?: () => void;
}

export function HeroVideo({ onTransitionStateChange, onTransitionStart }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    onTransitionStateChange(hasTransitioned);
  }, [hasTransitioned, onTransitionStateChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let safetyTimeout: number | null = null;
    let hardCutoffTimeout: number | null = null;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      if (!isFadingOut) onTransitionStart?.();
      setIsFadingOut(true);
      setHasTransitioned(true);
      return;
    }

    const checkTime = () => {
      if (!video) return;
      const currentTime = video.currentTime;

      if (currentTime >= TRANSITION_START_TIME && !isFadingOut) {
        onTransitionStart?.();
        setIsFadingOut(true);
      }

      if (currentTime >= TRANSITION_HARD_CUTOFF) {
        video.pause();
        setHasTransitioned(true);
        return; // stop loop
      }

      if (!video.paused && !video.ended) {
        requestRef.current = requestAnimationFrame(checkTime);
      }
    };

    const handlePlay = () => {
      if (hasTransitioned) return;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(checkTime);

      // Fallback timeouts in case RAF throttles (e.g., hidden tab)
      safetyTimeout = window.setTimeout(() => {
        if (!isFadingOut) onTransitionStart?.();
        setIsFadingOut(true);
      }, TRANSITION_START_TIME * 1000);

      hardCutoffTimeout = window.setTimeout(() => {
        if (!hasTransitioned) {
          video.pause();
          setHasTransitioned(true);
        }
      }, TRANSITION_HARD_CUTOFF * 1000);
    };

    const handlePause = () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (safetyTimeout) window.clearTimeout(safetyTimeout);
      if (hardCutoffTimeout) window.clearTimeout(hardCutoffTimeout);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handlePause);

    // Initial check in case autoplay fails
    video.play().catch(() => {
      if (!isFadingOut) onTransitionStart?.();
      setIsFadingOut(true);
      setHasTransitioned(true);
    });

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handlePause);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (safetyTimeout) window.clearTimeout(safetyTimeout);
      if (hardCutoffTimeout) window.clearTimeout(hardCutoffTimeout);
    };
  }, [hasTransitioned, isFadingOut]);

  return (
    <div className="absolute inset-0 z-0 h-full w-full overflow-hidden bg-navy-950">
      {!hasTransitioned && (
        <video
          ref={videoRef}
          src="/media/civicpulse-firefly.mp4"
          poster="/media/civicpulse-poster.jpg"
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out ${
            isFadingOut ? "opacity-0" : "opacity-100"
          }`}
          onError={() => {
            setIsFadingOut(true);
            setHasTransitioned(true);
          }}
        />
      )}

      {/* Dark overlay for text readability while video plays */}
      {!hasTransitioned && (
        <div className={`absolute inset-0 bg-navy-950/40 transition-opacity duration-300 ${isFadingOut ? "opacity-0" : "opacity-100"}`} />
      )}

      {/* Animated End State Background (Visible permanently after transition) */}
      <div
        className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ${
          isFadingOut || hasTransitioned ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-navy-950" />

        {/* Restrained central radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(25,185,154,0.08)_0%,transparent_70%)] animate-[pulse_8s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
