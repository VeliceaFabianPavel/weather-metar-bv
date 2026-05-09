import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const ClockContext = createContext<Date | null>(null);

/**
 * Provider that ticks once per second, aligned to the wall-clock second so the
 * value updates on the boundary instead of drifting from mount time.
 */
export function ClockProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d);
      const msToNextSecond = 1000 - (d.getTime() % 1000);
      timeoutRef.current = setTimeout(tick, msToNextSecond);
    };
    const start = new Date();
    setNow(start);
    timeoutRef.current = setTimeout(tick, 1000 - (start.getTime() % 1000));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return createElement(ClockContext.Provider, { value: now }, children);
}

export function useClock(): Date {
  const ctx = useContext(ClockContext);
  if (ctx) return ctx;
  // Fallback for components rendered outside the provider (e.g. tests)
  // — same per-second tick but local.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
