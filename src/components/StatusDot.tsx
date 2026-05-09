interface StatusDotProps {
  status?: "online" | "warn" | "error" | "offline";
  label?: string;
  pulsing?: boolean;
}

const COLOR: Record<NonNullable<StatusDotProps["status"]>, string> = {
  online: "var(--accent-green)",
  warn: "var(--accent-solar)",
  error: "var(--accent-red)",
  offline: "var(--text-dim)",
};

export function StatusDot({
  status = "online",
  label,
  pulsing = true,
}: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`dot ${pulsing ? "dot-pulsing" : ""}`}
        style={{ color: COLOR[status] }}
      />
      {label && (
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: COLOR[status] }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
