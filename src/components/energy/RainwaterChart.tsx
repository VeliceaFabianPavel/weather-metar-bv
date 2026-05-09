import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyEnergyBalance } from "../../utils/energy";

interface RainwaterChartProps {
  monthly: MonthlyEnergyBalance[];
  /** litres per day for a typical household (reference line) */
  householdLitresPerDay?: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function RainwaterChart({
  monthly,
  householdLitresPerDay = 150,
}: RainwaterChartProps) {
  const data = monthly.map((m) => {
    const days = new Date(2024, m.month + 1, 0).getDate();
    const householdMonthly = householdLitresPerDay * days;
    return {
      month: MONTHS[m.month],
      collected: Math.round(m.rainwaterLitres),
      ref: householdMonthly,
    };
  });
  const annual = data.reduce((s, d) => s + d.collected, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="label-tech">Rainwater catchment from dome</span>
        <span className="font-mono text-xs text-text-secondary">
          Annual <span className="text-accent-cyan">{annual.toLocaleString()} L</span>
        </span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 14, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v.toLocaleString()}`}
              width={70}
              label={{
                value: "litres / month",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            <ReferenceLine
              y={householdLitresPerDay * 30}
              stroke="var(--accent-solar)"
              strokeDasharray="4 4"
              label={{
                value: `Household ~${householdLitresPerDay}L/day`,
                fill: "var(--accent-solar)",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            <Tooltip
              cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }}
              formatter={(v: number) => [`${v.toLocaleString()} L`]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="collected" name="Rainwater collected" fill="var(--accent-cyan)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
