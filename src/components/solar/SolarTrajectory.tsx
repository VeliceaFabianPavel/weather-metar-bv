import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildSunPath, calculateSolarPosition } from "../../utils/solar";
import { STATION } from "../../constants";
import { formatLocalTime } from "../../utils/format";

interface SolarTrajectoryProps {
  date: Date;
}

export function SolarTrajectory({ date }: SolarTrajectoryProps) {
  // Day key — only recompute the path once per UTC day.
  const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

  const data = useMemo(() => {
    const path = buildSunPath(date, STATION.lat, STATION.lon, 5);
    return path.map((p) => ({
      // X = decimal hours in local time (Bucharest)
      hour:
        p.time.getHours() + p.time.getMinutes() / 60,
      ts: p.time.getTime(),
      elevation: p.elevation,
      azimuth: p.azimuth,
      // Visible-elevation only (clamp at zero so the area chart looks clean)
      elevationVisible: Math.max(0, p.elevation),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  const sunNow = useMemo(
    () => calculateSolarPosition(date, STATION.lat, STATION.lon),
    [date],
  );
  const nowHour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const peak = useMemo(() => {
    let best = data[0];
    for (const d of data) if (d.elevation > best.elevation) best = d;
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  const sunriseHour = sunNow.sunrise.getHours() + sunNow.sunrise.getMinutes() / 60;
  const sunsetHour = sunNow.sunset.getHours() + sunNow.sunset.getMinutes() / 60;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
        <Stat
          label="Sunrise"
          value={formatLocalTime(sunNow.sunrise, STATION.timezone)}
          color="var(--accent-solar)"
        />
        <Stat
          label="Solar noon"
          value={formatLocalTime(sunNow.solarNoon, STATION.timezone)}
          color="var(--text-primary)"
          extra={`peak ${peak.elevation.toFixed(1)}°`}
        />
        <Stat
          label="Sunset"
          value={formatLocalTime(sunNow.sunset, STATION.timezone)}
          color="var(--accent-solar)"
        />
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 18, left: -8, bottom: 4 }}>
            <defs>
              <linearGradient id="trajGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f7a30b" stopOpacity={0.5} />
                <stop offset="60%" stopColor="#f7a30b" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#f7a30b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="1 4" />
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 24]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
              tickFormatter={(v) => `${String(v).padStart(2, "0")}:00`}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              yAxisId="el"
              orientation="left"
              domain={[-30, 90]}
              ticks={[-30, -15, 0, 15, 30, 45, 60, 75, 90]}
              tickFormatter={(v) => `${v}°`}
              tick={{ fontSize: 10 }}
              width={40}
              label={{
                value: "elev",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            <YAxis
              yAxisId="az"
              orientation="right"
              domain={[0, 360]}
              ticks={[0, 90, 180, 270, 360]}
              tickFormatter={(v) => `${v}°`}
              tick={{ fontSize: 10 }}
              width={36}
              label={{
                value: "az",
                angle: 90,
                position: "insideRight",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            {/* Night band */}
            <ReferenceArea
              yAxisId="el"
              x1={0}
              x2={sunriseHour}
              fill="rgba(0,0,0,0.4)"
              strokeOpacity={0}
            />
            <ReferenceArea
              yAxisId="el"
              x1={sunsetHour}
              x2={24}
              fill="rgba(0,0,0,0.4)"
              strokeOpacity={0}
            />
            {/* Horizon */}
            <ReferenceLine
              yAxisId="el"
              y={0}
              stroke="var(--line-strong)"
              strokeWidth={1.2}
              label={{
                value: "horizon",
                position: "insideTopLeft",
                fontSize: 9,
                fill: "var(--text-dim)",
              }}
            />
            {/* Now line */}
            <ReferenceLine
              yAxisId="el"
              x={nowHour}
              stroke="var(--accent-cyan)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={{
                value: "now",
                position: "top",
                fontSize: 10,
                fill: "var(--accent-cyan)",
              }}
            />
            {/* Sun current marker */}
            <ReferenceDot
              yAxisId="el"
              x={nowHour}
              y={Math.max(-30, sunNow.elevation)}
              r={5}
              fill="var(--accent-solar)"
              stroke="var(--bg-primary)"
              strokeWidth={1.5}
            />
            <Tooltip
              cursor={{ stroke: "var(--accent-solar)", strokeDasharray: 4 }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                const t = new Date(d.ts);
                return (
                  <div className="border border-accent-solar bg-bg-primary p-2 font-mono text-[10px]">
                    <div className="text-accent-solar">
                      {String(t.getHours()).padStart(2, "0")}:
                      {String(t.getMinutes()).padStart(2, "0")}
                    </div>
                    <div className="text-text-primary">
                      ELEV {d.elevation.toFixed(1)}°
                    </div>
                    <div className="text-text-secondary">
                      AZ {String(Math.round(d.azimuth)).padStart(3, "0")}°
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Area
              yAxisId="el"
              type="monotone"
              dataKey="elevationVisible"
              name="elevation"
              stroke="var(--accent-solar)"
              strokeWidth={2}
              fill="url(#trajGrad)"
              isAnimationActive={false}
              dot={false}
            />
            <Line
              yAxisId="az"
              type="monotone"
              dataKey="azimuth"
              name="azimuth"
              stroke="var(--accent-cyan)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  extra,
}: {
  label: string;
  value: string;
  color: string;
  extra?: string;
}) {
  return (
    <div className="border border-line bg-bg-tertiary px-2.5 py-1.5">
      <div className="cluster-label">{label}</div>
      <div className="mt-0.5 tabular" style={{ color }}>
        {value}
      </div>
      {extra && <div className="text-[10px] text-text-dim">{extra}</div>}
    </div>
  );
}
