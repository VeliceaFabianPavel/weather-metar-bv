interface CountdownRingProps {
  remainingMs: number;
  totalMs: number;
  size?: number;
  label?: string;
}

export function CountdownRing({
  remainingMs,
  totalMs,
  size = 32,
  label,
}: CountdownRingProps) {
  const r = size / 2 - 2;
  const C = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
  const seconds = Math.max(0, Math.round(remainingMs / 1000));
  return (
    <div className="inline-flex items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--line)"
          strokeWidth={1.5}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--accent-solar)"
          strokeWidth={1.5}
          strokeLinecap="butt"
          strokeDasharray={`${C * progress} ${C}`}
          fill="none"
          style={{
            transition: "stroke-dasharray 950ms linear",
            filter: "drop-shadow(0 0 4px var(--accent-solar))",
          }}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={size * 0.36}
          fontFamily="IBM Plex Mono"
          fill="var(--accent-solar)"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
        >
          {seconds}
        </text>
      </svg>
      {label && <span className="label-tech">{label}</span>}
    </div>
  );
}
