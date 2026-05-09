import { useCallback, useEffect, useState } from "react";
import type { ClimateBundle, DailyRecord } from "../types/climate";
import type { FetchState } from "../types/weather";
import { POIANA, STATION } from "../constants";
import {
  buildDataset,
  parseArchiveResponse,
  type RawArchiveResponse,
} from "../utils/climate";

const ARCHIVE_PARAMS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "precipitation_sum",
  "rain_sum",
  "snowfall_sum",
  "windspeed_10m_max",
  "windgusts_10m_max",
  "winddirection_10m_dominant",
  "shortwave_radiation_sum",
  "et0_fao_evapotranspiration",
];

interface OpenMeteoError {
  error: true;
  reason: string;
}

/**
 * Open-Meteo accepts comma-separated lat/lon and returns an *array* of
 * responses (one per location). This means our two locations cost one API
 * quota unit instead of two, fully sidestepping the per-hour rate limit.
 */
function multiArchiveUrl(
  coords: { lat: number; lon: number }[],
  start: string,
  end: string,
): string {
  const lats = coords.map((c) => c.lat).join(",");
  const lons = coords.map((c) => c.lon).join(",");
  const p = new URLSearchParams({
    latitude: lats,
    longitude: lons,
    start_date: start,
    end_date: end,
    daily: ARCHIVE_PARAMS.join(","),
    timezone: "Europe/Bucharest",
    wind_speed_unit: "kmh",
  });
  return `https://archive-api.open-meteo.com/v1/archive?${p.toString()}`;
}

export interface UseHistoricalDataResult {
  state: FetchState<ClimateBundle>;
  refetch: (force?: boolean) => Promise<void>;
  progress: { fetched: number; total: number; phase: string };
}

const START_DATE = "2015-01-01";
const END_DATE = "2024-12-31";
const CACHE_KEY = "lrbv-climate-cache-v4";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEnvelope {
  fetchedAt: string;
  startDate: string;
  endDate: string;
  brasov: { station: string; daily: SerializedDaily[] };
  poiana?: { station: string; daily: SerializedDaily[] };
}

interface SerializedDaily extends Omit<DailyRecord, "date"> {
  date: string;
}

function serialize(daily: DailyRecord[]): SerializedDaily[] {
  return daily.map((d) => ({ ...d, date: d.date.toISOString() }));
}
function deserialize(daily: SerializedDaily[]): DailyRecord[] {
  return daily.map((d) => ({ ...d, date: new Date(d.date) }));
}

function readCache(allowStale = false): CacheEnvelope | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const env: CacheEnvelope = JSON.parse(raw);
    const age = Date.now() - new Date(env.fetchedAt).getTime();
    if (!allowStale && age > CACHE_TTL_MS) return null;
    return env;
  } catch {
    return null;
  }
}

function writeCache(env: CacheEnvelope) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(env));
  } catch {
    /* quota exceeded — best effort */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimitError(json: unknown): json is OpenMeteoError {
  return (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    (json as OpenMeteoError).error === true
  );
}

async function fetchArchive(
  url: string,
  attempts = 3,
  signal?: AbortSignal,
): Promise<RawArchiveResponse[]> {
  let delay = 2000;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal });
      const json = await res.json();
      if (isRateLimitError(json)) {
        // Open-Meteo rate-limits aggressively. Don't retry — each retry burns
        // another quota unit. Surface the API's own message verbatim.
        throw new Error(json.reason);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Multi-location → array, single-location → object. Normalize.
      return Array.isArray(json) ? json : [json];
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.toLowerCase().includes("limit")) throw e; // never retry rate limits
      if (i === attempts - 1) throw e;
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error("Out of retry attempts");
}

export function useHistoricalData(
  startDate = START_DATE,
  endDate = END_DATE,
): UseHistoricalDataResult {
  const [state, setState] = useState<FetchState<ClimateBundle>>({ status: "idle" });
  const [progress, setProgress] = useState({ fetched: 0, total: 3, phase: "Idle" });

  const loadFromCache = useCallback(
    (allowStale: boolean): boolean => {
      const cached = readCache(allowStale);
      if (!cached) return false;
      if (cached.startDate !== startDate || cached.endDate !== endDate) return false;
      const brasovDaily = deserialize(cached.brasov.daily);
      const brasov = buildDataset(cached.brasov.station, brasovDaily);
      let poiana = brasov;
      if (cached.poiana) {
        poiana = buildDataset(
          cached.poiana.station,
          deserialize(cached.poiana.daily),
        );
      }
      setState({
        status: "success",
        data: { brasov, poiana, fetchedAt: new Date(cached.fetchedAt) },
      });
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      const ageDays = Math.floor(age / (24 * 60 * 60 * 1000));
      setProgress({
        fetched: 3,
        total: 3,
        phase: `Loaded from cache · ${ageDays}d old${allowStale && age > CACHE_TTL_MS ? " (stale)" : ""}`,
      });
      return true;
    },
    [startDate, endDate],
  );

  const fetchOnce = useCallback(
    async (force = false) => {
      if (!force && loadFromCache(false)) return;

      setState({ status: "loading" });
      setProgress({ fetched: 0, total: 3, phase: "Fetching archive (one batched call)…" });

      try {
        const responses = await fetchArchive(
          multiArchiveUrl(
            [
              { lat: STATION.lat, lon: STATION.lon },
              { lat: POIANA.lat, lon: POIANA.lon },
            ],
            startDate,
            endDate,
          ),
        );
        setProgress({ fetched: 1, total: 3, phase: "Parsing daily records…" });

        const brasovResp = responses[0];
        const poianaResp = responses[1];

        const brasovDaily = parseArchiveResponse(brasovResp);
        const poianaDaily = poianaResp ? parseArchiveResponse(poianaResp) : null;

        setProgress({ fetched: 2, total: 3, phase: "Aggregating monthly / annual…" });

        const brasov = buildDataset(`${STATION.icao} · Brașov`, brasovDaily);
        const poiana = poianaDaily
          ? buildDataset("Poiana Brașov", poianaDaily)
          : brasov;

        const fetchedAt = new Date();
        writeCache({
          fetchedAt: fetchedAt.toISOString(),
          startDate,
          endDate,
          brasov: { station: brasov.station, daily: serialize(brasovDaily) },
          poiana: poianaDaily
            ? { station: "Poiana Brașov", daily: serialize(poianaDaily) }
            : undefined,
        });

        setProgress({ fetched: 3, total: 3, phase: "Done" });
        setState({
          status: "success",
          data: { brasov, poiana, fetchedAt },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Network error";
        // Last-ditch: serve stale cache if any
        if (loadFromCache(true)) {
          // A stale cache load already set state — overlay an info message via progress
          setProgress({ fetched: 3, total: 3, phase: `Stale cache (live fetch failed: ${msg})` });
          return;
        }
        setState({ status: "error", error: msg });
        setProgress({ fetched: 0, total: 3, phase: `Error: ${msg}` });
      }
    },
    [startDate, endDate, loadFromCache],
  );

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  return { state, refetch: fetchOnce, progress };
}
