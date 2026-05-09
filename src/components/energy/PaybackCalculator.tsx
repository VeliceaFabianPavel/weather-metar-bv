import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { computePayback } from "../../utils/energy";
import type { PaybackInputs } from "../../utils/energy";

interface PaybackCalculatorProps {
  /** Default annual savings derived from the energy model. */
  annualSavings: number;
  /** Default emissions avoided per year (kg CO₂). */
  emissionsAvoided: number;
}

interface FormState extends PaybackInputs {}

export function PaybackCalculator({
  annualSavings,
  emissionsAvoided,
}: PaybackCalculatorProps) {
  const [form, setForm] = useState<FormState>({
    rotationCost: 25_000,
    smartGlassCost: 15_000,
    annualSavings,
    pricePerKwh: 0.3,
    inflationRate: 0.05,
    discountRate: 0.04,
    horizonYears: 20,
    emissionsAvoidedKgPerYear: emissionsAvoided,
  });

  const result = useMemo(() => computePayback(form), [form]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-2 lg:col-span-1">
        {(
          [
            { key: "rotationCost", label: "Rotation system cost", unit: "€", step: 500 },
            { key: "smartGlassCost", label: "Smart glass premium", unit: "€", step: 500 },
            {
              key: "annualSavings",
              label: "Annual energy savings",
              unit: "RON",
              step: 100,
            },
            {
              key: "pricePerKwh",
              label: "Energy price",
              unit: "RON/kWh",
              step: 0.05,
            },
            {
              key: "inflationRate",
              label: "Annual inflation",
              unit: "0–1",
              step: 0.005,
            },
            {
              key: "discountRate",
              label: "Discount rate",
              unit: "0–1",
              step: 0.005,
            },
            { key: "horizonYears", label: "Horizon", unit: "yr", step: 1 },
            {
              key: "emissionsAvoidedKgPerYear",
              label: "CO₂ avoided / yr",
              unit: "kg",
              step: 50,
            },
          ] as { key: keyof FormState; label: string; unit: string; step: number }[]
        ).map((f) => (
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
              value={form[f.key]}
              step={f.step}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  [f.key]: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-24 rounded border border-border-default bg-bg-secondary px-2 py-1 text-right font-mono text-sm text-text-primary focus:border-accent-solar-dim focus:outline-none"
            />
          </label>
        ))}
      </div>
      <div className="space-y-3 lg:col-span-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Card label="Total CapEx" value={`${result.totalCapex.toLocaleString()} €`} accent="solar" />
          <Card
            label="Simple payback"
            value={`${result.simplePayback.toFixed(1)} yr`}
            accent="cyan"
          />
          <Card
            label="Discounted payback"
            value={
              result.discountedPayback !== null
                ? `${result.discountedPayback.toFixed(1)} yr`
                : "Beyond horizon"
            }
            accent="purple"
          />
          <Card
            label={`NPV (${form.horizonYears}y)`}
            value={`${Math.round(result.npv).toLocaleString()} RON`}
            accent={result.npv >= 0 ? "green" : "red"}
          />
        </div>
        <div className="h-[300px] rounded border border-border-default bg-bg-tertiary p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.cumulative} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <ReferenceLine y={0} stroke="var(--text-dim)" />
              <Tooltip
                cursor={{ stroke: "var(--accent-green)", strokeDasharray: 4 }}
                formatter={(v: number, n: string) => [
                  `${Math.round(v).toLocaleString()} RON`,
                  n,
                ]}
                labelFormatter={(y) => `Year ${y}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative cash flow"
                stroke="var(--accent-green)"
                strokeWidth={2}
                fill="url(#cumulativeGrad)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="cumulativeNpv"
                name="NPV (discounted)"
                stroke="var(--accent-purple)"
                strokeWidth={1.6}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded border border-border-default bg-bg-tertiary p-3 text-[12px] text-text-secondary">
          Total CO₂ avoided over horizon: {result.totalCo2Avoided.toFixed(0)} kg
          {" — "}equivalent to roughly{" "}
          <span className="text-accent-green">
            {(result.totalCo2Avoided / 4_600).toFixed(1)} years of an avg European
            car
          </span>
          .
        </div>
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
  accent: "solar" | "cyan" | "green" | "red" | "purple";
}) {
  const c =
    accent === "solar"
      ? "var(--accent-solar)"
      : accent === "cyan"
        ? "var(--accent-cyan)"
        : accent === "green"
          ? "var(--accent-green)"
          : accent === "red"
            ? "var(--accent-red)"
            : "var(--accent-purple)";
  return (
    <div className="rounded border border-border-default bg-bg-tertiary p-3">
      <div className="label-tech">{label}</div>
      <div className="mt-1 font-mono text-base tabular" style={{ color: c }}>
        {value}
      </div>
    </div>
  );
}
