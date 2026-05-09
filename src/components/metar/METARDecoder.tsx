import type { ParsedMETAR } from "../../types/weather";
import {
  compassPoint,
  formatDirection,
  formatVisibility,
} from "../../utils/format";
import { describeWeatherCode } from "../../utils/format";

interface METARDecoderProps {
  parsed: ParsedMETAR;
}

interface Field {
  label: string;
  value: string;
  hint?: string;
}

function describeWind(parsed: ParsedMETAR): string {
  const w = parsed.wind;
  if (w.speed === 0) return "Calm";
  const dir =
    w.direction === "VRB"
      ? "variable"
      : `${formatDirection(w.direction)}° (${compassPoint(w.direction)})`;
  let str = `${w.speed} ${w.unit} from ${dir}`;
  if (w.gusts) str += `, gusting ${w.gusts} ${w.unit}`;
  if (w.variable) str += ` (varies ${w.variable[0]}°–${w.variable[1]}°)`;
  return str;
}

function describeClouds(parsed: ParsedMETAR): string {
  if (!parsed.clouds.length) return "—";
  return parsed.clouds
    .map((c) => {
      const label: Record<string, string> = {
        FEW: "Few",
        SCT: "Scattered",
        BKN: "Broken",
        OVC: "Overcast",
        SKC: "Sky clear",
        CLR: "Clear",
        NSC: "No significant cloud",
      };
      const base = c.base > 0 ? ` at ${c.base.toLocaleString()} ft` : "";
      const type = c.type ? ` ${c.type}` : "";
      return `${label[c.coverage] ?? c.coverage}${base}${type}`;
    })
    .join("; ");
}

export function METARDecoder({ parsed }: METARDecoderProps) {
  const fields: Field[] = [
    { label: "Station", value: parsed.station },
    {
      label: "Observation Time",
      value: parsed.time.toISOString().replace("T", " ").substring(0, 19) + "Z",
    },
    { label: "Wind", value: describeWind(parsed) },
    { label: "Visibility", value: formatVisibility(parsed.visibility) },
    {
      label: "Weather",
      value: parsed.weather?.length ? parsed.weather.join(" ") : "—",
    },
    { label: "Clouds", value: describeClouds(parsed) },
    {
      label: "Temperature",
      value: `${parsed.temperature}°C`,
      hint:
        Number.isFinite(parsed.temperature) && Number.isFinite(parsed.dewpoint)
          ? `Spread ${(parsed.temperature - parsed.dewpoint).toFixed(1)}°C`
          : undefined,
    },
    { label: "Dewpoint", value: `${parsed.dewpoint}°C` },
    {
      label: "Pressure",
      value:
        parsed.pressure.unit === "Q"
          ? `${parsed.pressure.value} hPa (QNH)`
          : `${parsed.pressure.value.toFixed(2)} inHg`,
    },
    {
      label: "Source",
      value: parsed.isAuto ? "Automated station (AUTO)" : "Manual / Mixed",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
      {fields.map((f) => (
        <div
          key={f.label}
          className="flex items-baseline justify-between gap-3 border-b border-border-default/60 py-2"
        >
          <span className="label-tech">{f.label}</span>
          <span className="text-right font-mono text-sm text-text-primary">
            {f.value}
            {f.hint && (
              <span className="ml-2 text-[11px] text-text-dim">{f.hint}</span>
            )}
          </span>
        </div>
      ))}
      {parsed.remarks && (
        <div className="md:col-span-2">
          <span className="label-tech">Remarks</span>
          <div className="mt-1 font-mono text-sm text-text-secondary">
            {parsed.remarks}
          </div>
        </div>
      )}
    </div>
  );
}
