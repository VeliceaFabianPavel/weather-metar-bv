import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyAggregate } from "../../types/climate";

interface PrecipitationChartProps {
  monthly: MonthlyAggregate[];
  startYear: number;
  endYear: number;
}

const MONTHS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

export function PrecipitationChart({
  monthly,
  startYear,
  endYear,
}: PrecipitationChartProps) {
  const years = useMemo(() => {
    const xs: number[] = [];
    for (let y = startYear; y <= endYear; y++) xs.push(y);
    return xs;
  }, [startYear, endYear]);
  const [year, setYear] = useState(endYear);

  const data = useMemo(() => {
    const yearRows = monthly.filter((m) => m.year === year);
    return yearRows
      .sort((a, b) => a.month - b.month)
      .map((m) => ({
        month: MONTHS[m.month],
        rain: m.rain,
        snow: m.snowfall,
        total: m.precipitation,
      }));
  }, [monthly, year]);

  const annualTotal = data.reduce((acc, d) => acc + d.total, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="label-tech">Year</span>
        <div className="flex flex-wrap gap-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`rounded px-2 py-1 font-mono text-[11px] transition-colors ${
                year === y
                  ? "bg-accent-cyan-dim text-bg-primary"
                  : "border border-border-default text-text-secondary hover:border-accent-cyan-dim"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="ml-auto font-mono text-xs text-text-secondary">
          Annual total · <span className="text-accent-cyan">{annualTotal.toFixed(0)} mm</span>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 14, left: -10, bottom: 4 }}>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}`}
              width={42}
              label={{
                value: "mm",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            <ReferenceLine
              y={794 / 12}
              stroke="var(--accent-solar)"
              strokeDasharray="4 4"
              label={{
                value: "Brașov avg ~66 mm/mo",
                fill: "var(--accent-solar)",
                fontSize: 9,
                position: "right",
              }}
            />
            <Tooltip
              cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }}
              formatter={(v: number, n: string) => [`${v.toFixed(1)} mm`, n]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="rain" stackId="p" fill="var(--accent-cyan)" name="Rain">
              {data.map((_, i) => (
                <Cell key={i} fill="var(--accent-cyan)" />
              ))}
            </Bar>
            <Bar
              dataKey="snow"
              stackId="p"
              fill="rgba(226,232,240,0.85)"
              name="Snow (water eq.)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
