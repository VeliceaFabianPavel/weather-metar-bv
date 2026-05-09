import type {
  CloudLayer,
  CurrentWeather,
  ParsedMETAR,
} from "../types/weather";
import { MS_TO_KT, pad, describeWeatherCode } from "./format";

export interface GenerateMETARInput {
  station: string;
  time: Date;
  current: CurrentWeather;
  /** Estimated visibility (meters) — derive from cloud cover/precip if unknown. */
  visibility?: number;
}

function cloudCoverageFromOktas(percent: number): CloudLayer["coverage"] {
  if (percent <= 6) return "SKC";
  if (percent <= 25) return "FEW";
  if (percent <= 50) return "SCT";
  if (percent <= 87) return "BKN";
  return "OVC";
}

/** Estimate cloud base in feet AGL from temperature/dewpoint spread (Espy). */
export function estimateCloudBase(tempC: number, dewC: number): number {
  const spread = Math.max(tempC - dewC, 0);
  // Espy's formula: base (m) ≈ 125 × spread; clamp to realistic METAR step.
  const meters = 125 * spread;
  const ft = meters * 3.28084;
  return Math.max(200, Math.round(ft / 100) * 100);
}

/** Approximate dewpoint (Magnus). */
export function dewpointFromHumidity(tempC: number, humidity: number): number {
  if (humidity <= 0) return -50;
  const a = 17.625;
  const b = 243.04;
  const rh = Math.min(100, Math.max(1, humidity));
  const alpha = Math.log(rh / 100) + (a * tempC) / (b + tempC);
  return (b * alpha) / (a - alpha);
}

/** Estimate visibility in meters from precipitation and weather code. */
export function estimateVisibility(
  precipitationMm: number,
  weatherCode: number,
  cloudCover: number,
): number {
  const desc = describeWeatherCode(weatherCode);
  if (desc.metar.includes("FG")) return 600;
  if (desc.metar.includes("+")) return 2500;
  if (desc.metar.includes("RA") || desc.metar.includes("SN")) return 6000;
  if (precipitationMm > 0.2) return 7000;
  if (cloudCover > 90) return 9000;
  return 9999;
}

