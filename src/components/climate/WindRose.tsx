import { useMemo, useState } from "react";
import type { DailyRecord } from "../../types/climate";
import { computeWindRose } from "../../utils/climate";

interface WindRoseProps {
  daily: DailyRecord[];
  startYear: number;
  endYear: number;
  size?: number;
}

const SEASONS = [
  { key: "all", label: "All" },
  { key: "winter", label: "Winter (DJF)" },
  { key: "spring", label: "Spring (MAM)" },
  { key: "summer", label: "Summer (JJA)" },
  { key: "autumn", label: "Autumn (SON)" },
] as const;

type SeasonKey = (typeof SEASONS)[number]["key"];

function seasonFilter(season: SeasonKey, year: number | "all"): (r: DailyRecord) => boolean {
  return (r) => {
    if (year !== "all" && r.date.getUTCFullYear() !== year) return false;
    const m = r.date.getUTCMonth();
    if (season === "all") return true;
    if (season === "winter") return m === 11 || m <= 1;
    if (season === "spring") return m >= 2 && m <= 4;
    if (season === "summer") return m >= 5 && m <= 7;
    if (season === "autumn") return m >= 8 && m <= 10;
    return true;
  };
}

export function WindRose({ daily, startYear, endYear, size = 360 }: WindRoseProps) {
  const [season, setSeason] = useState<SeasonKey>("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  const bins = useMemo(
    () => computeWindRose(daily, seasonFilter(season, yearFilter)),
    [daily, season, yearFilter],
  );

  const years = useMemo(() => {
    const xs: number[] = ["all" as unknown as number];
    for (let y = startYear; y <= endYear; y++) xs.push(y);
    return xs as (number | "all")[];
  }, [startYear, endYear]);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 26;
  const maxFreq = Math.max(0.04, Math.max(...bins.map((b) => b.frequency)));

  const sectorPath = (idx: number, freq: number): string => {
    const startA = (idx * 22.5 - 11.25 - 90) * (Math.PI / 180);
    const endA = (idx * 22.5 + 11.25 - 90) * (Math.PI / 180);
    const r = radius * (freq / maxFreq);
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    return `M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="label-tech">Season</span>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as SeasonKey)}
            className="rounded border border-border-default bg-bg-tertiary px-2 py-1 font-mono text-xs text-text-primary"
          >
            {SEASONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="label-tech">Year</span>
          <select
            value={yearFilter as string}
            onChange={(e) =>
              setYearFilter(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))
            }
            className="rounded border border-border-default bg-bg-tertiary px-2 py-1 font-mono text-xs text-text-primary"
          >
            {years.map((y) => (
              <option key={String(y)} value={String(y)}>
                {y === "all" ? "All years" : String(y)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col items-center md:flex-row md:items-start md:gap-4">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          height={size}
          style={{ maxWidth: size }}
          aria-label="Wind direction frequency rose"
        >
          <defs>
            <radialGradient id="windRoseBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0c1220" />
              <stop offset="100%" stopColor="#020409" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={radius + 8} fill="url(#windRoseBg)" />
          {/* Frequency rings */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle
              key={f}
              cx={cx}
              cy={cy}
              r={radius * f}
              fill="none"
              stroke="var(--border-default)"
              strokeDasharray="2 4"
            />
          ))}
          {/* Cardinal labels */}
          {[
            { l: "N", a: 0 },
            { l: "E", a: 90 },
            { l: "S", a: 180 },
            { l: "W", a: 270 },
          ].map(({ l, a }) => {
            const r = radius + 14;
            const ang = (a - 90) * (Math.PI / 180);
            return (
              <text
                key={l}
                x={cx + r * Math.cos(ang)}
                y={cy + r * Math.sin(ang) + 4}
                textAnchor="middle"
                fontSize={12}
                fontFamily="Syne"
                fontWeight={600}
                fill="var(--text-secondary)"
              >
                {l}
              </text>
            );
          })}
          {/* Sectors */}
          {bins.map((b) => {
            const speedFill =
              b.avgSpeed < 5
                ? "var(--accent-green)"
                : b.avgSpeed < 15
                  ? "var(--accent-solar)"
                  : "var(--accent-red)";
            return (
              <path
                key={b.index}
                d={sectorPath(b.index, b.frequency)}
                fill={speedFill}
                fillOpacity={0.78}
                stroke="var(--bg-secondary)"
                strokeWidth={1}
              >
                <title>
                  {b.label} · {(b.frequency * 100).toFixed(1)}% · {b.avgSpeed.toFixed(1)} km/h
                </title>
              </path>
            );
          })}
          <circle cx={cx} cy={cy} r={3} fill="var(--accent-solar)" />
        </svg>
        <div className="w-full space-y-2 md:w-56">
          <div className="rounded border border-border-default bg-bg-tertiary p-3">
            <div className="label-tech mb-2">Speed legend (km/h)</div>
            <LegendItem label="Calm (<5)" color="var(--accent-green)" />
            <LegendItem label="Light (5–15)" color="var(--accent-solar)" />
            <LegendItem label="Strong (>15)" color="var(--accent-red)" />
          </div>
          <div className="rounded border border-border-default bg-bg-tertiary p-3">
            <div className="label-tech mb-2">Top directions</div>
            {[...bins]
              .sort((a, b) => b.frequency - a.frequency)
              .slice(0, 4)
              .map((b) => (
                <div
                  key={b.index}
                  className="flex items-baseline justify-between font-mono text-xs"
                >
                  <span className="text-text-secondary">{b.label}</span>
                  <span className="text-text-primary">
                    {(b.frequency * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </div>
  );
}
