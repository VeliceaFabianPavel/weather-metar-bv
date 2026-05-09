import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyWeather } from "../../types/weather";
import { Panel } from "../Panel";
import { formatHourLabel, MS_TO_KT } from "../../utils/format";

interface WeatherChartsProps {
  hourly: HourlyWeather;
  /** Number of hours to show, starting from the current hour. */
  hoursAhead?: number;
}

export function WeatherCharts({ hourly, hoursAhead = 24 }: WeatherChartsProps) {
  const data = useMemo(() => {
    const now = Date.now();
    const startIdx = Math.max(
      0,
      hourly.time.findIndex((t) => t.getTime() >= now - 30 * 60 * 1000),
    );
    const slice = hourly.time
      .slice(startIdx, startIdx + hoursAhead)
      .map((t, i) => ({
        ts: t.getTime(),
        time: formatHourLabel(t),
        temperature: hourly.temperature[startIdx + i],
        cloudCover: hourly.cloudCover[startIdx + i],
        windKt: hourly.windSpeed[startIdx + i] * MS_TO_KT,
        windDir: hourly.windDirection[startIdx + i],
      }));
    return slice;
  }, [hourly, hoursAhead]);

  // Estimate gusts as 130%–160% of sustained for visualization (when not provided per-hour)
  const dataWithGusts = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        gustKt: d.windKt * (1.3 + (d.windKt > 12 ? 0.2 : 0)),
      })),
    [data],
  );

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Panel
        title="24h Temperature"
        meta="Hourly forecast"
        bodyClassName="h-[220px] p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis
              dataKey="time"
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
              tickMargin={6}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}°`}
              width={42}
            />
            <Tooltip
              cursor={{ stroke: "var(--accent-solar)", strokeDasharray: 4 }}
              formatter={(v: number) => [`${v.toFixed(1)} °C`, "Temperature"]}
            />
            <Area
              type="monotone"
              dataKey="temperature"
              stroke="var(--accent-solar)"
              strokeWidth={2}
              fill="url(#tempGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="Wind & Gusts"
        meta="kt"
        bodyClassName="h-[220px] p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dataWithGusts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis
              dataKey="time"
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
              minTickGap={20}
            />
            <YAxis tick={{ fontSize: 10 }} width={42} />
            <Tooltip
              cursor={{ stroke: "var(--accent-cyan)", strokeDasharray: 4 }}
              formatter={(v: number, n: string) => [
                `${v.toFixed(1)} kt`,
                n === "windKt" ? "Sustained" : "Gusts",
              ]}
            />
            <Area
              type="monotone"
              dataKey="windKt"
              stroke="var(--accent-cyan)"
              strokeWidth={2}
              fill="url(#windGrad)"
              isAnimationActive={false}
              dot={false}
            />
            <Scatter
              dataKey="gustKt"
              fill="var(--accent-red)"
              shape="diamond"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="Cloud Cover"
        meta="% sky obscured"
        bodyClassName="h-[220px] p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#475569" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis
              dataKey="time"
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              width={42}
            />
            <Tooltip
              cursor={{ stroke: "var(--text-secondary)", strokeDasharray: 4 }}
              formatter={(v: number) => [`${v.toFixed(0)} %`, "Cloud cover"]}
            />
            <Area
              type="monotone"
              dataKey="cloudCover"
              stroke="var(--text-secondary)"
              strokeWidth={2}
              fill="url(#cloudGrad)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
