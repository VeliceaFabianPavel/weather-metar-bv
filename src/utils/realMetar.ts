import type { ParsedMETAR } from "../types/weather";
import { parseMETAR } from "./metar";

const PRIMARY = "LRBV";
const FALLBACKS = ["LROP", "LRSB", "LRBC", "LRTM"];

export interface RealMetarResult {
  raw: string;
  parsed: ParsedMETAR;
  station: string;
  fetchedAt: Date;
  fallback: boolean;
  source: string;
}

/**
 * Build a list of CORS-friendly endpoints for a given ICAO. Tried in order
 * until one returns a valid METAR.
 *
 * - vatsim is the primary feed (has Access-Control-Allow-Origin: *).
 * - allorigins.win is a CORS proxy that fronts NOAA's aviationweather.gov.
 * - codetabs is a backup CORS proxy in case allorigins is rate-limited.
 */
function buildEndpoints(station: string): { url: string; source: string }[] {
  const noaaUrl = `https://aviationweather.gov/api/data/metar?ids=${station}&format=raw&hours=2`;
  return [
    { url: `https://metar.vatsim.net/${station}`, source: "vatsim" },
    {
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(noaaUrl)}`,
      source: "noaa·proxy",
    },
    {
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(noaaUrl)}`,
      source: "noaa·proxy2",
    },
  ];
}

async function fetchOne(
  station: string,
  signal?: AbortSignal,
): Promise<{ raw: string; source: string } | null> {
  for (const ep of buildEndpoints(station)) {
    try {
      const res = await fetch(ep.url, {
        signal,
        cache: "no-store",
        headers: { Accept: "text/plain" },
      });
      if (!res.ok) continue;
      const text = (await res.text()).trim();
      if (!text) continue;
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      // Most-recent observation is the first non-empty line beginning with the station code.
      const latest = lines.find((l) => /^[A-Z]{4}/.test(l));
      if (latest) return { raw: latest, source: ep.source };
    } catch {
      // Try the next endpoint
    }
  }
  return null;
}

export async function fetchRealMETAR(signal?: AbortSignal): Promise<RealMetarResult> {
  const primary = await fetchOne(PRIMARY, signal);
  if (primary) {
    const parsed = parseMETAR(primary.raw);
    if (parsed) {
      return {
        raw: primary.raw,
        parsed,
        station: PRIMARY,
        fetchedAt: new Date(),
        fallback: false,
        source: primary.source,
      };
    }
  }
  for (const station of FALLBACKS) {
    const result = await fetchOne(station, signal);
    if (result) {
      const parsed = parseMETAR(result.raw);
      if (parsed) {
        return {
          raw: result.raw,
          parsed,
          station,
          fetchedAt: new Date(),
          fallback: true,
          source: result.source,
        };
      }
    }
  }
  throw new Error("All METAR endpoints unreachable");
}
