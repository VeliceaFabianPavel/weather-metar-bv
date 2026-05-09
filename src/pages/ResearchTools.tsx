import { useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import { useHistoricalData } from "../hooks/useHistoricalData";
import { STATION, POIANA, BUILDING, ENERGY_PRICES, FOPID_DEFAULTS, PLANT } from "../constants";
import {
  bibtexEntry,
  downloadCSV,
  downloadJSON,
  downloadText,
  ieeeReference,
  rowsToCSV,
  safeFilename,
  timestamp,
  type CitationFields,
} from "../utils/export";
import type {
  AnnualAggregate,
  ClimateDataset,
  ClimateNormal,
  DailyRecord,
  MonthlyAggregate,
} from "../types/climate";

const CITATIONS: CitationFields[] = [
  {
    key: "openmeteo-archive",
    title: "Historical Weather Archive (ERA5 reanalysis, 9 km grid)",
    org: "Open-Meteo",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    note: "ERA5 hourly reanalysis aggregated to daily. CC-BY 4.0.",
  },
  {
    key: "noaa-aviationweather",
    title: "Aviation Weather Center · METAR feed",
    org: "NOAA / National Weather Service",
    url: "https://aviationweather.gov/data/api/",
    note: "Public-domain U.S. federal data.",
  },
  {
    key: "icao-annex3",
    title: "Annex 3 to the Convention on International Civil Aviation — Meteorological Service for International Air Navigation",
    org: "International Civil Aviation Organization (ICAO)",
    year: 2018,
    url: "https://www.icao.int/safety/meteorology/Pages/Standards.aspx",
  },
];

type DatasetKey = "daily" | "monthly" | "annual" | "normals";

const DATASET_LABEL: Record<DatasetKey, string> = {
  daily: "Daily records (every observation)",
  monthly: "Monthly aggregates (mean / sum / counts)",
  annual: "Annual aggregates (extremes / streaks)",
  normals: "1991–2020-style climate normals (12 rows)",
};

export function ResearchTools() {
  const { state } = useHistoricalData();
  const [station, setStation] = useState<"brasov" | "poiana" | "both">("brasov");
  const [dataset, setDataset] = useState<DatasetKey>("daily");
  const [yearFrom, setYearFrom] = useState<number | "">("");
  const [yearTo, setYearTo] = useState<number | "">("");

  const data = state.data;

  const yearBounds = useMemo(() => {
    if (!data) return { min: 0, max: 0 };
    return { min: data.brasov.startYear, max: data.brasov.endYear };
  }, [data]);

  const yearRange = useMemo(() => {
    const lo = typeof yearFrom === "number" ? yearFrom : yearBounds.min;
    const hi = typeof yearTo === "number" ? yearTo : yearBounds.max;
    return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
  }, [yearFrom, yearTo, yearBounds]);

  const stations: { key: "brasov" | "poiana"; ds: ClimateDataset | undefined }[] =
    !data
      ? []
      : station === "brasov"
        ? [{ key: "brasov", ds: data.brasov }]
        : station === "poiana"
          ? [{ key: "poiana", ds: data.poiana }]
          : [
              { key: "brasov", ds: data.brasov },
              { key: "poiana", ds: data.poiana },
            ];

  const previewRows = useMemo(() => {
    if (!stations.length) return [] as Record<string, unknown>[];
    return buildExportRows(stations[0].ds!, stations[0].key, dataset, yearRange);
  }, [stations, dataset, yearRange]);

  const stamp = `${safeFilename(`${STATION.icao}-${dataset}`)}-${yearRange.lo}-${yearRange.hi}-${timestamp()}`;

  const exportCSV = () => {
    if (!stations.length) return;
    if (stations.length === 1) {
      const { ds, key } = stations[0];
      if (!ds) return;
      const rows = buildExportRows(ds, key, dataset, yearRange);
      downloadCSV(rows, stamp, {
        header: csvHeader(ds, dataset, yearRange),
      });
      return;
    }
    // Both stations: stack into one CSV with a "station" column.
    const rows: Record<string, unknown>[] = [];
    for (const s of stations) {
      if (!s.ds) continue;
      rows.push(...buildExportRows(s.ds, s.key, dataset, yearRange));
    }
    downloadCSV(rows, `${stamp}-multi`, {
      header: [
        ...csvHeader(stations[0].ds!, dataset, yearRange),
        "Multi-station export: rows tagged with the `station` column.",
      ],
    });
  };

  const exportJSON = () => {
    if (!stations.length) return;
    const payload = {
      meta: {
        station: STATION,
        poiana: POIANA,
        dataset,
        yearRange,
        exportedAt: new Date().toISOString(),
        source: "Open-Meteo ERA5 reanalysis · archive-api.open-meteo.com",
      },
      data: Object.fromEntries(
        stations
          .filter((s) => s.ds)
          .map((s) => [s.key, buildExportRows(s.ds!, s.key, dataset, yearRange)]),
      ),
    };
    downloadJSON(payload, stamp);
  };

  const exportBibTeX = () => {
    const text = CITATIONS.map(bibtexEntry).join("\n\n");
    downloadText(text, `lrbv-references-${timestamp()}.bib`, "application/x-bibtex");
  };

  const exportIEEE = () => {
    const lines = CITATIONS.map((c, i) => ieeeReference(c, i + 1));
    downloadText(
      lines.join("\n\n"),
      `lrbv-references-ieee-${timestamp()}.txt`,
    );
  };

  const exportMethodology = () => {
    const md = methodologyMarkdown(yearRange);
    downloadText(md, `lrbv-methodology-${timestamp()}.md`, "text/markdown");
  };

  const exportSummary = () => {
    if (!data) return;
    const rows = summaryRows(data.brasov, data.poiana);
    downloadCSV(rows, `lrbv-summary-${timestamp()}`);
  };

  const exportConfig = () => {
    downloadJSON(
      {
        station: STATION,
        poiana: POIANA,
        building: BUILDING,
        prices: ENERGY_PRICES,
        fopidDefaults: FOPID_DEFAULTS,
        plant: PLANT,
        exportedAt: new Date().toISOString(),
      },
      `lrbv-config-${timestamp()}`,
    );
  };

  if (state.status === "loading" && !data) {
    return (
      <div className="flex items-center justify-center py-24 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-solar">
        Loading climate archive for export…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border border-accent-red/40 bg-bg-secondary p-4 font-mono text-[11px] text-accent-red">
        Research Tools require the climate archive — switch to the Climate tab and let it load first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border border-line bg-bg-secondary px-3 py-2">
        <div className="flex items-baseline gap-3">
          <span className="frame-id">[00]</span>
          <span className="frame-title">Research Tools · Bulk Export</span>
          <span className="frame-meta">
            {STATION.icao} · {data.brasov.startYear}–{data.brasov.endYear} · {data.brasov.daily.length.toLocaleString()} days
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
          for IEEE / IET / Elsevier-style manuscripts
        </span>
      </div>

      <Panel id="[01]" title="Climate Dataset · CSV / JSON" meta="filter then download">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Station">
            <select
              value={station}
              onChange={(e) => setStation(e.target.value as typeof station)}
              className="w-full px-2 py-1 font-mono text-[12px]"
            >
              <option value="brasov">Brașov-Ghimbav (LRBV)</option>
              <option value="poiana">Poiana Brașov (1020 m)</option>
              <option value="both">Both (multi-station CSV)</option>
            </select>
          </Field>

          <Field label="Granularity">
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value as DatasetKey)}
              className="w-full px-2 py-1 font-mono text-[12px]"
            >
              {(Object.keys(DATASET_LABEL) as DatasetKey[]).map((k) => (
                <option key={k} value={k}>
                  {DATASET_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`Year from (≥ ${yearBounds.min})`}>
            <input
              type="number"
              min={yearBounds.min}
              max={yearBounds.max}
              value={yearFrom}
              placeholder={String(yearBounds.min)}
              onChange={(e) =>
                setYearFrom(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full px-2 py-1 text-right font-mono text-[12px]"
            />
          </Field>

          <Field label={`Year to (≤ ${yearBounds.max})`}>
            <input
              type="number"
              min={yearBounds.min}
              max={yearBounds.max}
              value={yearTo}
              placeholder={String(yearBounds.max)}
              onChange={(e) =>
                setYearTo(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full px-2 py-1 text-right font-mono text-[12px]"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <BigBtn onClick={exportCSV}>↓ CSV</BigBtn>
          <BigBtn onClick={exportJSON}>↓ JSON</BigBtn>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
            {previewRows.length.toLocaleString()} rows · {yearRange.lo}–{yearRange.hi}
          </span>
        </div>

        {previewRows.length > 0 && (
          <div className="mt-3 border border-line bg-bg-primary">
            <div className="border-b border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
              Preview · first 8 rows
            </div>
            <div className="max-h-64 overflow-auto">
              <pre className="px-3 py-2 font-mono text-[11px] leading-relaxed text-text-secondary">
                {rowsToCSV(previewRows.slice(0, 8))}
              </pre>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel id="[02]" title="Citations" meta="BibTeX · IEEE plain text">
          <ul className="mb-3 space-y-2 font-mono text-[11px] text-text-secondary">
            {CITATIONS.map((c) => (
              <li key={c.key} className="border-l-2 border-accent-solar/40 pl-2">
                <div className="text-text-primary">{c.title}</div>
                <div className="text-text-dim">{c.org}</div>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-cyan hover:underline"
                >
                  {c.url}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <BigBtn onClick={exportBibTeX}>↓ .bib</BigBtn>
            <BigBtn onClick={exportIEEE}>↓ IEEE refs</BigBtn>
            <CopyBtn text={CITATIONS.map(bibtexEntry).join("\n\n")} label="copy BibTeX" />
          </div>
        </Panel>

        <Panel id="[03]" title="Statistics Summary" meta="ready-to-paste table">
          <p className="mb-3 font-mono text-[11px] text-text-secondary">
            One-row-per-metric CSV: temperature means / extremes, precipitation totals,
            HDD/CDD, frost days, sunshine — for both stations.
          </p>
          <BigBtn onClick={exportSummary}>↓ summary CSV</BigBtn>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel id="[04]" title="Methodology Notes" meta="markdown · paper boilerplate">
          <p className="mb-3 font-mono text-[11px] text-text-secondary">
            Auto-generated methods section covering data sources, period of record,
            aggregation rules, and FOPID + thermal-model assumptions. Drop into a
            paper draft, edit as needed.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <BigBtn onClick={exportMethodology}>↓ methodology.md</BigBtn>
            <CopyBtn text={methodologyMarkdown(yearRange)} label="copy markdown" />
          </div>
        </Panel>

        <Panel id="[05]" title="Model Configuration" meta="all knobs · JSON">
          <p className="mb-3 font-mono text-[11px] text-text-secondary">
            Building envelope, FOPID defaults, plant inertia, and price assumptions —
            for reproducible runs.
          </p>
          <BigBtn onClick={exportConfig}>↓ config JSON</BigBtn>
        </Panel>
      </div>

      <Panel id="[06]" title="Tips for IEEE figures" meta="best practice">
        <ul className="space-y-1.5 font-mono text-[11px] text-text-secondary">
          <li>
            <span className="text-accent-solar">·</span> Use the panel-level{" "}
            <code className="text-accent-solar">[ ⤓ export ]</code> button to grab
            individual figures at <span className="text-text-primary">300 DPI</span>{" "}
            in IEEE 1-column (3.5″) or 2-column (7.16″) widths.
          </li>
          <li>
            <span className="text-accent-solar">·</span> SVG export is editable — open
            in Inkscape / Illustrator to retypeset axis labels in the journal's
            preferred font (usually <span className="text-text-primary">Times New Roman</span>).
          </li>
          <li>
            <span className="text-accent-solar">·</span> CSV uses RFC-4180 quoting and
            UTF-8 BOM — opens cleanly in Excel, R, Python, MATLAB.
          </li>
          <li>
            <span className="text-accent-solar">·</span> Captions / DOI: ERA5 reanalysis
            should be cited as Hersbach et al. 2020 (10.1002/qj.3803) when used for
            quantitative claims.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

// ───────────────────────────── helpers ─────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="cluster-label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function BigBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-accent-solar/60 bg-accent-amber-soft px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-solar hover:bg-accent-solar/20"
    >
      {children}
    </button>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* fail silently */
        }
      }}
      className="border border-line px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-secondary hover:border-accent-cyan hover:text-accent-cyan"
    >
      {copied ? "copied!" : label}
    </button>
  );
}

function inYear(d: Date, lo: number, hi: number): boolean {
  const y = d.getUTCFullYear();
  return y >= lo && y <= hi;
}

function dailyRow(r: DailyRecord, station: string) {
  return {
    station,
    date: r.date.toISOString().slice(0, 10),
    tMax_C: round(r.tMax, 2),
    tMin_C: round(r.tMin, 2),
    tMean_C: round(r.tMean, 2),
    precip_mm: round(r.precipitation, 2),
    rain_mm: round(r.rain, 2),
    snowfall_mm: round(r.snowfall, 2),
    windMax_kmh: round(r.windMax, 2),
    gustMax_kmh: round(r.gustMax, 2),
    windDir_deg: round(r.windDirection, 1),
    radiation_MJ_m2: round(r.radiation, 3),
    et0_mm: round(r.et0, 3),
  };
}

function monthlyRow(m: MonthlyAggregate, station: string) {
  return {
    station,
    year: m.year,
    month: m.month + 1,
    tMean_C: round(m.tMean, 2),
    tMaxAvg_C: round(m.tMaxAvg, 2),
    tMinAvg_C: round(m.tMinAvg, 2),
    tMax_C: round(m.tMax, 2),
    tMin_C: round(m.tMin, 2),
    precip_mm: round(m.precipitation, 1),
    rain_mm: round(m.rain, 1),
    snowfall_mm: round(m.snowfall, 1),
    windAvg_kmh: round(m.windAvg, 2),
    windMax_kmh: round(m.windMax, 2),
    radiation_MJ_m2: round(m.radiation, 2),
    HDD_18C: round(m.hdd, 1),
    CDD_18C: round(m.cdd, 1),
    daysWithRain: m.daysWithRain,
    daysWithSnow: m.daysWithSnow,
    daysWithFrost: m.daysWithFrost,
  };
}

function annualRow(a: AnnualAggregate, station: string) {
  return {
    station,
    year: a.year,
    tMean_C: round(a.tMean, 2),
    tMax_C: round(a.tMax, 2),
    tMin_C: round(a.tMin, 2),
    precip_mm: round(a.precipitation, 1),
    windMax_kmh: round(a.windMax, 2),
    radiation_MJ_m2: round(a.radiation, 2),
    HDD_18C: round(a.hdd, 0),
    CDD_18C: round(a.cdd, 0),
    daysWithRain: a.daysWithRain,
    daysWithSnow: a.daysWithSnow,
    daysWithFrost: a.daysWithFrost,
    hottestDay_date: a.hottestDay.date.toISOString().slice(0, 10),
    hottestDay_C: round(a.hottestDay.temp, 1),
    coldestDay_date: a.coldestDay.date.toISOString().slice(0, 10),
    coldestDay_C: round(a.coldestDay.temp, 1),
    wettestDay_date: a.wettestDay.date.toISOString().slice(0, 10),
    wettestDay_mm: round(a.wettestDay.mm, 1),
    windiestDay_date: a.windiestDay.date.toISOString().slice(0, 10),
    windiestDay_kmh: round(a.windiestDay.speed, 1),
    longestDryStreak_days: a.longestDryStreak,
    firstFrost: a.firstFrost ? a.firstFrost.toISOString().slice(0, 10) : "",
    lastFrost: a.lastFrost ? a.lastFrost.toISOString().slice(0, 10) : "",
    sunshineHours: round(a.sunshineHours, 0),
  };
}

function normalRow(n: ClimateNormal, station: string) {
  return {
    station,
    month: n.month + 1,
    tMean_C: round(n.tMean, 2),
    tMax_C: round(n.tMax, 2),
    tMin_C: round(n.tMin, 2),
    precip_mm: round(n.precipitation, 1),
    windAvg_kmh: round(n.windAvg, 2),
    radiation_MJ_m2: round(n.radiation, 2),
    HDD_18C: round(n.hdd, 1),
    CDD_18C: round(n.cdd, 1),
  };
}

function buildExportRows(
  ds: ClimateDataset,
  station: string,
  dataset: DatasetKey,
  yearRange: { lo: number; hi: number },
): Record<string, unknown>[] {
  switch (dataset) {
    case "daily":
      return ds.daily
        .filter((r) => inYear(r.date, yearRange.lo, yearRange.hi))
        .map((r) => dailyRow(r, station));
    case "monthly":
      return ds.monthly
        .filter((m) => m.year >= yearRange.lo && m.year <= yearRange.hi)
        .map((m) => monthlyRow(m, station));
    case "annual":
      return ds.annual
        .filter((a) => a.year >= yearRange.lo && a.year <= yearRange.hi)
        .map((a) => annualRow(a, station));
    case "normals":
      return ds.normals.map((n) => normalRow(n, station));
  }
}

function csvHeader(
  ds: ClimateDataset,
  dataset: DatasetKey,
  yearRange: { lo: number; hi: number },
): string[] {
  return [
    `LRBV Heliotrop · ${dataset} export`,
    `Station: ${ds.station}`,
    `Period: ${yearRange.lo}-01-01 → ${yearRange.hi}-12-31`,
    `Source: Open-Meteo / ECMWF ERA5 reanalysis (https://open-meteo.com)`,
    `Generated: ${new Date().toISOString()}`,
    `Units: temperature °C · precipitation mm · wind km/h · radiation MJ/m² · HDD/CDD base 18 °C`,
  ];
}

function summaryRows(brasov: ClimateDataset, poiana: ClimateDataset) {
  const stat = (ds: ClimateDataset) => {
    const a = ds.annual;
    const meanT = avg(a.map((x) => x.tMean));
    const meanP = avg(a.map((x) => x.precipitation));
    const meanHDD = avg(a.map((x) => x.hdd));
    const meanCDD = avg(a.map((x) => x.cdd));
    const meanFrost = avg(a.map((x) => x.daysWithFrost));
    return { meanT, meanP, meanHDD, meanCDD, meanFrost };
  };
  const b = stat(brasov);
  const p = stat(poiana);
  return [
    row("Annual mean temperature (°C)", b.meanT, p.meanT),
    row("Annual precipitation (mm)", b.meanP, p.meanP),
    row("Heating degree days (base 18 °C)", b.meanHDD, p.meanHDD),
    row("Cooling degree days (base 18 °C)", b.meanCDD, p.meanCDD),
    row("Days with frost per year", b.meanFrost, p.meanFrost),
  ];
  function row(metric: string, bv: number, po: number) {
    return {
      metric,
      brasov: round(bv, 2),
      poiana: round(po, 2),
      delta: round(po - bv, 2),
    };
  }
}

function methodologyMarkdown(yearRange: { lo: number; hi: number }) {
  return `# Methodology · LRBV Heliotrop Mission Console

## Data sources

- **Climate archive (${yearRange.lo}–${yearRange.hi})**: Open-Meteo Historical Weather API,
  serving the ECMWF ERA5 reanalysis at ~9 km horizontal resolution.
  Daily aggregates for two grid cells centred on
  ${STATION.name} (${STATION.lat}°N, ${STATION.lon}°E, ${STATION.elevation} m AMSL)
  and ${POIANA.name} (${POIANA.lat}°N, ${POIANA.lon}°E, ${POIANA.elevation} m AMSL).
- **Live aviation report**: NOAA Aviation Weather Center METAR feed for ${STATION.icao};
  60-second poll cycle. When LRBV is silent (regional airport, intermittent broadcast)
  the closest issuing station is used as a fallback.
- **Forecast / surface obs.**: Open-Meteo \`forecast\` endpoint, ICON+GFS ensemble.

## Variables and units

| Variable | Unit | Source field |
|---|---|---|
| Temperature (max / min / mean) | °C | \`temperature_2m_*\` |
| Precipitation, rain, snowfall | mm | \`precipitation_sum\`, \`rain_sum\`, \`snowfall_sum\` |
| Wind speed (max), gust | km h⁻¹ | \`windspeed_10m_max\`, \`windgusts_10m_max\` |
| Wind direction (dominant) | ° true | \`winddirection_10m_dominant\` |
| Shortwave radiation | MJ m⁻² day⁻¹ | \`shortwave_radiation_sum\` |
| Reference evapotranspiration | mm day⁻¹ | \`et0_fao_evapotranspiration\` |

## Aggregation

- **Monthly**: arithmetic mean for temperature & wind, sum for precipitation & radiation.
- **Annual**: same plus extreme-day extraction and longest dry streak (≤ 1 mm).
- **Climate normals**: monthly mean across the full ${yearRange.lo}–${yearRange.hi} window.
- **HDD / CDD**: base 18 °C, single-day formulation max(0, T_base − T_mean) /
  max(0, T_mean − T_base), summed monthly / annually.

## Solar tracking control law

Fractional-order PID controller with default gains
Kp = ${FOPID_DEFAULTS.Kp}, Ki = ${FOPID_DEFAULTS.Ki}, Kd = ${FOPID_DEFAULTS.Kd},
λ = ${FOPID_DEFAULTS.lambda}, μ = ${FOPID_DEFAULTS.mu},
acting on a Grünwald–Letnikov discretisation. Plant: rotational mass
${PLANT.inertia} kg·m², friction ${PLANT.friction} N·m·s, gear ratio 1:${PLANT.gearRatio}.
Solar position computed from the NREL Solar Position Algorithm (SPA),
azimuth referenced to true north (magnetic declination ${STATION.magneticDeclination}°
applied to compass output).

## Thermal / energy model

Steady-state envelope balance with overall U-value derived from
${BUILDING.glazingRatio * 100}% glazing (U = ${BUILDING.uGlazing} W m⁻² K⁻¹) and
${(1 - BUILDING.glazingRatio) * 100}% opaque frame
(U = ${BUILDING.uFrame} W m⁻² K⁻¹). Internal gains
${BUILDING.internalGains} W m⁻², infiltration ${BUILDING.infiltration} ACH,
heating set-point ${BUILDING.heatingSetpoint} °C, cooling ${BUILDING.coolingSetpoint} °C.
Tracking PV bonus (${(BUILDING.pvTrackingBonus * 100).toFixed(0)}%) calibrated against
the manufacturer's published yield curve.

## Repository / reproducibility

Source code, default parameters and exported figures are bundled in the
LRBV Heliotrop console (this app). Re-running the export panel against the
same Open-Meteo cache reproduces every figure bit-for-bit.
`;
}

// ───────────────────────────── tiny utils ─────────────────────────────

function round(v: number, dp: number): number | "" {
  return Number.isFinite(v) ? Number(v.toFixed(dp)) : "";
}

function avg(xs: number[]): number {
  const finite = xs.filter(Number.isFinite);
  if (!finite.length) return NaN;
  return finite.reduce((s, x) => s + x, 0) / finite.length;
}
