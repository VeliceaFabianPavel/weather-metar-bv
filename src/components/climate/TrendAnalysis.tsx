import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnnualAggregate } from "../../types/climate";
import { linearRegression } from "../../utils/climate";

interface TrendAnalysisProps {
  annual: AnnualAggregate[];
}

export function TrendAnalysis({ annual }: TrendAnalysisProps) {
  const tempPoints = annual.map((a) => ({ x: a.year, y: a.tMean }));
  const precPoints = annual.map((a) => ({ x: a.year, y: a.precipitation }));

  const tempReg = useMemo(() => linearRegression(tempPoints), [tempPoints]);
  const precReg = useMemo(() => linearRegression(precPoints), [precPoints]);

  const tempLine = tempPoints.map((p) => ({
    year: p.x,
    actual: p.y,
    fit: tempReg.intercept + tempReg.slope * p.x,
  }));
  const precLine = precPoints.map((p) => ({
    year: p.x,
    actual: p.y,
    fit: precReg.intercept + precReg.slope * p.x,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="label-tech">Annual Mean Temperature</span>
          <span
            className="font-mono text-xs"
            style={{
              color:
                tempReg.slope >= 0 ? "var(--accent-red)" : "var(--accent-cyan)",
            }}
          >
            {(tempReg.slope * 10).toFixed(2)} °C / decade · R²{" "}
            {(tempReg.r2 * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-[220px] rounded border border-border-default bg-bg-tertiary p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempLine} margin={{ top: 8, right: 14, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}°`} width={42} />
              <Tooltip
                cursor={{ stroke: "var(--accent-solar)", strokeDasharray: 4 }}
                formatter={(v: number, n: string) => [`${v.toFixed(2)} °C`, n]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="actual"
                name="Annual mean"
                stroke="var(--accent-solar)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--accent-solar)" }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="fit"
                name="Linear trend"
                stroke="var(--accent-red)"
                strokeWidth={1.6}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="label-tech">Annual Precipitation Trend</span>
          <span
            className="font-mono text-xs"
            style={{
              color:
                precReg.slope >= 0 ? "var(--accent-cyan)" : "var(--accent-red)",
            }}
          >
            {(precReg.slope * 10).toFixed(0)} mm / decade · R²{" "}
            {(precReg.r2 * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-[220px] rounded border border-border-default bg-bg-tertiary p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 14, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} type="number" domain={["auto", "auto"]} />
              <YAxis dataKey="actual" tick={{ fontSize: 10 }} width={42} />
              <Tooltip
                cursor={{ stroke: "var(--accent-cyan)", strokeDasharray: 4 }}
                formatter={(v: number, n: string) => [`${v.toFixed(0)} mm`, n]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter data={precLine} name="Annual" fill="var(--accent-cyan)" />
              <ReferenceLine
                segment={[
                  { x: precLine[0]?.year, y: precLine[0]?.fit },
                  { x: precLine[precLine.length - 1]?.year, y: precLine[precLine.length - 1]?.fit },
                ]}
                stroke="var(--accent-red)"
                strokeDasharray="3 3"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
