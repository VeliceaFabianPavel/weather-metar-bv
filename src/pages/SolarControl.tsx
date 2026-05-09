import { useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "../components/Panel";
import { MetricCard } from "../components/MetricCard";
import { useSolarPosition } from "../hooks/useSolarPosition";
import { useFOPIDSimulation } from "../hooks/useFOPIDSimulation";
import { useWeather } from "../hooks/useWeather";
import { STATION } from "../constants";
import { SolarRibbon } from "../components/solar/SolarRibbon";
import { SolarTrajectory } from "../components/solar/SolarTrajectory";
import { FOPIDControls } from "../components/solar/FOPIDControls";
import { SimulationCharts } from "../components/solar/SimulationCharts";
import { StepResponse } from "../components/solar/StepResponse";
import { DisturbancePanel } from "../components/solar/DisturbancePanel";
import {
  formatDuration,
  formatLocalTime,
  formatSigned,
  pad,
  compassPoint,
} from "../utils/format";

export function SolarControl() {
  const { now, position } = useSolarPosition(STATION.lat, STATION.lon);
  const { state: weatherState } = useWeather();
  const [running, setRunning] = useState(true);

  const targetRef = useRef(position.azimuth);
  useEffect(() => {
    targetRef.current = position.azimuth;
  }, [position.azimuth]);

  const sim = useFOPIDSimulation({
    getTarget: () => targetRef.current,
    windSpeed: weatherState.data?.current.windSpeed ?? 0,
    enabled: running,
  });

  const last = sim.history[sim.history.length - 1];
  const houseAzimuth = last?.current ?? 180;
  const classicalAzimuth = sim.compareMode
    ? sim.classicalHistory[sim.classicalHistory.length - 1]?.current
    : undefined;

  const sunBelowHorizon = position.elevation <= 0;

  const sunriseLabel = useMemo(
    () => formatLocalTime(position.sunrise, STATION.timezone),
    [position.sunrise],
  );
  const sunsetLabel = useMemo(
    () => formatLocalTime(position.sunset, STATION.timezone),
    [position.sunset],
  );

  return (
    <div className="space-y-3">
      {/* Top metric strip */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="Solar Azimuth"
          value={pad(Math.round(position.azimuth), 3)}
          unit="° T"
          accent="solar"
          hint={compassPoint(position.azimuth)}
        />
        <MetricCard
          label="Solar Elevation"
          value={position.elevation.toFixed(1)}
          unit="°"
          accent={sunBelowHorizon ? "neutral" : "solar"}
          hint={sunBelowHorizon ? "Below horizon" : `Zenith ${position.zenith.toFixed(1)}°`}
        />
        <MetricCard
          label="House Heading"
          value={pad(Math.round(houseAzimuth), 3)}
          unit="° T"
          accent="cyan"
          hint={`Δ ${formatSigned(sim.metrics.currentError, 2, "°")}`}
        />
        <MetricCard
          label="Daylight"
          value={formatDuration(position.dayLength)}
          accent="solar"
          size="md"
          hint={`${sunriseLabel} → ${sunsetLabel}`}
        />
        <MetricCard
          label="Declination"
          value={formatSigned(position.declination, 2)}
          unit="°"
          accent="purple"
          size="md"
          hint={`HA ${formatSigned(position.hourAngle, 1, "°")}`}
        />
        <MetricCard
          label="Equation of Time"
          value={formatSigned(position.equationOfTime, 1)}
          unit="min"
          accent="purple"
          size="md"
          hint={`Solar noon ${formatLocalTime(position.solarNoon, STATION.timezone)}`}
        />
      </div>

      {/* Main row: alignment tape + day trajectory + controls */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Panel
          id="[01]"
          title="Azimuth Tape · Sun vs House"
          meta="Live alignment · 0–360° heading scale"
          variant="cyan"
          trailing={
            <button
              onClick={() => setRunning((r) => !r)}
              className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary hover:border-accent-solar hover:text-accent-solar"
            >
              [ {running ? "pause" : "resume"} ]
            </button>
          }
          className="xl:col-span-8"
        >
          <SolarRibbon
            sunAzimuth={position.azimuth}
            houseAzimuth={houseAzimuth}
            classicalAzimuth={classicalAzimuth}
            sunElevation={position.elevation}
          />
        </Panel>

        <Panel
          id="[02]"
          title="FOPID Tuner"
          meta="Live coefficients"
          className="xl:col-span-4"
        >
          <FOPIDControls
            params={sim.params}
            onChange={sim.setParams}
            onReset={sim.reset}
          />
        </Panel>
      </div>

      <Panel
        id="[03]"
        title="Today's Solar Window"
        meta={`${now.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · LRBV · elevation ▬ · azimuth ╌`}
      >
        <SolarTrajectory date={now} />
      </Panel>

      {/* Compare mode bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-bg-secondary px-3 py-2">
        <div className="flex items-baseline gap-3">
          <span className="frame-id">[04]</span>
          <span className="frame-title">Comparison Mode</span>
          <span className="frame-meta">classical PID baseline · λ=μ=1</span>
        </div>
        <label className="flex items-center gap-2 font-mono text-[11px]">
          <input
            type="checkbox"
            checked={sim.compareMode}
            onChange={(e) => sim.setCompareMode(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-accent-solar"
          />
          <span className="text-text-secondary">
            {sim.compareMode ? "ON · running parallel loop" : "OFF"}
          </span>
        </label>
      </div>

      <SimulationCharts
        history={sim.history}
        classicalHistory={sim.classicalHistory}
        compareMode={sim.compareMode}
      />

      {/* Performance */}
      <Panel
        id="[05]"
        title="Performance Metrics"
        meta="Computed over last 2 simulated minutes"
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Current Error"
            value={formatSigned(sim.metrics.currentError, 2)}
            unit="°"
            accent="cyan"
            size="md"
          />
          <MetricCard
            label="Peak Overshoot"
            value={sim.metrics.peakOvershoot.toFixed(1)}
            unit="%"
            accent="cyan"
            size="md"
          />
          <MetricCard
            label="Settling Time"
            value={
              sim.metrics.settlingTime !== null
                ? sim.metrics.settlingTime.toFixed(1)
                : "—"
            }
            unit="s"
            accent="cyan"
            size="md"
          />
          <MetricCard
            label="SS Error"
            value={sim.metrics.steadyStateError.toFixed(2)}
            unit="°"
            accent="cyan"
            size="md"
          />
          <MetricCard
            label="RMS Error"
            value={sim.metrics.rms.toFixed(2)}
            unit="°"
            accent="cyan"
            size="md"
          />
          <MetricCard
            label="Energy ∝"
            value={(sim.metrics.energyConsumed / 1000).toFixed(1)}
            unit="kJ"
            accent="cyan"
            size="md"
          />
        </div>
        {sim.compareMode && (
          <div className="mt-3 border-t border-line pt-3">
            <div className="label-tech mb-2">Classical PID baseline</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <Compare
                label="Error"
                a={sim.metrics.currentError}
                b={sim.classicalMetrics.currentError}
                unit="°"
                decimals={2}
              />
              <Compare
                label="Overshoot"
                a={sim.metrics.peakOvershoot}
                b={sim.classicalMetrics.peakOvershoot}
                unit="%"
                decimals={1}
                lowerIsBetter
              />
              <Compare
                label="Settling"
                a={sim.metrics.settlingTime ?? Infinity}
                b={sim.classicalMetrics.settlingTime ?? Infinity}
                unit="s"
                decimals={1}
                lowerIsBetter
              />
              <Compare
                label="SS Err"
                a={sim.metrics.steadyStateError}
                b={sim.classicalMetrics.steadyStateError}
                unit="°"
                decimals={2}
                lowerIsBetter
              />
              <Compare
                label="RMS"
                a={sim.metrics.rms}
                b={sim.classicalMetrics.rms}
                unit="°"
                decimals={2}
                lowerIsBetter
              />
              <Compare
                label="Energy"
                a={sim.metrics.energyConsumed / 1000}
                b={sim.classicalMetrics.energyConsumed / 1000}
                unit="kJ"
                decimals={1}
                lowerIsBetter
              />
            </div>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          id="[06]"
          title="Step Response Test"
          meta="Synthetic step input · open-loop run"
          className="xl:col-span-2"
        >
          <StepResponse params={sim.params} compareMode={sim.compareMode} />
        </Panel>

        <Panel id="[07]" title="Disturbance Injection">
          <DisturbancePanel onInject={sim.injectDisturbance} events={sim.disturbances} />
        </Panel>
      </div>
    </div>
  );
}

function Compare({
  label,
  a,
  b,
  unit,
  decimals = 1,
  lowerIsBetter,
}: {
  label: string;
  a: number;
  b: number;
  unit: string;
  decimals?: number;
  lowerIsBetter?: boolean;
}) {
  const aBetter = lowerIsBetter ? Math.abs(a) < Math.abs(b) : Math.abs(a) > Math.abs(b);
  return (
    <div className="border border-line bg-bg-tertiary px-2.5 py-2">
      <div className="cluster-label">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span
          className="font-mono text-sm tabular"
          style={{ color: aBetter ? "var(--accent-cyan)" : "var(--text-secondary)" }}
        >
          F:{Number.isFinite(a) ? a.toFixed(decimals) : "—"}
        </span>
        <span
          className="font-mono text-sm tabular"
          style={{
            color: !aBetter ? "var(--accent-solar)" : "var(--text-secondary)",
          }}
        >
          P:{Number.isFinite(b) ? b.toFixed(decimals) : "—"}
        </span>
      </div>
      <div className="text-[9px] uppercase tracking-[0.18em] text-text-dim">{unit}</div>
    </div>
  );
}
