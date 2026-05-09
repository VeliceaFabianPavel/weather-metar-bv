import { useMemo, useState } from "react";
import type { DailyRecord } from "../../types/climate";

interface TemperatureHeatmapProps {
  daily: DailyRecord[];
  startYear: number;
  endYear: number;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function tempToColor(t: number): string {
  if (!Number.isFinite(t)) return "#0c1220";
  // Anchors: -25 → deep blue, 0 → white, 15 → amber, 35 → red
  const stops = [
    { v: -25, c: [22, 53, 110] },
    { v: -10, c: [56, 121, 195] },
    { v: 0, c: [220, 230, 240] },
    { v: 15, c: [245, 158, 11] },
    { v: 25, c: [200, 70, 30] },
    { v: 38, c: [180, 30, 30] },
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].v && t <= stops[i + 1].v) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
    if (t < stops[0].v) {
      lo = hi = stops[0];
    }
    if (t > stops[stops.length - 1].v) {
      lo = hi = stops[stops.length - 1];
    }
  }
  const range = hi.v - lo.v || 1;
  const f = Math.max(0, Math.min(1, (t - lo.v) / range));
  const r = Math.round(lo.c[0] + (hi.c[0] - lo.c[0]) * f);
  const g = Math.round(lo.c[1] + (hi.c[1] - lo.c[1]) * f);
  const b = Math.round(lo.c[2] + (hi.c[2] - lo.c[2]) * f);
  return `rgb(${r},${g},${b})`;
}

export function TemperatureHeatmap({
  daily,
  startYear,
  endYear,
}: TemperatureHeatmapProps) {
  const years = useMemo(() => {
    const set: number[] = [];
    for (let y = startYear; y <= endYear; y++) set.push(y);
    return set;
  }, [startYear, endYear]);

  // Index daily by yyyy-doy
  const map = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of daily) {
      const y = r.date.getUTCFullYear();
      const start = Date.UTC(y, 0, 0);
      const doy = Math.floor((r.date.getTime() - start) / 86400000);
      m.set(`${y}-${doy}`, r.tMean);
    }
    return m;
  }, [daily]);

  const [hover, setHover] = useState<{
    year: number;
    doy: number;
    temp: number;
  } | null>(null);

  const cell = 4;
  const gap = 1;
  const rowH = 18;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="label-tech">
          Daily mean temperature · {startYear}–{endYear}
        </span>
        <Legend />
      </div>
      <div className="overflow-x-auto">
        <svg
          width={(cell + gap) * 366 + 36}
          height={years.length * (rowH + 2) + 30}
          aria-label="Temperature heatmap"
        >
          {/* month markers */}
          {[
            0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365,
          ].map((doy, i) => {
            const x = 32 + doy * (cell + gap);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={6}
                  x2={x}
                  y2={years.length * (rowH + 2) + 6}
                  stroke="var(--border-default)"
                  strokeDasharray="1 5"
                  opacity={0.6}
                />
                {i < 12 && (
                  <text
                    x={x + 8}
                    y={4}
                    fontSize={9}
                    fill="var(--text-dim)"
                    fontFamily="IBM Plex Mono"
                  >
                    {MONTH_NAMES[i]}
                  </text>
                )}
              </g>
            );
          })}
          {years.map((year, i) => (
            <g key={year} transform={`translate(0 ${10 + i * (rowH + 2)})`}>
              <text
                x={4}
                y={rowH * 0.7}
                fontSize={10}
                fill="var(--text-secondary)"
                fontFamily="IBM Plex Mono"
              >
                {year}
              </text>
              {Array.from({ length: 366 }).map((_, doy) => {
                const t = map.get(`${year}-${doy + 1}`);
                if (t == null) return null;
                return (
                  <rect
                    key={doy}
                    x={32 + doy * (cell + gap)}
                    y={2}
                    width={cell}
                    height={rowH - 4}
                    fill={tempToColor(t)}
                    onMouseEnter={() =>
                      setHover({ year, doy: doy + 1, temp: t })
                    }
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "crosshair" }}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      {hover && (
        <div className="font-mono text-xs text-text-secondary">
          {hover.year} · day {hover.doy}: {hover.temp.toFixed(1)} °C
        </div>
      )}
    </div>
  );
}

function Legend() {
  const stops = [-20, -10, 0, 10, 20, 30];
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {stops.map((t) => (
          <div key={t} className="flex flex-col items-center">
            <div
              style={{
                width: 26,
                height: 8,
                background: tempToColor(t),
                borderRadius: 1,
              }}
            />
            <span className="font-mono text-[9px] text-text-dim">{t}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}