export function generateMETAR(input: GenerateMETARInput): string {
  const { station, time, current } = input;
  const cur = current;
  const day = pad(time.getUTCDate());
  const hh = pad(time.getUTCHours());
  const mm = pad(time.getUTCMinutes());
  const timeBlock = `${day}${hh}${mm}Z`;

  // Wind: direction (deg) + speed (kt). Calm = 00000KT.
  const windKt = Math.round(cur.windSpeed * MS_TO_KT);
  const gustKt = Math.round(cur.windGusts * MS_TO_KT);
  let windBlock: string;
  if (windKt < 1) {
    windBlock = "00000KT";
  } else {
    const dir = pad(Math.round(cur.windDirection) % 360, 3);
    windBlock =
      gustKt > windKt + 5
        ? `${dir}${pad(windKt)}G${pad(gustKt)}KT`
        : `${dir}${pad(windKt)}KT`;
  }

  // Visibility (meters → 4-digit field, 9999 = 10km+)
  const vis = input.visibility ?? estimateVisibility(
    cur.precipitation,
    cur.weatherCode,
    cur.cloudCover,
  );
  const visBlock = vis >= 9999 ? "9999" : pad(Math.min(9999, vis), 4);

  // Weather phenomena
  const wx = describeWeatherCode(cur.weatherCode).metar;
  const wxBlock = wx ? wx : "";

  // Clouds — single layer at estimated base
  const dew = dewpointFromHumidity(cur.temperature, cur.humidity);
  const base = estimateCloudBase(cur.temperature, dew);
  const cov = cloudCoverageFromOktas(cur.cloudCover);
  let cloudBlock: string;
  if (cov === "SKC") cloudBlock = "NSC";
  else cloudBlock = `${cov}${pad(Math.round(base / 100), 3)}`;

  // Temp / dew (M for negative)
  const tStr = (n: number) =>
    n < 0 ? `M${pad(Math.round(Math.abs(n)))}` : pad(Math.round(n));
  const tdBlock = `${tStr(cur.temperature)}/${tStr(dew)}`;

  // QNH (Q + hPa, 4 digits)
  const qBlock = `Q${pad(Math.round(cur.pressureMsl), 4)}`;

  return [
    "METAR",
    station,
    timeBlock,
    "AUTO",
    windBlock,
    visBlock,
    wxBlock,
    cloudBlock,
    tdBlock,
    qBlock,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Parse a METAR string. Tolerates partial/imperfect input. */
export function parseMETAR(raw: string): ParsedMETAR | null {
  const cleaned = raw.replace(/\s+/g, " ").trim().replace(/=$/, "");
  if (!cleaned) return null;

  const tokens = cleaned.split(" ").filter(Boolean);
  // Drop "METAR" or "SPECI" prefix
  if (tokens[0] === "METAR" || tokens[0] === "SPECI") tokens.shift();
  if (!tokens.length) return null;

  const station = tokens.shift()!;
  if (!/^[A-Z]{4}$/.test(station)) return null;

  // Time: ddhhmmZ
  let time = new Date();
  let rawTime: string | undefined;
  if (tokens[0] && /^\d{6}Z$/.test(tokens[0])) {
    const t = tokens.shift()!;
    rawTime = t;
    const day = parseInt(t.slice(0, 2), 10);
    const hh = parseInt(t.slice(2, 4), 10);
    const mm = parseInt(t.slice(4, 6), 10);
    const now = new Date();
    time = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hh, mm),
    );
  }

  let isAuto = false;
  if (tokens[0] === "AUTO" || tokens[0] === "COR") {
    isAuto = tokens.shift() === "AUTO";
  }

  // Wind
  const wind: ParsedMETAR["wind"] = {
    direction: 0,
    speed: 0,
    unit: "KT",
  };
  const windRe =
    /^(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/;
  if (tokens[0] && windRe.test(tokens[0])) {
    const m = tokens.shift()!.match(windRe)!;
    wind.direction = m[1] === "VRB" ? "VRB" : parseInt(m[1], 10);
    wind.speed = parseInt(m[2], 10);
    if (m[3]) wind.gusts = parseInt(m[3], 10);
    wind.unit = m[4] === "MPS" ? "MPS" : "KT";
  }
  // Variable direction range
  if (tokens[0] && /^\d{3}V\d{3}$/.test(tokens[0])) {
    const t = tokens.shift()!;
    wind.variable = [
      parseInt(t.slice(0, 3), 10),
      parseInt(t.slice(4, 7), 10),
    ];
  }

  // Visibility — 4 digit meters, "CAVOK", or statute miles like 10SM
  let visibility = 9999;
  if (tokens[0] === "CAVOK") {
    visibility = 9999;
    tokens.shift();
  } else if (tokens[0] && /^\d{4}$/.test(tokens[0])) {
    visibility = parseInt(tokens.shift()!, 10);
  } else if (tokens[0] && /^\d+SM$/.test(tokens[0])) {
    visibility = Math.round(parseInt(tokens.shift()!, 10) * 1609.34);
  }

  // RVR — drop runway visual range tokens (R##/...)
  while (tokens[0] && /^R\d{2}[LCR]?\//.test(tokens[0])) tokens.shift();

  // Weather phenomena (until cloud/temp token)
  const weather: string[] = [];
  const wxRe = /^[+-]?(VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP|FG|BR|HZ|FU|VA|DU|SA|PY|PO|SQ|FC|SS|DS)$/;
  while (tokens.length && wxRe.test(tokens[0])) {
    weather.push(tokens.shift()!);
  }

  // Clouds — auto stations may emit "FEW047///" with /// in place of cloud type
  const clouds: CloudLayer[] = [];
  const cloudRe =
    /^(FEW|SCT|BKN|OVC|SKC|CLR|NSC|NCD|VV)(\d{3}|\/{3})?(CB|TCU|\/\/\/)?$/;
  while (tokens.length && cloudRe.test(tokens[0])) {
    const m = tokens.shift()!.match(cloudRe)!;
    const coverage = m[1] as CloudLayer["coverage"];
    if (coverage === "SKC" || coverage === "CLR" || coverage === "NSC") {
      clouds.push({ coverage, base: 0 });
    } else {
      const baseStr = m[2];
      const base = baseStr && baseStr !== "///" ? parseInt(baseStr, 10) * 100 : 0;
      const typeStr = m[3];
      const type =
        typeStr === "CB" || typeStr === "TCU"
          ? (typeStr as "CB" | "TCU")
          : undefined;
      clouds.push({ coverage, base, type });
    }
  }

  // Temperature / Dewpoint  ("M" prefix = minus)
  let temperature = NaN;
  let dewpoint = NaN;
  const tdRe = /^(M?\d{2})\/(M?\d{2})$/;
  if (tokens[0] && tdRe.test(tokens[0])) {
    const m = tokens.shift()!.match(tdRe)!;
    const parseT = (s: string) =>
      s.startsWith("M") ? -parseInt(s.slice(1), 10) : parseInt(s, 10);
    temperature = parseT(m[1]);
    dewpoint = parseT(m[2]);
  }

  // Pressure: Q#### (hPa) or A#### (inHg ×100)
  let pressure: ParsedMETAR["pressure"] = { value: 1013, unit: "Q" };
  if (tokens[0] && /^Q\d{4}$/.test(tokens[0])) {
    pressure = { value: parseInt(tokens.shift()!.slice(1), 10), unit: "Q" };
  } else if (tokens[0] && /^A\d{4}$/.test(tokens[0])) {
    pressure = {
      value: parseInt(tokens.shift()!.slice(1), 10) / 100,
      unit: "A",
    };
  }

  // Remarks (everything after RMK)
  let remarks: string | undefined;
  const rmkIdx = tokens.indexOf("RMK");
  if (rmkIdx >= 0) remarks = tokens.slice(rmkIdx + 1).join(" ");

  return {
    station,
    time,
    rawTime,
    wind,
    visibility,
    clouds,
    temperature,
    dewpoint,
    pressure,
    weather,
    remarks,
    isAuto,
    raw: cleaned,
  };
}

/** Tokens with semantic role for color-coding in the UI. */
export type MetarToken = {
  text: string;
  role:
    | "type"
    | "station"
    | "time"
    | "auto"
    | "wind"
    | "visibility"
    | "weather"
    | "clouds"
    | "temp"
    | "pressure"
    | "remarks"
    | "other";
};

/** Tokenize a METAR string into semantically-tagged segments for display. */
export function tokenizeMETAR(raw: string): MetarToken[] {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const out: MetarToken[] = [];
  const parts = cleaned.split(" ");
  let phase: "type" | "station" | "time" | "rest" = "type";
  let inRemarks = false;

  for (const tok of parts) {
    if (!tok) continue;
    if (inRemarks) {
      out.push({ text: tok, role: "remarks" });
      continue;
    }
    if (tok === "RMK") {
      out.push({ text: tok, role: "remarks" });
      inRemarks = true;
      continue;
    }
    if (phase === "type" && (tok === "METAR" || tok === "SPECI")) {
      out.push({ text: tok, role: "type" });
      phase = "station";
      continue;
    }
    if (phase === "type" || phase === "station") {
      if (/^[A-Z]{4}$/.test(tok)) {
        out.push({ text: tok, role: "station" });
        phase = "time";
        continue;
      }
    }
    if (phase === "time" && /^\d{6}Z$/.test(tok)) {
      out.push({ text: tok, role: "time" });
      phase = "rest";
      continue;
    }
    if (tok === "AUTO" || tok === "COR" || tok === "NIL") {
      out.push({ text: tok, role: "auto" });
      continue;
    }
    if (/^(VRB|\d{3})\d{2,3}(G\d{2,3})?(KT|MPS|KMH)$/.test(tok)) {
      out.push({ text: tok, role: "wind" });
      continue;
    }
    if (/^\d{3}V\d{3}$/.test(tok)) {
      out.push({ text: tok, role: "wind" });
      continue;
    }
    if (tok === "CAVOK" || /^\d{4}$/.test(tok) || /^\d+SM$/.test(tok)) {
      out.push({ text: tok, role: "visibility" });
      continue;
    }
    if (
      /^[+-]?(VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP|FG|BR|HZ|FU|VA|DU|SA|PY|PO|SQ|FC|SS|DS)$/.test(
        tok,
      )
    ) {
      out.push({ text: tok, role: "weather" });
      continue;
    }
    if (
      /^(FEW|SCT|BKN|OVC|SKC|CLR|NSC|NCD|VV)(\d{3}|\/{3})?(CB|TCU|\/\/\/)?$/.test(
        tok,
      )
    ) {
      out.push({ text: tok, role: "clouds" });
      continue;
    }
    if (/^M?\d{2}\/M?\d{2}$/.test(tok)) {
      out.push({ text: tok, role: "temp" });
      continue;
    }
    if (/^[QA]\d{4}$/.test(tok)) {
      out.push({ text: tok, role: "pressure" });
      continue;
    }
    out.push({ text: tok, role: "other" });
  }
  return out;
}

export const METAR_TOKEN_COLOR: Record<MetarToken["role"], string> = {
  type: "var(--text-dim)",
  station: "var(--accent-solar)",
  time: "var(--text-secondary)",
  auto: "var(--text-dim)",
  wind: "var(--accent-cyan)",
  visibility: "var(--accent-green)",
  weather: "var(--accent-red)",
  clouds: "var(--text-primary)",
  temp: "var(--accent-solar)",
  pressure: "var(--accent-purple)",
  remarks: "var(--text-secondary)",
  other: "var(--text-secondary)",
};
