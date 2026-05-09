import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClimateNormal } from "../../types/climate";

interface HDDChartProps {
  normals: ClimateNormal[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function HDDChart({ normals }: HDDChartProps) {
  const data = useMemo(() => {
    let cumulative = 0;
    return normals.map((n) => {
      cumulative += n.hdd;
      return {
        month: MONTHS[n.month],
        hdd: n.hdd,
        cdd: n.cdd,
        cumulative,
      };
    });
  }, [normals]);

  const annualHdd = data[data.length - 1]?.cumulative ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="label-tech">Heating Degree Days · Base 18°C</span>
        <span className="font-mono text-xs text-text-secondary">
          Annual HDD ·{" "}
          <span className="text-accent-red">{Math.round(annualHdd)} °C·days</span>
        </span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 14, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}`}
              width={48}
              label={{
                value: "Monthly °C·days",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}`}
              width={42}
              label={{
                value: "Cum.",
                angle: 90,
                position: "insideRight",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            <Tooltip
              cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }}
              formatter={(v: number, n: string) => [`${v.toFixed(0)} °C·d`, n]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="left"
              dataKey="hdd"
              name="HDD"
              fill="var(--accent-red)"
              fillOpacity={0.85}
            />
            <Bar
              yAxisId="left"
              dataKey="cdd"
              name="CDD"
              fill="var(--accent-cyan)"
              fillOpacity={0.7}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="Cumulative HDD"
              stroke="var(--accent-solar)"
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
