import { useRef } from "react";
import { Panel } from "../components/Panel";
import { ExportToolbar, type CSVPayload } from "../components/ExportToolbar";
import { useHistoricalData } from "../hooks/useHistoricalData";
import { TemperatureHeatmap } from "../components/climate/TemperatureHeatmap";
import { MonthlyRangeChart } from "../components/climate/MonthlyRangeChart";
import { PrecipitationChart } from "../components/climate/PrecipitationChart";
import { WindRose } from "../components/climate/WindRose";
import { SolarRadiation } from "../components/climate/SolarRadiation";
import { ComparisonChart } from "../components/climate/ComparisonChart";
import { HDDChart } from "../components/climate/HDDChart";
import { TrendAnalysis } from "../components/climate/TrendAnalysis";
import { SummaryStats } from "../components/climate/SummaryStats";

export function ClimateHistory() {
  const { state, refetch, progress } = useHistoricalData();

  const heatmapRef = useRef<HTMLDivElement>(null);
  const monthlyRangeRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const precipRef = useRef<HTMLDivElement>(null);
  const radiationRef = useRef<HTMLDivElement>(null);
  const windRoseRef = useRef<HTMLDivElement>(null);
  const hddRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);

  if (state.status === "loading" && !state.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-solar">
          Fetching ten years of archive data
        </span>
        <div className="w-80 max-w-full">
          <div className="h-[2px] overflow-hidden bg-bg-tertiary">
            <div
              className="h-full bg-accent-solar transition-all duration-300"
              style={{
                width: `${(progress.fetched / progress.total) * 100}%`,
                boxShadow: "0 0 8px var(--accent-solar)",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
            <span>{progress.phase}</span>
            <span>
              {progress.fetched} / {progress.total}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error" && !state.data) {
    const isLimit = /limit|rate/i.test(state.error);
    return (
      <div className="flex flex-col items-start gap-3 border border-accent-red/40 bg-bg-secondary p-5">
        <div className="flex items-baseline gap-3">
          <span className="frame-id">[!]</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-red">
            Climate archive unreachable
          </span>
        </div>
        <div className="font-mono text-[12px] text-text-primary">
          Open-Meteo response: <span className="text-accent-red">{state.error}</span>
        </div>
        {isLimit && (
          <div className="border border-line bg-bg-tertiary p-3 font-mono text-[11px] text-text-secondary">
            Open-Meteo's free tier caps requests per IP per hour. Wait until the
            top of the next hour and click retry — once the data is fetched it's
            cached locally for 30 days, so this prompt only appears on the first
            successful load.
          </div>
        )}
        <button
          onClick={() => refetch(true)}
          className="border border-accent-solar px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-solar hover:bg-accent-solar/10"
        >
          [ retry ]
        </button>
      </div>
    );
  }

  if (!state.data) return null;
  const { brasov, poiana } = state.data;
  const poianaIsFallback = poiana === brasov;

  // ─── CSV builders for each panel ─────────────────────────────────────
  const heatmapCSV = (): CSVPayload => ({
    rows: brasov.daily.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      tMean_C: r.tMean,
      tMin_C: r.tMin,
      tMax_C: r.tMax,
    })),
    meta: {
      header: [
        `Daily mean temperature · ${brasov.station}`,
        `${brasov.startYear}–${brasov.endYear} · ERA5`,
      ],
    },
  });

  const monthlyRangeCSV = (): CSVPayload => ({
    rows: brasov.monthly.map((m) => {
      const po = poiana.monthly.find((p) => p.year === m.year && p.month === m.month);
      return {
        year: m.year,
        month: m.month + 1,
        brasov_tMean_C: m.tMean,
        brasov_tMaxAvg_C: m.tMaxAvg,
        brasov_tMinAvg_C: m.tMinAvg,
        poiana_tMean_C: po?.tMean ?? "",
      };
    }),
    meta: {
      header: [
        "Monthly temperature distribution",
        `Brașov vs Poiana · ${brasov.startYear}–${brasov.endYear}`,
      ],
    },
  });

  const comparisonCSV = (): CSVPayload => ({
    rows: brasov.normals.map((n) => {
      const po = poiana.normals.find((p) => p.month === n.month);
      return {
        month: n.month + 1,
        brasov_tMean_C: n.tMean,
        brasov_tMax_C: n.tMax,
        brasov_tMin_C: n.tMin,
        brasov_precip_mm: n.precipitation,
        poiana_tMean_C: po?.tMean ?? "",
        poiana_tMax_C: po?.tMax ?? "",
        poiana_tMin_C: po?.tMin ?? "",
        poiana_precip_mm: po?.precipitation ?? "",
      };
    }),
    meta: {
      header: ["Climate normals · Brașov 528 m vs Poiana 1020 m"],
    },
  });

  const precipCSV = (): CSVPayload => ({
    rows: brasov.monthly.map((m) => ({
      year: m.year,
      month: m.month + 1,
      precipitation_mm: m.precipitation,
      rain_mm: m.rain,
      snowfall_mm: m.snowfall,
      daysWithRain: m.daysWithRain,
      daysWithSnow: m.daysWithSnow,
    })),
    meta: { header: [`Monthly precipitation · ${brasov.station}`] },
  });

  const radiationCSV = (): CSVPayload => ({
    rows: brasov.normals.map((n) => ({
      month: n.month + 1,
      radiation_MJ_m2_day: n.radiation,
    })),
    meta: { header: ["Monthly mean shortwave radiation"] },
  });

  const windRoseCSV = (): CSVPayload => ({
    rows: brasov.daily.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      windDirection_deg: r.windDirection,
      windMax_kmh: r.windMax,
      gustMax_kmh: r.gustMax,
    })),
    meta: { header: [`Daily wind direction × speed · ${brasov.station}`] },
  });

  const hddCSV = (): CSVPayload => ({
    rows: brasov.normals.map((n) => ({
      month: n.month + 1,
      HDD_18C: n.hdd,
      CDD_18C: n.cdd,
    })),
    meta: { header: ["Heating / cooling degree days · base 18 °C"] },
  });

  const trendCSV = (): CSVPayload => ({
    rows: brasov.annual.map((a) => ({
      year: a.year,
      tMean_C: a.tMean,
      precip_mm: a.precipitation,
      HDD: a.hdd,
      CDD: a.cdd,
      daysWithFrost: a.daysWithFrost,
    })),
    meta: { header: ["Annual climate trends · linear regression"] },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border border-line bg-bg-secondary px-3 py-2">
        <div className="flex items-baseline gap-3">
          <span className="frame-id">[00]</span>
          <span className="frame-title">Climate Archive · {brasov.station}</span>
          <span className="frame-meta">
            {brasov.startYear}–{brasov.endYear} · {brasov.daily.length.toLocaleString()} days · ERA5
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
            {progress.phase}
          </span>
          <button
            onClick={() => refetch(true)}
            className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-secondary hover:border-accent-solar hover:text-accent-solar"
          >
            [ refresh ]
          </button>
        </div>
      </div>

      {poianaIsFallback && (
        <div className="border border-accent-solar/40 bg-bg-tertiary px-3 py-2 font-mono text-[11px] text-accent-solar">
          Note · Poiana Brașov archive missing from the multi-location response.
          Comparison panels re-use the Brașov dataset.
        </div>
      )}

      <SummaryStats annual={brasov.annual} />

      <Panel
        id="[01]"
        title="Temperature Heatmap"
        meta="Daily mean · 1 cell = 1 day"
        trailing={
          <ExportToolbar
            targetRef={heatmapRef}
            filename="climate-heatmap"
            csv={heatmapCSV}
          />
        }
      >
        <div ref={heatmapRef}>
          <TemperatureHeatmap
            daily={brasov.daily}
            startYear={brasov.startYear}
            endYear={brasov.endYear}
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel
          id="[02]"
          title="Monthly Range"
          meta="P25–P75 band · median line"
          trailing={
            <ExportToolbar
              targetRef={monthlyRangeRef}
              filename="climate-monthly-range"
              csv={monthlyRangeCSV}
            />
          }
        >
          <div ref={monthlyRangeRef}>
            <MonthlyRangeChart brasov={brasov.monthly} poiana={poiana.monthly} />
          </div>
        </Panel>
        <Panel
          id="[03]"
          title="Brașov vs Poiana"
          meta="528 m vs 1020 m"
          trailing={
            <ExportToolbar
              targetRef={comparisonRef}
              filename="climate-bv-vs-poiana"
              csv={comparisonCSV}
            />
          }
        >
          <div ref={comparisonRef}>
            <ComparisonChart
              brasovNormals={brasov.normals}
              poianaNormals={poiana.normals}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel
          id="[04]"
          title="Annual Precipitation"
          meta="rain + snow water-equivalent"
          trailing={
            <ExportToolbar
              targetRef={precipRef}
              filename="climate-precipitation"
              csv={precipCSV}
            />
          }
        >
          <div ref={precipRef}>
            <PrecipitationChart
              monthly={brasov.monthly}
              startYear={brasov.startYear}
              endYear={brasov.endYear}
            />
          </div>
        </Panel>
        <Panel
          id="[05]"
          title="Solar Radiation"
          meta="actual vs theoretical clear-sky"
          trailing={
            <ExportToolbar
              targetRef={radiationRef}
              filename="climate-radiation"
              csv={radiationCSV}
            />
          }
        >
          <div ref={radiationRef}>
            <SolarRadiation normals={brasov.normals} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          id="[06]"
          title="Wind Rose"
          meta="direction × speed"
          className="xl:col-span-2"
          trailing={
            <ExportToolbar
              targetRef={windRoseRef}
              filename="climate-wind-rose"
              csv={windRoseCSV}
            />
          }
        >
          <div ref={windRoseRef}>
            <WindRose
              daily={brasov.daily}
              startYear={brasov.startYear}
              endYear={brasov.endYear}
            />
          </div>
        </Panel>
        <Panel
          id="[07]"
          title="Heating Degree Days"
          meta="base 18°C"
          trailing={
            <ExportToolbar
              targetRef={hddRef}
              filename="climate-hdd"
              csv={hddCSV}
            />
          }
        >
          <div ref={hddRef}>
            <HDDChart normals={brasov.normals} />
          </div>
        </Panel>
      </div>

      <Panel
        id="[08]"
        title="Climate Trends"
        meta="linear regression · R²"
        trailing={
          <ExportToolbar
            targetRef={trendRef}
            filename="climate-trends"
            csv={trendCSV}
          />
        }
      >
        <div ref={trendRef}>
          <TrendAnalysis annual={brasov.annual} />
        </div>
      </Panel>
    </div>
  );
}
