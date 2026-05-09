import { useEffect, useRef, useState } from "react";
import type { FOPIDParams } from "../../types/controller";
import { FOPID_DEFAULTS } from "../../constants";

interface FOPIDControlsProps {
  params: FOPIDParams;
  onChange: (p: FOPIDParams) => void;
  onReset?: () => void;
}

interface SliderRowProps {
  label: string;
  symbol: string;
  description: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

function SliderRow({
  label,
  symbol,
  description,
  min,
  max,
  step,
  value,
  onChange,
}: SliderRowProps) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const set = (v: number) => {
    setLocal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(v), 200);
  };

  return (
    <div className="grid grid-cols-1 gap-1.5 border-b border-line pb-2.5 last:border-b-0">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-accent-solar">{symbol}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary">
            {label}
          </span>
        </div>
        <span className="font-mono text-sm tabular text-text-primary">
          {local.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(e) => set(parseFloat(e.target.value))}
        aria-label={`${label} (${symbol})`}
      />
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.18em] text-text-dim">
          {description}
        </span>
        <span className="font-mono text-[9px] text-text-dim">
          [{min}–{max}]
        </span>
      </div>
    </div>
  );
}

export function FOPIDControls({ params, onChange, onReset }: FOPIDControlsProps) {
  const isClassical = Math.abs(params.lambda - 1) < 0.02 && Math.abs(params.mu - 1) < 0.02;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: isClassical ? "var(--accent-cyan)" : "#a78bfa" }}
        >
          Mode · {isClassical ? "Classical PID" : "Fractional PID"}
        </span>
        <button
          onClick={() => {
            onChange({ ...FOPID_DEFAULTS });
            onReset?.();
          }}
          className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-secondary hover:border-accent-solar hover:text-accent-solar"
        >
          [ defaults ]
        </button>
      </div>

      <SliderRow
        label="Proportional"
        symbol="Kp"
        description="Response strength"
        min={0.1}
        max={10}
        step={0.05}
        value={params.Kp}
        onChange={(v) => onChange({ ...params, Kp: v })}
      />
      <SliderRow
        label="Integral"
        symbol="Ki"
        description="Steady-state correction"
        min={0}
        max={5}
        step={0.05}
        value={params.Ki}
        onChange={(v) => onChange({ ...params, Ki: v })}
      />
      <SliderRow
        label="Derivative"
        symbol="Kd"
        description="Damping"
        min={0}
        max={5}
        step={0.05}
        value={params.Kd}
        onChange={(v) => onChange({ ...params, Kd: v })}
      />
      <SliderRow
        label="Integration"
        symbol="λ"
        description="Fractional integration order"
        min={0.1}
        max={1.5}
        step={0.01}
        value={params.lambda}
        onChange={(v) => onChange({ ...params, lambda: v })}
      />
      <SliderRow
        label="Derivation"
        symbol="μ"
        description="Fractional derivation order"
        min={0.1}
        max={1.5}
        step={0.01}
        value={params.mu}
        onChange={(v) => onChange({ ...params, mu: v })}
      />

      <div className="border border-line bg-bg-tertiary p-2.5 font-mono text-[10px] text-text-secondary">
        <div className="label-tech mb-1">Controller form</div>
        <div>
          <span className="text-accent-solar">u(t)</span> = K
          <sub>p</sub>·e + K<sub>i</sub>·D<sup>−λ</sup>e + K<sub>d</sub>·D
          <sup>μ</sup>e
        </div>
      </div>
    </div>
  );
}
