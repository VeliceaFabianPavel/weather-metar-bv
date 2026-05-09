import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyEnergyBalance } from "../../utils/energy";

interface EnergyBalanceProps {
  monthly: MonthlyEnergyBalance[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function EnergyBalance({ monthly }: EnergyBalanceProps) {
  const data = monthly.map((m) => ({
    month: MONTHS[m.month],
    heating: -m.heatingDemand,
    cooling: m.coolingDemand,
    solarStatic: m.solarGainStatic,
    solarTracked: m.solarGainTracked,
    netStatic: -m.netStatic,
    netTracked: -m.netTracked,
    netIdeal: -m.netIdeal,
  }));

  return (
    <div className="h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 14, right: 18, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
            width={62}
            label={{
              value: "kWh / month",
              angle: -90,
              position: "insideLeft",
              fontSize: 10,
              fill: "var(--text-dim)",
            }}
          />
          <ReferenceLine y={0} stroke="var(--text-dim)" />
          <Tooltip
            cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }}
            formatter={(v: number, n: string) => [`${v.toFixed(0)} kWh`, n]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="heating"
            stackId="demand"
            fill="var(--accent-red)"
            fillOpacity={0.85}
            name="Heating demand"
          />
          <Bar
            dataKey="cooling"
            stackId="demand"
            fill="var(--accent-cyan)"
            fillOpacity={0.85}
            name="Cooling demand"
          />
          <Bar
            dataKey="solarTracked"
            fill="var(--accent-solar)"
            fillOpacity={0.7}
            name="Solar gain (tracked)"
          />
          <Line
            type="monotone"
            dataKey="netStatic"
            name="Net (static)"
            stroke="var(--text-secondary)"
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="netTracked"
            name="Net (FOPID-tracked)"
            stroke="var(--accent-solar)"
            strokeWidth={2.4}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="netIdeal"
            name="Net (ideal)"
            stroke="var(--accent-cyan)"
            strokeDasharray="2 2"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
