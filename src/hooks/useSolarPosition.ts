import { useMemo } from "react";
import { useClock } from "./useClock";
import { calculateSolarPosition } from "../utils/solar";
import type { SolarPosition } from "../types/solar";

export function useSolarPosition(lat: number, lon: number): {
  now: Date;
  position: SolarPosition;
} {
  const now = useClock();
  const position = useMemo(
    () => calculateSolarPosition(now, lat, lon),
    [now, lat, lon],
  );
  return { now, position };
}
