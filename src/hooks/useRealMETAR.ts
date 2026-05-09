import { useCallback, useEffect, useRef, useState } from "react";
import type { FetchState } from "../types/weather";
import { fetchRealMETAR, type RealMetarResult } from "../utils/realMetar";

const REFRESH_MS = 60_000;

export interface UseRealMETARResult {
  state: FetchState<RealMetarResult>;
  refetch: () => Promise<void>;
  countdownMs: number;
}

export function useRealMETAR(): UseRealMETARResult {
  const [state, setState] = useState<FetchState<RealMetarResult>>({ status: "idle" });
  const [countdownMs, setCountdownMs] = useState(REFRESH_MS);
  const lastFetchRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState((prev) =>
      prev.status === "success"
        ? { status: "loading", data: prev.data }
        : { status: "loading" },
    );
    try {
      const data = await fetchRealMETAR(ac.signal);
      setState({ status: "success", data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setState((prev) => ({
        status: "error",
        error: msg,
        data: prev.status === "success" ? prev.data : undefined,
      }));
    }
    lastFetchRef.current = Date.now();
    setCountdownMs(REFRESH_MS);
  }, []);

  useEffect(() => {
    fetchOnce();
    return () => abortRef.current?.abort();
  }, [fetchOnce]);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - lastFetchRef.current;
      const remaining = REFRESH_MS - elapsed;
      if (remaining <= 0) fetchOnce();
      else setCountdownMs(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [fetchOnce]);

  return { state, refetch: fetchOnce, countdownMs };
}
