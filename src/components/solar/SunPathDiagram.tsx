import { useMemo } from "react";
import { buildSunPath, calculateSolarPosition } from "../../utils/solar";
import { STATION } from "../../constants";

interface SunPathDiagramProps {
  date: Date;
  houseAzimuth: number;
  size?: number;
  /** Show summer/winter solstice arcs as faint reference lines */
  showSolstices?: boolean;
}

const SIZE = 360;

function project(
  azimuth: number,
  elevation: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number } {
  // Polar projection: 0 elev → outer edge, 90 elev → center.
  const r = radius * (1 - Math.max(0, elevation) / 90);
  const az = (azimuth - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(az), y: cy + r * Math.sin(az) };
}

function arcPath(
  points: { azimuth: number; elevation: number }[],
  cx: number,
  cy: number,
  radius: number,
): string {
  const visible = points.filter((p) => p.elevation >= 0);
  if (!visible.length) return "";
  return visible
    .map((p, i) => {
      const { x, y } = project(p.azimuth, p.elevation, cx, cy, radius);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function SunPathDiagram({
  date,
  houseAzimuth,
  size = SIZE,
  showSolstices = true,
}: SunPathDiagramProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;

  // Day key — only recompute the path once per calendar day (not every second).
  const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

  const path = useMemo(
    () => buildSunPath(date, STATION.lat, STATION.lon, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayKey],
  );
  const sunNow = useMemo(
    () => calculateSolarPosition(date, STATION.lat, STATION.lon),
    [date],
  );

  const summer = useMemo(() => {
    const d = new Date(date.getFullYear(), 5, 21);
    return buildSunPath(d, STATION.lat, STATION.lon, 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.getFullYear()]);

  const winter = useMemo(() => {
    const d = new Date(date.getFullYear(), 11, 21);
    return buildSunPath(d, STATION.lat, STATION.lon, 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.getFullYear()]);

  const sunPoint = sunNow.elevation >= 0 ? project(sunNow.azimuth, sunNow.elevation, cx, cy, radius) : null;
  // House orientation marker — represented at horizon (elevation 0)
  const housePoint = project(houseAzimuth, 0, cx, cy, radius);
  // Aligned glow when |delta| small
  const delta = Math.abs(((sunNow.azimuth - houseAzimuth + 540) % 360) - 180);
  const aligned = delta < 5 && sunNow.elevation > 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="Sun path polar diagram for current day"
    >
      <defs>
        <radialGradient id="skyGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0c1220" />
          <stop offset="80%" stopColor="#060a13" />
          <stop offset="100%" stopColor="#020409" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={radius + 8} fill="url(#skyGrad)" />

      {/* Elevation rings */}
      {[0, 15, 30, 45, 60, 75].map((el) => {
        const r = radius * (1 - el / 90);
        return (
          <g key={el}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--border-default)"
              strokeDasharray={el === 0 ? "" : "2 4"}
              strokeWidth={el === 0 ? 1.4 : 0.8}
            />
            {el > 0 && (
              <text
                x={cx + r + 2}
                y={cy + 2}
                fontSize={9}
                fill="var(--text-dim)"
                fontFamily="IBM Plex Mono"
              >
                {el}°
              </text>
            )}
          </g>
        );
      })}

      {/* Cardinal directions */}
      {[
        { label: "N", az: 0 },
        { label: "E", az: 90 },
        { label: "S", az: 180 },
        { label: "W", az: 270 },
      ].map((c) => {
        const p = project(c.az, 0, cx, cy, radius + 14);
        return (
          <text
            key={c.label}
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            fontSize={13}
            fontFamily="Syne"
            fontWeight={600}
            fill={c.label === "S" ? "var(--accent-solar)" : "var(--text-secondary)"}
          >
            {c.label}
          </text>
        );
      })}

      {/* Cross-hair lines for cardinal directions */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((az) => {
        const p = project(az, 0, cx, cy, radius);
        return (
          <line
            key={az}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--border-default)"
            strokeDasharray="1 5"
          />
        );
      })}

      {/* Solstice reference arcs */}
      {showSolstices && (
        <>
          <path
            d={arcPath(summer, cx, cy, radius)}
            fill="none"
            stroke="var(--accent-solar-dim)"
            strokeOpacity={0.4}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <path
            d={arcPath(winter, cx, cy, radius)}
            fill="none"
            stroke="var(--accent-cyan-dim)"
            strokeOpacity={0.4}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </>
      )}

      {/* Today's sun arc */}
      <path
        d={arcPath(path, cx, cy, radius)}
        fill="none"
        stroke="var(--accent-solar)"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.85}
        filter="url(#glow)"
      />

      {/* Hour ticks along today's path */}
      {path
        .filter((p, i) => p.elevation > 0 && i % 6 === 0) // every hour
        .map((p, i) => {
          const pt = project(p.azimuth, p.elevation, cx, cy, radius);
          return (
            <g key={`tick-${i}`}>
              <circle cx={pt.x} cy={pt.y} r={1.6} fill="var(--accent-solar)" />
              <text
                x={pt.x}
                y={pt.y - 5}
                fontSize={8.5}
                fill="var(--text-dim)"
                textAnchor="middle"
                fontFamily="IBM Plex Mono"
              >
                {p.time.getHours().toString().padStart(2, "0")}
              </text>
            </g>
          );
        })}

      {/* Line: center → sun */}
      {sunPoint && (
        <line
          x1={cx}
          y1={cy}
          x2={sunPoint.x}
          y2={sunPoint.y}
          stroke="var(--accent-solar)"
          strokeWidth={aligned ? 2.4 : 1.4}
          strokeLinecap="round"
          opacity={aligned ? 1 : 0.7}
          filter={aligned ? "url(#glow)" : undefined}
        />
      )}
      {/* Line: center → house heading */}
      <line
        x1={cx}
        y1={cy}
        x2={housePoint.x}
        y2={housePoint.y}
        stroke="var(--accent-cyan)"
        strokeWidth={aligned ? 2.2 : 1.4}
        strokeDasharray="4 4"
        strokeLinecap="round"
        opacity={0.85}
      />

      {/* Sun marker */}
      {sunPoint && (
        <g filter="url(#glow)">
          <circle cx={sunPoint.x} cy={sunPoint.y} r={9} fill="var(--accent-solar)" />
          <circle
            cx={sunPoint.x}
            cy={sunPoint.y}
            r={14}
            fill="none"
            stroke="var(--accent-solar)"
            strokeOpacity={0.4}
          >
            <animate
              attributeName="r"
              values="9;18;9"
              dur="2.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.5;0;0.5"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}

      {/* House marker */}
      <g>
        <circle cx={housePoint.x} cy={housePoint.y} r={6} fill="var(--accent-cyan)" />
        <circle
          cx={housePoint.x}
          cy={housePoint.y}
          r={6}
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth={1.5}
        />
      </g>

      {/* Center crosshair */}
      <circle cx={cx} cy={cy} r={2.4} fill="var(--text-dim)" />

      {/* Legend */}
      <g transform={`translate(${size - 96} ${size - 32})`}>
        <rect
          x={-6}
          y={-12}
          width={106}
          height={36}
          fill="var(--bg-tertiary)"
          stroke="var(--border-default)"
          rx={3}
        />
        <circle cx={4} cy={-2} r={4} fill="var(--accent-solar)" />
        <text x={12} y={1} fill="var(--text-secondary)" fontSize={9.5} fontFamily="IBM Plex Mono">
          Sun
        </text>
        <circle cx={50} cy={-2} r={4} fill="var(--accent-cyan)" />
        <text x={58} y={1} fill="var(--text-secondary)" fontSize={9.5} fontFamily="IBM Plex Mono">
          House
        </text>
        <line
          x1={4}
          y1={14}
          x2={20}
          y2={14}
          stroke="var(--accent-solar-dim)"
          strokeDasharray="3 3"
        />
        <text x={24} y={17} fill="var(--text-dim)" fontSize={8.5} fontFamily="IBM Plex Mono">
          Solstice
        </text>
      </g>
    </svg>
  );
}
