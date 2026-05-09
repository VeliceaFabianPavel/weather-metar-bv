import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dailyHourlyProfile, type BuildingParams } from "../../utils/energy";

interface DailyProfileProps {
  building: BuildingParams;
}

export function DailyProfile({ building }: DailyProfileProps) {
  const [scenario, setScenario] = useState<"winter" | "summer">("winter");
  const date = useMemo(() => {
    const d = new Date();
    d.setMonth(scenario === "winter" ? 0 : 6, 15);
    d.setHours(12, 0, 0, 0);
    return d;
  }, [scenario]);
  const cloudCover = scenario === "winter" ? 0.6 : 0.25;
  const data = useMemo(
    () => dailyHourlyProfile(date, building, cloudCover),
    [date, building, cloudCover],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["winter", "summer"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            className={`rounded border px-3 py-1 font-mono text-[11px] uppercase transition-colors ${
              scenario === s
                ? "border-accent-solar-dim bg-accent-solar/10 text-accent-solar"
                : "border-border-default text-text-secondary hover:border-accent-solar-dim"
            }`}
          >
            {s} day
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-text-dim">
          15 {scenario === "winter" ? "January" : "July"} · cloud {Math.round(cloudCover * 100)}%
        </span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 14, right: 14, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="trackedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="staticFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
            <YAxis
              tick={{ fontSize: 10 }}
              width={48}
              label={{
                value: "kWh / hr",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            <Tooltip
              cursor={{ stroke: "var(--accent-solar)", strokeDasharray: 4 }}
              formatter={(v: number, n: string) => [`${v.toFixed(2)} kWh`, n]}
              labelFormatter={(h) => `Hour ${h}:00`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="static"
              name="Static gain"
              stroke="var(--text-secondary)"
              fill="url(#staticFill)"
              strokeWidth={1.6}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="tracked"
              name="Tracked gain"
              stroke="var(--accent-solar)"
              fill="url(#trackedFill)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="ideal"
              name="Ideal"
              stroke="var(--accent-cyan)"
              strokeDasharray="3 3"
              fillOpacity={0}
              strokeWidth={1.4}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
