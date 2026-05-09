export const MS_TO_KT = 1.94384;
export const HPA_TO_INHG = 0.02953;
export const FT_PER_M = 3.28084;

export function pad(n: number, w = 2): string {
  return String(Math.abs(Math.trunc(n))).padStart(w, "0");
}

export function formatTemp(c: number, decimals = 1): string {
  if (!Number.isFinite(c)) return "—";
  const sign = c < 0 ? "-" : "";
  return `${sign}${Math.abs(c).toFixed(decimals)}°C`;
}

export function formatTempC(c: number, decimals = 1): string {
  if (!Number.isFinite(c)) return "—";
  return c.toFixed(decimals);
}

export function formatWindKt(speedMs: number, decimals = 0): string {
  if (!Number.isFinite(speedMs)) return "—";
  return (speedMs * MS_TO_KT).toFixed(decimals);
}

export function formatWindMs(speedMs: number, decimals = 1): string {
  if (!Number.isFinite(speedMs)) return "—";
  return speedMs.toFixed(decimals);
}

export function formatPressure(hpa: number): string {
  if (!Number.isFinite(hpa)) return "—";
  return Math.round(hpa).toString();
}

export function formatVisibility(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters >= 9999) return ">10 km";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDirection(deg: number): string {
  if (!Number.isFinite(deg)) return "—";
  return pad(Math.round(deg) % 360, 3);
}

export function compassPoint(deg: number): string {
  if (!Number.isFinite(deg)) return "—";
  const points = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return points[i];
}

export function formatUTCTime(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}Z`;
}

export function formatLocalTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatHourLabel(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${pad(m)}m`;
}

export function formatNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSigned(n: number, decimals = 1, suffix = ""): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}${suffix}`;
}

export function tempColor(c: number): string {
  if (!Number.isFinite(c)) return "var(--text-secondary)";
  if (c < 0) return "var(--accent-cyan)";
  if (c > 25) return "var(--accent-solar)";
  return "var(--text-primary)";
}

/** Map Open-Meteo WMO weather code → short label + METAR-style abbreviation. */
export const WEATHER_CODES: Record<
  number,
  { label: string; metar: string; severity: "clear" | "ok" | "warn" | "bad" }
> = {
  0: { label: "Clear sky", metar: "", severity: "clear" },
  1: { label: "Mainly clear", metar: "", severity: "clear" },
  2: { label: "Partly cloudy", metar: "", severity: "ok" },
  3: { label: "Overcast", metar: "", severity: "ok" },
  45: { label: "Fog", metar: "FG", severity: "warn" },
  48: { label: "Depositing rime fog", metar: "FZFG", severity: "warn" },
  51: { label: "Light drizzle", metar: "-DZ", severity: "ok" },
  53: { label: "Moderate drizzle", metar: "DZ", severity: "ok" },
  55: { label: "Dense drizzle", metar: "+DZ", severity: "warn" },
  56: { label: "Light freezing drizzle", metar: "-FZDZ", severity: "warn" },
  57: { label: "Dense freezing drizzle", metar: "+FZDZ", severity: "bad" },
  61: { label: "Light rain", metar: "-RA", severity: "ok" },
  63: { label: "Moderate rain", metar: "RA", severity: "warn" },
  65: { label: "Heavy rain", metar: "+RA", severity: "bad" },
  66: { label: "Light freezing rain", metar: "-FZRA", severity: "warn" },
  67: { label: "Heavy freezing rain", metar: "+FZRA", severity: "bad" },
  71: { label: "Light snow", metar: "-SN", severity: "ok" },
  73: { label: "Moderate snow", metar: "SN", severity: "warn" },
  75: { label: "Heavy snow", metar: "+SN", severity: "bad" },
  77: { label: "Snow grains", metar: "SG", severity: "warn" },
  80: { label: "Light showers", metar: "-SHRA", severity: "ok" },
  81: { label: "Moderate showers", metar: "SHRA", severity: "warn" },
  82: { label: "Violent showers", metar: "+SHRA", severity: "bad" },
  85: { label: "Light snow showers", metar: "-SHSN", severity: "ok" },
  86: { label: "Heavy snow showers", metar: "+SHSN", severity: "warn" },
  95: { label: "Thunderstorm", metar: "TS", severity: "bad" },
  96: { label: "Thunderstorm w/ light hail", metar: "TSGR", severity: "bad" },
  99: { label: "Thunderstorm w/ heavy hail", metar: "+TSGR", severity: "bad" },
};

export function describeWeatherCode(code: number): {
  label: string;
  metar: string;
  severity: "clear" | "ok" | "warn" | "bad";
} {
  return WEATHER_CODES[code] ?? { label: "Unknown", metar: "", severity: "ok" };
}
