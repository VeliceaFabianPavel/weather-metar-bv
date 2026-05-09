import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  accent?: "solar" | "cyan" | "green" | "red" | "purple" | "neutral";
  trailing?: ReactNode;
  size?: "md" | "lg" | "xl";
  className?: string;
}

const ACCENT: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  solar: "var(--accent-solar)",
  cyan: "var(--accent-cyan)",
  green: "var(--accent-green)",
  red: "var(--accent-red)",
  purple: "#a78bfa",
  neutral: "var(--text-primary)",
};

const SIZE_CLASS: Record<NonNullable<MetricCardProps["size"]>, string> = {
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

export function MetricCard({
  label,
  value,
  unit,
  hint,
  accent = "solar",
  trailing,
  size = "lg",
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`relative border border-line bg-bg-secondary px-3 py-2.5 transition-colors hover:border-line-strong ${className}`}
      role="group"
      aria-label={label}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="cluster-label">{label}</span>
        {trailing}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`cluster-value ${SIZE_CLASS[size]}`}
          style={{ color: ACCENT[accent] }}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-1 font-mono text-[10px] text-text-dim">{hint}</div>
      )}
    </div>
  );
}
