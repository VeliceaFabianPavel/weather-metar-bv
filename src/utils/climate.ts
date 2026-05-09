import type {
  AnnualAggregate,
  ClimateDataset,
  ClimateNormal,
  DailyRecord,
  MonthlyAggregate,
} from "../types/climate";

export interface RawArchiveResponse {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    temperature_2m_mean: (number | null)[];
    precipitation_sum: (number | null)[];
    rain_sum: (number | null)[];
    snowfall_sum: (number | null)[];
    windspeed_10m_max: (number | null)[];
    windgusts_10m_max: (number | null)[];
    winddirection_10m_dominant: (number | null)[];
    shortwave_radiation_sum: (number | null)[];
    et0_fao_evapotranspiration: (number | null)[];
  };
}

const num = (v: number | null | undefined, fallback = NaN): number =>
  v == null ? fallback : v;

export function parseArchiveResponse(
  response: RawArchiveResponse,
): DailyRecord[] {
  const d = response.daily;
  return d.time.map((t, i) => ({
    date: new Date(t + "T00:00:00Z"),
    tMax: num(d.temperature_2m_max[i]),
    tMin: num(d.temperature_2m_min[i]),
    tMean: num(d.temperature_2m_mean[i]),
    precipitation: num(d.precipitation_sum[i], 0),
    rain: num(d.rain_sum[i], 0),
    snowfall: num(d.snowfall_sum[i], 0),
    windMax: num(d.windspeed_10m_max[i], 0),
    gustMax: num(d.windgusts_10m_max[i], 0),
    windDirection: num(d.winddirection_10m_dominant[i], 0),
    radiation: num(d.shortwave_radiation_sum[i], 0),
    et0: num(d.et0_fao_evapotranspiration[i], 0),
  }));
}

const HDD_BASE = 18;
const CDD_BASE = 24;

function avg(xs: number[]): number {
  if (!xs.length) return NaN;
  let s = 0;
  let n = 0;
  for (const x of xs) {
    if (Number.isFinite(x)) {
      s += x;
      n++;
    }
  }
  return n ? s / n : NaN;
}

function sum(xs: number[]): number {
  let s = 0;
  for (const x of xs) if (Number.isFinite(x)) s += x;
  return s;
}

function maxBy<T>(xs: T[], key: (t: T) => number): T | undefined {
  let best: T | undefined;
  let bestKey = -Infinity;
  for (const x of xs) {
    const k = key(x);
    if (Number.isFinite(k) && k > bestKey) {
      bestKey = k;
      best = x;
    }
  }
  return best;
}

function minBy<T>(xs: T[], key: (t: T) => number): T | undefined {
  let best: T | undefined;
  let bestKey = Infinity;
  for (const x of xs) {
    const k = key(x);
    if (Number.isFinite(k) && k < bestKey) {
      bestKey = k;
      best = x;
    }
  }
  return best;
}

