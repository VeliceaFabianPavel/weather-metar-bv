import type { BuildingParams } from "../../utils/energy";

interface ThermalModelProps {
  building: BuildingParams;
  onChange: (next: BuildingParams) => void;
}

interface FieldDef {
  key: keyof BuildingParams;
  label: string;
  unit: string;
  step: number;
  min?: number;
  max?: number;
}

const FIELDS: FieldDef[] = [
  { key: "floorArea", label: "Floor area", unit: "m²", step: 5, min: 50, max: 500 },
  { key: "domeDiameter", label: "Dome diameter", unit: "m", step: 0.5 },
  { key: "domeSurfaceArea", label: "Envelope area", unit: "m²", step: 10 },
  { key: "glazingRatio", label: "Glazing ratio", unit: "0–1", step: 0.05, min: 0, max: 1 },
  { key: "uGlazing", label: "U glazing", unit: "W/m²K", step: 0.05 },
  { key: "uFrame", label: "U frame", unit: "W/m²K", step: 0.05 },
  { key: "infiltration", label: "Infiltration", unit: "ACH", step: 0.05 },
  { key: "internalGains", label: "Internal gains", unit: "W/m²", step: 0.5 },
  { key: "heatingSetpoint", label: "Heating setpoint", unit: "°C", step: 0.5 },
  { key: "coolingSetpoint", label: "Cooling setpoint", unit: "°C", step: 0.5 },
  { key: "shgc", label: "SHGC", unit: "0–1", step: 0.05, min: 0, max: 1 },
  { key: "pvArea", label: "PV area", unit: "m²", step: 5 },
  {
    key: "pvEfficiency",
    label: "PV efficiency",
    unit: "0–1",
    step: 0.01,
    min: 0,
    max: 0.5,
  },
  {
    key: "pvTrackingBonus",
    label: "PV tracking bonus",
    unit: "0–1",
    step: 0.05,
    min: 0,
    max: 1,
  },
  { key: "rainwaterArea", label: "Catchment area", unit: "m²", step: 10 },
  {
    key: "rainwaterEfficiency",
    label: "Catchment efficiency",
    unit: "0–1",
    step: 0.05,
    min: 0,
    max: 1,
  },
];

export function ThermalModel({ building, onChange }: ThermalModelProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {FIELDS.map((f) => (
        <label
          key={f.key}
          className="flex items-center justify-between gap-2 rounded border border-border-default bg-bg-tertiary px-3 py-2"
        >
          <div>
            <div className="font-heading text-[11px] uppercase tracking-widest text-text-secondary">
              {f.label}
            </div>
            <div className="text-[10px] text-text-dim">{f.unit}</div>
          </div>
          <input
            type="number"
            value={building[f.key] as number}
            step={f.step}
            min={f.min}
            max={f.max}
            onChange={(e) =>
              onChange({
                ...building,
                [f.key]: parseFloat(e.target.value) || 0,
              })
            }
            className="w-24 rounded border border-border-default bg-bg-secondary px-2 py-1 text-right font-mono text-sm text-text-primary focus:border-accent-solar-dim focus:outline-none"
          />
        </label>
      ))}
    </div>
  );
}
