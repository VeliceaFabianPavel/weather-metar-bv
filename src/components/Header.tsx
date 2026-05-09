import { useClock } from "../hooks/useClock";
import { formatLocalTime, formatUTCTime } from "../utils/format";
import { STATION } from "../constants";
import { StatusDot } from "./StatusDot";

export function Header() {
  const now = useClock();
  return (
    <header className="border-b border-line bg-bg-primary">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Identity */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2 border-r border-line pr-3">
            <span className="font-mono text-[20px] font-medium tracking-[0.05em] text-accent-solar">
              {STATION.icao}
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim sm:inline">
              · Heliotrop · Mission Console
            </span>
          </div>
          <StatusDot status="online" label="Link" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim md:inline">
            {STATION.shortName}
          </span>
        </div>

        {/* Live data ribbon */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-text-secondary">
          <Field label="UTC" value={formatUTCTime(now)} accent="text-accent-solar" />
          <Field
            label="LOC"
            value={formatLocalTime(now, STATION.timezone)}
            accent="text-text-primary"
          />
          <Field
            label="LAT"
            value={`${STATION.lat.toFixed(4)}°N`}
            accent="text-text-primary"
          />
          <Field
            label="LON"
            value={`${STATION.lon.toFixed(4)}°E`}
            accent="text-text-primary"
          />
          <Field
            label="ELEV"
            value={`${STATION.elevation}m`}
            accent="text-accent-cyan"
          />
          <Field
            label="MAG"
            value={`${STATION.magneticDeclination.toFixed(1)}°E`}
            accent="text-text-secondary"
          />
        </div>
      </div>
    </header>
  );
}

function Field({
  label,
  value,
  accent = "text-text-primary",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[9px] uppercase tracking-[0.2em] text-text-dim">
        {label}
      </span>
      <span className={`tabular ${accent}`}>{value}</span>
    </span>
  );
}
