interface CompassDialProps {
  sunAzimuth: number;
  houseAzimuth: number;
  classicalAzimuth?: number;
  size?: number;
}

export function CompassDial({
  sunAzimuth,
  houseAzimuth,
  classicalAzimuth,
  size = 240,
}: CompassDialProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - 14;

  const polar = (deg: number, r: number) => {
    const a = (deg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
      <defs>
        <radialGradient id="dialGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0c1220" />
          <stop offset="100%" stopColor="#020409" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={outerR} fill="url(#dialGrad)" stroke="var(--border-default)" />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="var(--border-default)" strokeDasharray="2 4" />
      <circle cx={cx} cy={cy} r={outerR - 2} fill="none" stroke="var(--border-default)" />
      {/* tick marks */}
      {Array.from({ length: 36 }).map((_, i) => {
        const a = i * 10;
        const major = a % 90 === 0;
        const p1 = polar(a, outerR - 2);
        const p2 = polar(a, outerR - (major ? 12 : 6));
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={major ? "var(--accent-solar)" : "var(--text-dim)"}
            strokeWidth={major ? 1.8 : 0.8}
          />
        );
      })}
      {/* Cardinal letters */}
      {[
        { l: "N", a: 0 },
        { l: "E", a: 90 },
        { l: "S", a: 180 },
        { l: "W", a: 270 },
      ].map(({ l, a }) => {
        const p = polar(a, innerR - 6);
        return (
          <text
            key={l}
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            fontSize={12}
            fontFamily="Syne"
            fontWeight={700}
            fill={l === "S" ? "var(--accent-solar)" : "var(--text-secondary)"}
          >
            {l}
          </text>
        );
      })}

      {/* Sun pointer (gold triangle) */}
      <g
        style={{
          transform: `rotate(${sunAzimuth}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: "transform 1s linear",
        }}
      >
        <polygon
          points={`${cx},${cy - innerR + 4} ${cx - 6},${cy - innerR + 16} ${cx + 6},${cy - innerR + 16}`}
          fill="var(--accent-solar)"
          style={{ filter: "drop-shadow(0 0 6px var(--accent-solar))" }}
        />
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - innerR + 4}
          stroke="var(--accent-solar)"
          strokeWidth={1.4}
          strokeOpacity={0.5}
        />
      </g>

      {/* Classical PID house pointer (dim) */}
      {classicalAzimuth !== undefined && (
        <g
          style={{
            transform: `rotate(${classicalAzimuth}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: "transform 200ms linear",
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - innerR + 16}
            stroke="var(--text-dim)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </g>
      )}

      {/* House pointer (cyan, FOPID) */}
      <g
        style={{
          transform: `rotate(${houseAzimuth}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: "transform 100ms linear",
        }}
      >
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - innerR + 14}
          stroke="var(--accent-cyan)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <polygon
          points={`${cx},${cy - innerR + 14} ${cx - 5},${cy - innerR + 24} ${cx + 5},${cy - innerR + 24}`}
          fill="var(--accent-cyan)"
        />
      </g>

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={6} fill="var(--bg-tertiary)" stroke="var(--accent-solar)" strokeWidth={1.4} />
      <circle cx={cx} cy={cy} r={2} fill="var(--accent-solar)" />
    </svg>
  );
}
