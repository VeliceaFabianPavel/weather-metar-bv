import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FOPIDParams, SimulationSample } from "../../types/controller";
import { computeMetrics, fopidControl, plantStep, shortestAngularError } from "../../utils/fopid";
import { PLANT } from "../../constants";

interface StepResponseProps {
  params: FOPIDParams;
  /** When set, also runs a classical PID branch (λ=μ=1). */
  compareMode?: boolean;
  step?: number;
}

interface RunResult {
  data: SimulationSample[];
  classical: SimulationSample[];
}

function runStep(params: FOPIDParams, step: number, dt = 0.05, durationSec = 15): RunResult {
  const samples: SimulationSample[] = [];
  const classical: SimulationSample[] = [];
  const errs: number[] = [];
  const cErrs: number[] = [];
  let angle = 0;
  let velocity = 0;
  let cAngle = 0;
  let cVelocity = 0;
  const steps = Math.round(durationSec / dt);
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    const error = shortestAngularError(step, angle);
    errs.push(error);
    if (errs.length > 80) errs.shift();
    const ctl = fopidControl(errs, params, dt);
    const next = plantStep(angle, velocity, ctl.output, PLANT, dt);
    angle = next.angle;
    velocity = next.velocity;
    samples.push({
      t,
      target: step,
      current: angle,
      error,
      output: ctl.output,
      P: ctl.P,
      I: ctl.I,
      D: ctl.D,
      velocity,
    });

    const cError = shortestAngularError(step, cAngle);
    cErrs.push(cError);
    if (cErrs.length > 80) cErrs.shift();
    const cCtl = fopidControl(cErrs, { ...params, lambda: 1, mu: 1 }, dt);
    const cNext = plantStep(cAngle, cVelocity, cCtl.output, PLANT, dt);
    cAngle = cNext.angle;
    cVelocity = cNext.velocity;
    classical.push({
      t,
      target: step,
      current: cAngle,
      error: cError,
      output: cCtl.output,
      P: cCtl.P,
      I: cCtl.I,
      D: cCtl.D,
      velocity: cVelocity,
    });
  }
  return { data: samples, classical };
}

export function StepResponse({
  params,
  compareMode = false,
  step = 90,
}: StepResponseProps) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [stepValue, setStepValue] = useState(step);

  const runNow = () => setResult(runStep(params, stepValue));

  const merged = result
    ? result.data.map((s, i) => ({
        ...s,
        classical: result.classical[i].current,
      }))
    : [];

  const fopidM = result
    ? computeMetrics({
        errors: result.data.map((s) => s.error),
        outputs: result.data.map((s) => s.output),
        dt: 0.05,
      })
    : null;
  const classicalM =
    result && compareMode
      ? computeMetrics({
          errors: result.classical.map((s) => s.error),
          outputs: result.classical.map((s) => s.output),
          dt: 0.05,
        })
      : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={runNow}
          className="border border-accent-solar bg-bg-tertiary px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-solar hover:bg-accent-solar/10"
        >
          ▶ Run Step Test
        </button>
        <div className="flex items-center gap-2">
          <span className="label-tech">Step (deg)</span>
          <input
            type="number"
            value={stepValue}
            min={5}
            max={180}
            step={5}
            onChange={(e) => setStepValue(parseFloat(e.target.value) || 90)}
            className="w-20 px-2 py-1 font-mono text-sm"
          />
        </div>
      </div>

      {result ? (
        <>
          <div className="h-[260px] rounded border border-border-default bg-bg-secondary p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={merged} margin={{ top: 8, right: 14, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
                <XAxis
                  dataKey="t"
                  tickFormatter={(v) => `${(+v).toFixed(0)}s`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tickFormatter={(v) => `${v}°`} tick={{ fontSize: 10 }} width={42} />
                <ReferenceLine y={stepValue} stroke="var(--accent-solar)" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ stroke: "var(--accent-cyan)", strokeDasharray: 4 }}
                  labelFormatter={(v) => `t = ${(+v).toFixed(2)} s`}
                  formatter={(v: number) => [`${v.toFixed(2)}°`]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="FOPID"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {compareMode && (
                  <Line
                    type="monotone"
                    dataKey="classical"
                    name="Classical PID"
                    stroke="var(--accent-purple)"
                    strokeWidth={1.6}
                    strokeDasharray="2 2"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {fopidM && (
              <>
                <Stat label="Peak overshoot" value={`${fopidM.peakOvershoot.toFixed(1)} %`} accent="cyan" />
                <Stat
                  label="Settling time"
                  value={
                    fopidM.settlingTime !== null ? `${fopidM.settlingTime.toFixed(1)} s` : "—"
                  }
                  accent="cyan"
                />
                <Stat label="SS error" value={`${fopidM.steadyStateError.toFixed(2)}°`} accent="cyan" />
                <Stat label="Energy ∝" value={fopidM.energy.toFixed(0)} accent="cyan" />
              </>
            )}
            {classicalM && (
              <>
                <Stat
                  label="PID overshoot"
                  value={`${classicalM.peakOvershoot.toFixed(1)} %`}
                  accent="purple"
                />
                <Stat
                  label="PID settling"
                  value={
                    classicalM.settlingTime !== null
                      ? `${classicalM.settlingTime.toFixed(1)} s`
                      : "—"
                  }
                  accent="purple"
                />
                <Stat
                  label="PID SS err"
                  value={`${classicalM.steadyStateError.toFixed(2)}°`}
                  accent="purple"
                />
                <Stat label="PID Energy ∝" value={classicalM.energy.toFixed(0)} accent="purple" />
              </>
            )}
          </div>
        </>
      ) : (
        <div className="border border-dashed border-line p-5 text-center font-mono text-[11px] text-text-secondary">
          Press <span className="text-accent-solar">▶ Run Step Test</span> to
          evaluate response to a {stepValue}° step.
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "cyan",
}: {
  label: string;
  value: string;
  accent?: "cyan" | "purple" | "solar";
}) {
  const color =
    accent === "cyan"
      ? "var(--accent-cyan)"
      : accent === "purple"
        ? "#a78bfa"
        : "var(--accent-solar)";
  return (
    <div className="border border-line bg-bg-tertiary px-2.5 py-2">
      <div className="cluster-label">{label}</div>
      <div className="mt-1 font-mono text-base tabular" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
