import type { DisturbanceEvent } from "../../types/controller";

interface DisturbancePanelProps {
  onInject: (type: DisturbanceEvent["type"]) => void;
  events: DisturbanceEvent[];
}

const BUTTONS: {
  type: DisturbanceEvent["type"];
  label: string;
  description: string;
  accent: string;
}[] = [
  {
    type: "wind",
    label: "Wind Gust",
    description: "5s torque impulse",
    accent: "var(--accent-cyan)",
  },
  {
    type: "cloud",
    label: "Cloud Pass",
    description: "30s sun loss",
    accent: "var(--text-secondary)",
  },
  {
    type: "load",
    label: "Load Shift",
    description: "60s · ±20% inertia",
    accent: "var(--accent-solar)",
  },
  {
    type: "friction",
    label: "Friction Spike",
    description: "10s · ×3 friction",
    accent: "var(--accent-red)",
  },
];

export function DisturbancePanel({ onInject, events }: DisturbancePanelProps) {
  const now = Date.now();
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        {BUTTONS.map((b) => (
          <button
            key={b.type}
            onClick={() => onInject(b.type)}
            className="border border-line bg-bg-tertiary px-2.5 py-2 text-left transition-all hover:border-accent-solar hover:bg-bg-hover"
            style={{ borderLeftColor: b.accent, borderLeftWidth: 2 }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: b.accent }}
            >
              {b.label}
            </div>
            <div className="text-[10px] text-text-dim">{b.description}</div>
          </button>
        ))}
      </div>
      <div className="border border-line bg-bg-tertiary">
        <div className="flex items-baseline justify-between border-b border-line px-2.5 py-1.5">
          <span className="label-tech">Disturbance log</span>
          <span className="font-mono text-[10px] text-text-dim">
            {events.length} events
          </span>
        </div>
        <div className="max-h-32 overflow-y-auto p-1.5 font-mono text-[10px]">
          {events.length === 0 ? (
            <div className="px-1.5 py-1 text-text-dim">— no disturbances injected —</div>
          ) : (
            events
              .slice()
              .reverse()
              .map((e) => {
                const elapsed = (now - e.startedAt) / 1000;
                const active = elapsed * 1000 < e.duration;
                return (
                  <div
                    key={e.id}
                    className="flex items-baseline justify-between border-b border-line/40 px-1.5 py-1 last:border-b-0"
                  >
                    <span
                      style={{
                        color: active ? "var(--accent-solar)" : "var(--text-secondary)",
                      }}
                    >
                      {new Date(e.startedAt).toLocaleTimeString()} · {e.label}
                    </span>
                    <span className="text-text-dim">
                      {active
                        ? `${(e.duration / 1000 - elapsed).toFixed(1)}s left`
                        : "ended"}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
