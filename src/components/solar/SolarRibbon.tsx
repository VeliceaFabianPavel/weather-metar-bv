import { compassPoint, formatSigned, pad } from "../../utils/format";

interface SolarRibbonProps {
  sunAzimuth: number;
  houseAzimuth: number;
  classicalAzimuth?: number;
  /** Sun elevation (deg) — used to dim the sun marker when below horizon. */
  sunElevation: number;
}

const HEIGHT = 140;

export function SolarRibbon({
  sunAzimuth,
  houseAzimuth,
  classicalAzimuth,
  sunElevation,
}: SolarRibbonProps) {
  // Map azimuth (deg, 0..360) → x position (px) within a viewBox 0..1000.
  const W = 1000;
  const PAD = 40;
  const x = (deg: number) => PAD + ((deg % 360) / 360) * (W - 2 * PAD);

  // Shortest-path angular error
  const error = ((sunAzimuth - houseAzimuth + 540) % 360) - 180;
  const aligned = Math.abs(error) < 1.5;

  const sunBelow = sunElevation <= 0;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        aria-label="Azimuth tape · sun and house heading"
        style={{ display: "block" }}
      >
        {/* Background */}
        <rect x={0} y={0} width={W} height={HEIGHT} fill="var(--bg-primary)" />

        {/* Cardinal banding (subtle) */}
        {[
          { from: 315, to: 45, fill: "rgba(30,212,212,0.04)" }, // North quadrant
          { from: 135, to: 225, fill: "rgba(247,163,11,0.04)" }, // South quadrant
        ].map((b, i) => {
          if (b.from > b.to) {
            return (
              <g key={i}>
                <rect x={x(b.from)} y={0} width={W - PAD - x(b.from)} height={HEIGHT} fill={b.fill} />
                <rect x={PAD} y={0} width={x(b.to) - PAD} height={HEIGHT} fill={b.fill} />
              </g>
            );
          }
          return (
            <rect
              key={i}
              x={x(b.from)}
              y={0}
              width={x(b.to) - x(b.from)}
              height={HEIGHT}
              fill={b.fill}
            />
          );
        })}

        {/* Major + minor ticks */}
        {Array.from({ length: 73 }).map((_, i) => {
          const deg = i * 5;
          const isMajor = deg % 30 === 0;
          const isCardinal = deg % 90 === 0;
          const xpos = x(deg);
          return (
            <g key={i}>
              <line
                x1={xpos}
                y1={isMajor ? 50 : 60}
                x2={xpos}
                y2={70}
                stroke={isCardinal ? "var(--accent-solar)" : isMajor ? "var(--text-secondary)" : "var(--line-strong)"}
                strokeWidth={isCardinal ? 1.5 : 1}
              />
              {isMajor && (
                <text
                  x={xpos}
                  y={44}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="IBM Plex Mono"
                  fill={isCardinal ? "var(--accent-solar)" : "var(--text-secondary)"}
                  fontWeight={isCardinal ? 600 : 400}
                >
                  {pad(deg, 3)}
                </text>
              )}
            </g>
          );
        })}

        {/* Cardinal letters */}
        {[
          { l: "N", a: 0 },
          { l: "E", a: 90 },
          { l: "S", a: 180 },
          { l: "W", a: 270 },
          { l: "N", a: 360 },
        ].map((c, i) => (
          <text
            key={i}
            x={x(c.a)}
            y={26}
            textAnchor="middle"
            fontSize={14}
            fontFamily="Syne"
            fontWeight={700}
            fill={c.l === "S" ? "var(--accent-solar)" : "var(--text-primary)"}
          >
            {c.l}
          </text>
        ))}

        {/* Horizontal baseline */}
        <line x1={PAD} y1={70} x2={W - PAD} y2={70} stroke="var(--line-strong)" strokeWidth={1} />

        {/* Error band: between sun and house, drawn from the smaller to the larger */}
        {!aligned && (
          <line
            x1={x(sunAzimuth)}
            y1={84}
            x2={x(houseAzimuth)}
            y2={84}
            stroke={Math.abs(error) > 10 ? "var(--accent-red)" : "var(--accent-solar)"}
            strokeWidth={4}
            strokeLinecap="butt"
            opacity={0.6}
          />
        )}

        {/* Classical PID pointer (dim, drawn first so it sits behind the FOPID one) */}
        {classicalAzimuth !== undefined && (
          <PointerMark
            x={x(classicalAzimuth)}
            color="#a78bfa"
            label="P"
            offsetY={104}
            size={6}
          />
        )}

        {/* House pointer (FOPID, cyan) */}
        <PointerMark
          x={x(houseAzimuth)}
          color="var(--accent-cyan)"
          label="H"
          offsetY={92}
          size={9}
          strong
        />

        {/* Sun pointer (gold) */}
        <PointerMark
          x={x(sunAzimuth)}
          color="var(--accent-solar)"
          label="☼"
          offsetY={70}
          size={9}
          strong
          dimmed={sunBelow}
          inverted
        />

        {/* "ALIGNED" tag when error < 1.5° */}
        {aligned && !sunBelow && (
          <text
            x={x(sunAzimuth)}
            y={130}
            textAnchor="middle"
            fontSize={10}
            fontFamily="IBM Plex Mono"
            fill="var(--accent-green)"
            letterSpacing={2}
          >
            ◆ ALIGNED
          </text>
        )}
      </svg>

      {/* Numeric readout below the tape */}
      <div className="grid grid-cols-3 gap-2 border-t border-line pt-2 text-center font-mono text-[11px]">
        <Cell
          label="Sun · az"
          value={
            sunBelow ? "below horizon" : `${pad(Math.round(sunAzimuth), 3)}°  ${compassPoint(sunAzimuth)}`
          }
          color={sunBelow ? "var(--text-dim)" : "var(--accent-solar)"}
        />
        <Cell
          label="House · az"
          value={`${pad(Math.round(houseAzimuth), 3)}°  ${compassPoint(houseAzimuth)}`}
          color="var(--accent-cyan)"
        />
        <Cell
          label="Δ error"
          value={`${formatSigned(error, 2)}°`}
          color={
            Math.abs(error) > 10
              ? "var(--accent-red)"
              : Math.abs(error) > 1.5
                ? "var(--accent-solar)"
                : "var(--accent-green)"
          }
        />
      </div>
    </div>
  );
}

function PointerMark({
  x,
  color,
  label,
  offsetY,
  size,
  strong = false,
  dimmed = false,
  inverted = false,
}: {
  x: number;
  color: string;
  label: string;
  offsetY: number;
  size: number;
  strong?: boolean;
  dimmed?: boolean;
  inverted?: boolean;
}) {
  const opacity = dimmed ? 0.35 : 1;
  const points = inverted
    ? `${x},${offsetY - size} ${x - size},${offsetY + size * 0.4} ${x + size},${offsetY + size * 0.4}`
    : `${x},${offsetY + size} ${x - size},${offsetY - size * 0.4} ${x + size},${offsetY - size * 0.4}`;
  return (
    <g
      opacity={opacity}
      style={{
        filter: strong && !dimmed ? `drop-shadow(0 0 4px ${color})` : undefined,
        transition: "all 200ms linear",
      }}
    >
      <polygon points={points} fill={color} />
      <text
        x={x}
        y={inverted ? offsetY + size * 0.4 + 12 : offsetY - size * 0.4 - 6}
        textAnchor="middle"
        fontSize={10}
        fontFamily="IBM Plex Mono"
        fill={color}
      >
        {label}
      </text>
    </g>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="cluster-label">{label}</div>
      <div className="mt-0.5 tabular" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
