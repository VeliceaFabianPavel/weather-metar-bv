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
import type { ClimateNormal } from "../../types/climate";

interface ComparisonChartProps {
  brasovNormals: ClimateNormal[];
  poianaNormals: ClimateNormal[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ComparisonChart({
  brasovNormals,
  poianaNormals,
}: ComparisonChartProps) {
  const data = useMemo(
    () =>
      MONTHS.map((m, i) => ({
        month: m,
        brasov: brasovNormals[i]?.tMean ?? null,
        poiana: poianaNormals[i]?.tMean ?? null,
        delta:
          (brasovNormals[i]?.tMean ?? 0) - (poianaNormals[i]?.tMean ?? 0),
      })),
    [brasovNormals, poianaNormals],
  );

  // Highlight months where Poiana > Brașov (inversion)
  const inversions = data.filter((d) => d.delta < 0);

  return (
    <div className="space-y-3">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 14, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}°`} width={42} />
            <ReferenceLine y={0} stroke="var(--text-dim)" />
            <Tooltip
              cursor={{ stroke: "var(--accent-solar)", strokeDasharray: 4 }}
              formatter={(v: number, n: string) => [`${v.toFixed(1)} °C`, n]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="brasov"
              name="Brașov (528 m)"
              stroke="var(--accent-solar)"
              strokeWidth={2.4}
              dot={{ r: 3, fill: "var(--accent-solar)" }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="poiana"
              name="Poiana (1020 m)"
              stroke="var(--accent-cyan)"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ r: 3, fill: "var(--accent-cyan)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {inversions.length > 0 && (
        <div className="rounded border border-accent-purple/40 bg-bg-tertiary p-3">
          <div className="label-tech mb-1 text-accent-purple">
            Temperature inversion months
          </div>
          <div className="font-mono text-xs text-text-secondary">
            {inversions.map((d) => (
              <span key={d.month} className="mr-3">
                {d.month}: Δ {d.delta.toFixed(2)} °C
              </span>
            ))}
          </div>
          <div className="mt-1 text-[11px] text-text-dim">
            Poiana Brașov is warmer than the city — typically observed in cold-pool
            winter mornings when the valley traps cold air below the resort.
          </div>
        </div>
      )}
    </div>
  );
}
