import { useMemo } from "react";
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
import type { SimulationSample } from "../../types/controller";

interface SimulationChartsProps {
  history: SimulationSample[];
  classicalHistory?: SimulationSample[];
  compareMode: boolean;
}

export function SimulationCharts({
  history,
  classicalHistory,
  compareMode,
}: SimulationChartsProps) {
  // Sub-sample for chart perf (every 4th sample → ~25 fps history)
  const data = useMemo(
    () =>
      history
        .filter((_, i) => i % 4 === 0)
        .map((s) => ({
          t: s.t,
          target: s.target,
          current: s.current,
          error: s.error,
          P: s.P,
          I: s.I,
          D: s.D,
          output: s.output,
          classicalCurrent: s.classicalCurrent,
          classicalError: s.classicalError,
        })),
    [history],
  );

  // Use the most recent ~30 simulated seconds (300 samples × 0.4 s decimation = 120)
  const tail = data.slice(-300);

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {/* Tracking chart */}
      <div className="rounded border border-border-default bg-bg-secondary p-2">
        <div className="mb-1 flex items-baseline justify-between px-2 pt-1">
          <span className="label-tech-sm">Tracking · Target vs Actual</span>
          <span className="font-mono text-[10px] text-text-dim">
            last {tail.length ? Math.round(tail[tail.length - 1].t - tail[0].t) : 0}s
          </span>
        </div>
        <div className="h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tail} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
              <XAxis
                dataKey="t"
                tickFormatter={(v) => `${v.toFixed(0)}s`}
                tick={{ fontSize: 10 }}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                domain={[0, 360]}
                tickFormatter={(v) => `${v}°`}
                width={42}
              />
              <Tooltip
                cursor={{ stroke: "var(--accent-solar)", strokeDasharray: 4 }}
                labelFormatter={(v) => `t = ${(+v).toFixed(1)} s`}
                formatter={(v: number, n: string) => [`${v.toFixed(1)}°`, n]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Line
                type="monotone"
                dataKey="target"
                name="Target"
                stroke="var(--accent-solar)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
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
                  dataKey="classicalCurrent"
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
      </div>

      {/* Error chart */}
      <div className="rounded border border-border-default bg-bg-secondary p-2">
        <div className="mb-1 flex items-baseline justify-between px-2 pt-1">
          <span className="label-tech-sm">Error (deg)</span>
          <span className="font-mono text-[10px] text-text-dim">
            target − actual, shortest path
          </span>
        </div>
        <div className="h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tail} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
              <XAxis
                dataKey="t"
                tickFormatter={(v) => `${v.toFixed(0)}s`}
                tick={{ fontSize: 10 }}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v}°`}
                width={42}
              />
              <ReferenceLine y={0} stroke="var(--text-dim)" strokeDasharray="2 4" />
              <Tooltip
                cursor={{ stroke: "var(--accent-red)", strokeDasharray: 4 }}
                labelFormatter={(v) => `t = ${(+v).toFixed(1)} s`}
                formatter={(v: number, n: string) => [`${v.toFixed(2)}°`, n]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Line
                type="monotone"
                dataKey="error"
                name="FOPID error"
                stroke="var(--accent-red)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {compareMode && (
                <Line
                  type="monotone"
                  dataKey="classicalError"
                  name="PID error"
                  stroke="var(--accent-purple)"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controller output decomposition */}
      <div className="rounded border border-border-default bg-bg-secondary p-2 xl:col-span-2">
        <div className="mb-1 flex items-baseline justify-between px-2 pt-1">
          <span className="label-tech-sm">Control Output · P / I / D Decomposition</span>
          <span className="font-mono text-[10px] text-text-dim">
            u(t) = K<sub>p</sub>·e + K<sub>i</sub>·D<sup>−λ</sup>e + K<sub>d</sub>·D<sup>μ</sup>e
          </span>
        </div>
        <div className="h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tail} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
              <XAxis
                dataKey="t"
                tickFormatter={(v) => `${v.toFixed(0)}s`}
                tick={{ fontSize: 10 }}
                minTickGap={30}
              />
              <YAxis tick={{ fontSize: 10 }} width={42} />
              <ReferenceLine y={0} stroke="var(--text-dim)" strokeDasharray="2 4" />
              <Tooltip
                cursor={{ stroke: "var(--accent-cyan)", strokeDasharray: 4 }}
                labelFormatter={(v) => `t = ${(+v).toFixed(1)} s`}
                formatter={(v: number, n: string) => [`${v.toFixed(2)}`, n]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Line
                type="monotone"
                dataKey="P"
                name="P"
                stroke="var(--accent-solar)"
                strokeWidth={1.4}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="I"
                name="I"
                stroke="var(--accent-cyan)"
                strokeWidth={1.4}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="D"
                name="D"
                stroke="var(--accent-purple)"
                strokeWidth={1.4}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="output"
                name="u(t)"
                stroke="var(--text-primary)"
                strokeWidth={2.4}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