export function aggregateMonthly(daily: DailyRecord[]): MonthlyAggregate[] {
  const buckets = new Map<string, DailyRecord[]>();
  for (const d of daily) {
    const key = `${d.date.getUTCFullYear()}-${d.date.getUTCMonth()}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(d);
  }
  const out: MonthlyAggregate[] = [];
  for (const [key, rows] of buckets) {
    const [yStr, mStr] = key.split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    out.push({
      year,
      month,
      tMax: Math.max(...rows.map((r) => r.tMax).filter(Number.isFinite)),
      tMin: Math.min(...rows.map((r) => r.tMin).filter(Number.isFinite)),
      tMean: avg(rows.map((r) => r.tMean)),
      tMaxAvg: avg(rows.map((r) => r.tMax)),
      tMinAvg: avg(rows.map((r) => r.tMin)),
      precipitation: sum(rows.map((r) => r.precipitation)),
      rain: sum(rows.map((r) => r.rain)),
      snowfall: sum(rows.map((r) => r.snowfall)),
      windAvg: avg(rows.map((r) => r.windMax)),
      windMax: Math.max(...rows.map((r) => r.windMax).filter(Number.isFinite)),
      radiation: sum(rows.map((r) => r.radiation)),
      hdd: sum(rows.map((r) => Math.max(0, HDD_BASE - r.tMean))),
      cdd: sum(rows.map((r) => Math.max(0, r.tMean - CDD_BASE))),
      daysWithRain: rows.filter((r) => r.rain > 0.5).length,
      daysWithSnow: rows.filter((r) => r.snowfall > 0.5).length,
      daysWithFrost: rows.filter((r) => r.tMin <= 0).length,
    });
  }
  out.sort((a, b) => a.year - b.year || a.month - b.month);
  return out;
}

export function longestDryStreak(rows: DailyRecord[]): number {
  let best = 0;
  let cur = 0;
  for (const r of rows) {
    if ((r.precipitation ?? 0) < 0.5) {
      cur++;
      if (cur > best) best = cur;
    } else cur = 0;
  }
  return best;
}

function firstFrost(rows: DailyRecord[]): Date | null {
  // First frost in the second half of year
  const second = rows.filter((r) => r.date.getUTCMonth() >= 7);
  const hit = second.find((r) => r.tMin <= 0);
  return hit ? hit.date : null;
}

function lastFrost(rows: DailyRecord[]): Date | null {
  // Last frost in the first half of year
  const first = rows.filter((r) => r.date.getUTCMonth() <= 5);
  let last: Date | null = null;
  for (const r of first) if (r.tMin <= 0) last = r.date;
  return last;
}

export function aggregateAnnual(daily: DailyRecord[]): AnnualAggregate[] {
  const byYear = new Map<number, DailyRecord[]>();
  for (const d of daily) {
    const y = d.date.getUTCFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(d);
  }
  const out: AnnualAggregate[] = [];
  for (const [year, rows] of byYear) {
    const hottest = maxBy(rows, (r) => r.tMax);
    const coldest = minBy(rows, (r) => r.tMin);
    const wettest = maxBy(rows, (r) => r.precipitation);
    const windiest = maxBy(rows, (r) => r.windMax);
    out.push({
      year,
      tMean: avg(rows.map((r) => r.tMean)),
      tMax: Math.max(...rows.map((r) => r.tMax).filter(Number.isFinite)),
      tMin: Math.min(...rows.map((r) => r.tMin).filter(Number.isFinite)),
      precipitation: sum(rows.map((r) => r.precipitation)),
      windMax: Math.max(...rows.map((r) => r.windMax).filter(Number.isFinite)),
      radiation: sum(rows.map((r) => r.radiation)),
      hdd: sum(rows.map((r) => Math.max(0, HDD_BASE - r.tMean))),
      cdd: sum(rows.map((r) => Math.max(0, r.tMean - CDD_BASE))),
      daysWithRain: rows.filter((r) => r.rain > 0.5).length,
      daysWithSnow: rows.filter((r) => r.snowfall > 0.5).length,
      daysWithFrost: rows.filter((r) => r.tMin <= 0).length,
      hottestDay: { date: hottest?.date ?? new Date(NaN), temp: hottest?.tMax ?? NaN },
      coldestDay: { date: coldest?.date ?? new Date(NaN), temp: coldest?.tMin ?? NaN },
      wettestDay: {
        date: wettest?.date ?? new Date(NaN),
        mm: wettest?.precipitation ?? NaN,
      },
      windiestDay: {
        date: windiest?.date ?? new Date(NaN),
        speed: windiest?.windMax ?? NaN,
      },
      longestDryStreak: longestDryStreak(rows),
      firstFrost: firstFrost(rows),
      lastFrost: lastFrost(rows),
      // Sunshine ≈ radiation_kJ_per_m2 / 1.36 ≈ kWh/m² × 0.74 hours per kWh on average
      // For Brașov the typical conversion is 1 kWh/m² ≈ 1 sun-hour, so just sum kWh.
      sunshineHours: sum(rows.map((r) => r.radiation / 3.6)),
    });
  }
  out.sort((a, b) => a.year - b.year);
  return out;
}

export function computeNormals(monthly: MonthlyAggregate[]): ClimateNormal[] {
  const byMonth = new Map<number, MonthlyAggregate[]>();
  for (const m of monthly) {
    if (!byMonth.has(m.month)) byMonth.set(m.month, []);
    byMonth.get(m.month)!.push(m);
  }
  const out: ClimateNormal[] = [];
  for (let mo = 0; mo < 12; mo++) {
    const rows = byMonth.get(mo) ?? [];
    out.push({
      month: mo,
      tMean: avg(rows.map((r) => r.tMean)),
      tMax: avg(rows.map((r) => r.tMaxAvg)),
      tMin: avg(rows.map((r) => r.tMinAvg)),
      precipitation: avg(rows.map((r) => r.precipitation)),
      windAvg: avg(rows.map((r) => r.windAvg)),
      radiation: avg(rows.map((r) => r.radiation)),
      hdd: avg(rows.map((r) => r.hdd)),
      cdd: avg(rows.map((r) => r.cdd)),
    });
  }
  return out;
}

export function buildDataset(
  station: string,
  daily: DailyRecord[],
): ClimateDataset {
  const monthly = aggregateMonthly(daily);
  const annual = aggregateAnnual(daily);
  const normals = computeNormals(monthly);
  const years = annual.map((a) => a.year);
  return {
    station,
    daily,
    monthly,
    annual,
    normals,
    startYear: Math.min(...years),
    endYear: Math.max(...years),
  };
}

/** Linear regression — returns slope (units per year) and intercept. */
export function linearRegression(
  points: { x: number; y: number }[],
): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  let sx = 0,
    sy = 0,
    sxx = 0,
    syy = 0,
    sxy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    syy += p.y * p.y;
    sxy += p.x * p.y;
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const ss_tot = syy - (sy * sy) / n;
  const ss_res = points.reduce(
    (acc, p) => acc + Math.pow(p.y - (slope * p.x + intercept), 2),
    0,
  );
  const r2 = 1 - ss_res / (ss_tot || 1);
  return { slope, intercept, r2 };
}

/** Compute percentile of a sorted-or-unsorted array. */
export function percentile(values: number[], p: number): number {
  const xs = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!xs.length) return NaN;
  const idx = (xs.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return xs[lo];
  return xs[lo] + (xs[hi] - xs[lo]) * (idx - lo);
}

/** Bin daily wind directions into 16 cardinal sectors with average speeds. */
export interface WindRoseBin {
  index: number;
  centerDeg: number;
  label: string;
  count: number;
  frequency: number;
  avgSpeed: number;
  speedClasses: { calm: number; light: number; moderate: number; strong: number };
}

export function computeWindRose(
  daily: DailyRecord[],
  filter?: (r: DailyRecord) => boolean,
): WindRoseBin[] {
  const rows = filter ? daily.filter(filter) : daily;
  const labels = [
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
  const bins: WindRoseBin[] = labels.map((label, i) => ({
    index: i,
    centerDeg: i * 22.5,
    label,
    count: 0,
    frequency: 0,
    avgSpeed: 0,
    speedClasses: { calm: 0, light: 0, moderate: 0, strong: 0 },
  }));
  let total = 0;
  for (const r of rows) {
    if (!Number.isFinite(r.windDirection) || !Number.isFinite(r.windMax))
      continue;
    const idx = Math.round((((r.windDirection % 360) + 360) % 360) / 22.5) % 16;
    bins[idx].count++;
    bins[idx].avgSpeed += r.windMax;
    if (r.windMax < 5) bins[idx].speedClasses.calm++;
    else if (r.windMax < 15) bins[idx].speedClasses.light++;
    else if (r.windMax < 30) bins[idx].speedClasses.moderate++;
    else bins[idx].speedClasses.strong++;
    total++;
  }
  for (const b of bins) {
    if (b.count > 0) {
      b.avgSpeed = b.avgSpeed / b.count;
      b.frequency = b.count / Math.max(1, total);
    }
  }
  return bins;
}
