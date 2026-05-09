import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClimateNormal } from "../../types/climate";
import { clearSkyDailyEnergy } from "../../utils/solar";
import { STATION } from "../../constants";

interface SolarRadiationProps {
  normals: ClimateNormal[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SolarRadiation({ normals }: SolarRadiationProps) {
  const data = useMemo(() => {
    return normals.map((n) => {
      const daysInMonth = new Date(2024, n.month + 1, 0).getDate();
      const sampleDay = new Date(Date.UTC(2024, n.month, 15));
      const clearDaily = clearSkyDailyEnergy(sampleDay, STATION.lat, STATION.lon);
      // Convert MJ/m² to kWh/m² (×0.2778)
      const actualMonthly = (n.radiation ?? 0) * 0.2778;
      const actualDaily = actualMonthly / Math.max(1, daysInMonth);
      const lostDaily = Math.max(0, clearDaily - actualDaily);
      return {
        month: MONTHS[n.month],
        actual: actualDaily,
        clear: clearDaily,
        lost: lostDaily,
      };
    });
  }, [normals]);

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 14, right: 14, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="actualRad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="lostRad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
            label={{
              value: "kWh/m²/day",
              angle: -90,
              position: "insideLeft",
              fontSize: 10,
              fill: "var(--text-dim)",
            }}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: "var(--accent-solar)", strokeDasharray: 4 }}
            formatter={(v: number, n: string) => [
              `${v.toFixed(2)} kWh/m²/day`,
              n,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual (Open-Meteo)"
            stroke="var(--accent-solar)"
            strokeWidth={2}
            fill="url(#actualRad)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="lost"
            name="Lost to clouds"
            stroke="var(--accent-red)"
            strokeWidth={1.4}
            strokeDasharray="3 3"
            fill="url(#lostRad)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="clear"
            name="Theoretical clear-sky"
            stroke="var(--text-primary)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
