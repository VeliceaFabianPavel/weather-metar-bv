import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyEnergyBalance } from "../../utils/energy";

interface NZEBAnalysisProps {
  monthly: MonthlyEnergyBalance[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function NZEBAnalysis({ monthly }: NZEBAnalysisProps) {
  const data = monthly.map((m) => ({
    month: MONTHS[m.month],
    pv: m.pvGeneration,
    consumption: m.netTracked,
    delta: m.pvGeneration - m.netTracked,
  }));
  const annualPv = data.reduce((s, d) => s + d.pv, 0);
  const annualConsumption = data.reduce((s, d) => s + d.consumption, 0);
  const ratio = annualPv / Math.max(1, annualConsumption);
  const isNZEB = ratio >= 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Annual PV generation" value={`${annualPv.toFixed(0)} kWh`} accent="solar" />
        <Card
          label="Annual consumption"
          value={`${annualConsumption.toFixed(0)} kWh`}
          accent="red"
        />
        <Card
          label="Net balance"
          value={`${(annualPv - annualConsumption).toFixed(0)} kWh`}
          accent={annualPv >= annualConsumption ? "green" : "red"}
        />
        <Card
          label={isNZEB ? "NZEB · ACHIEVED" : "Below NZEB"}
          value={`${ratio.toFixed(2)}× balance`}
          accent={isNZEB ? "green" : "red"}
        />
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 14, right: 18, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              width={62}
              label={{
                value: "kWh",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            <ReferenceLine y={0} stroke="var(--text-dim)" />
            <Tooltip
              cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }}
              formatter={(v: number, n: string) => [`${v.toFixed(0)} kWh`, n]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="pv" name="PV generation" fill="var(--accent-solar)" />
            <Bar dataKey="consumption" name="Consumption" fill="var(--accent-red)" fillOpacity={0.7} />
            <Line
              type="monotone"
              dataKey="delta"
              name="Net (PV − use)"
              stroke="var(--accent-cyan)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded border border-border-default bg-bg-tertiary p-3 text-[12px] text-text-secondary">
        Reference · the Heliotrop concept reports a PV-to-load ratio
        of <span className="text-accent-solar">≈5×</span> after rotation tracking
        and the panel area being optimized for the dome surface. The ratio above
        reflects the building parameters you've configured.
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "solar" | "cyan" | "green" | "red";
}) {
  const colors = {
    solar: "var(--accent-solar)",
    cyan: "var(--accent-cyan)",
    green: "var(--accent-green)",
    red: "var(--accent-red)",
  } as const;
  return (
    <div className="rounded border border-border-default bg-bg-tertiary p-3">
      <div className="label-tech">{label}</div>
      <div className="mt-1 font-mono text-lg tabular" style={{ color: colors[accent] }}>
        {value}
      </div>
    </div>
  );
}
