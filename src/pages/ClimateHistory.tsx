import { Panel } from "../components/Panel";
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

      <Panel id="[01]" title="Temperature Heatmap" meta="Daily mean · 1 cell = 1 day">
        <TemperatureHeatmap
          daily={brasov.daily}
          startYear={brasov.startYear}
          endYear={brasov.endYear}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel id="[02]" title="Monthly Range" meta="P25–P75 band · median line">
          <MonthlyRangeChart brasov={brasov.monthly} poiana={poiana.monthly} />
        </Panel>
        <Panel id="[03]" title="Brașov vs Poiana" meta="528 m vs 1020 m">
          <ComparisonChart
            brasovNormals={brasov.normals}
            poianaNormals={poiana.normals}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel id="[04]" title="Annual Precipitation" meta="rain + snow water-equivalent">
          <PrecipitationChart
            monthly={brasov.monthly}
            startYear={brasov.startYear}
            endYear={brasov.endYear}
          />
        </Panel>
        <Panel id="[05]" title="Solar Radiation" meta="actual vs theoretical clear-sky">
          <SolarRadiation normals={brasov.normals} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          id="[06]"
          title="Wind Rose"
          meta="direction × speed"
          className="xl:col-span-2"
        >
          <WindRose
            daily={brasov.daily}
            startYear={brasov.startYear}
            endYear={brasov.endYear}
          />
        </Panel>
        <Panel id="[07]" title="Heating Degree Days" meta="base 18°C">
          <HDDChart normals={brasov.normals} />
        </Panel>
      </div>

      <Panel id="[08]" title="Climate Trends" meta="linear regression · R²">
        <TrendAnalysis annual={brasov.annual} />
      </Panel>
    </div>
  );
}
