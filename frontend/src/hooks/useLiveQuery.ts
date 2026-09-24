import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api";

/** One request at a time; effect cleanup fences late results and StrictMode loops. */
export function useLiveQuery<T>(key: string, load: (signal: AbortSignal) => Promise<T>, options: {
  interval?: number; maxWait?: number; terminal?: (value: T) => boolean;
} = {}) {
  const loadRef = useRef(load);
  const terminalRef = useRef(options.terminal);
  useEffect(() => { loadRef.current = load; terminalRef.current = options.terminal; }, [load, options.terminal]);
  const [snapshot, setSnapshot] = useState<{ key: string; data: T } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [refreshKey, refresh] = useState(0);
  const interval = options.interval ?? 10000;
  const maxWait = options.maxWait;
  useEffect(() => {
    let disposed = false, running = false, finished = false, failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const start = Date.now();
    // Reset connection state for a newly subscribed route/filter or explicit refresh.
    // eslint-disable-next-line react/set-state-in-effect
    setError(null); setPaused(false); setLoading(true);
    async function tick() {
      if (disposed || running || finished || document.hidden) return;
      if (maxWait && Date.now() - start >= maxWait) { setPaused(true); setLoading(false); return; }
      running = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 15000);
      try {
        const data = await loadRef.current(controller.signal);
        if (disposed) return;
        setSnapshot({ key, data }); setError(null); failures = 0;
        finished = Boolean(terminalRef.current?.(data));
      } catch (cause) {
        if (disposed) return;
        const error = cause instanceof ApiError ? cause : new ApiError("Connection interrupted. Please check again.");
        setError(error); failures++;
        finished = error.status === 404;
      } finally {
        clearTimeout(timeout); running = false;
        if (!disposed) {
          setLoading(false);
          if (!finished) timer = setTimeout(tick, failures ? Math.min(2000 * 2 ** (failures - 1), 10000) : interval);
        }
      }
    }
    function visibility() {
      clearTimeout(timer);
      if (!document.hidden) void tick();
    }
    document.addEventListener("visibilitychange", visibility);
    void tick();
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, [key, interval, maxWait, refreshKey]);
  return { data: snapshot?.key === key ? snapshot.data : null, error, loading, paused, refresh: () => refresh(k => k + 1) };
}
