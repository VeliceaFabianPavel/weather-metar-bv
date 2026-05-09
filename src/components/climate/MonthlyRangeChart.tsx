import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyAggregate } from "../../types/climate";
import { percentile } from "../../utils/climate";

interface MonthlyRangeChartProps {
  brasov: MonthlyAggregate[];
  poiana: MonthlyAggregate[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthBucket {
  month: string;
  monthIdx: number;
  bvMin: number;
  bvP25: number;
  bvP50: number;
  bvP75: number;
  bvMax: number;
  poP50: number;
  // Recharts works best with stack-style bands using min + spread
  bvLowSpread: number; // p25 - min  (light)
  bvBoxSpread: number; // p75 - p25 (dark)
  bvHighSpread: number; // max - p75 (light)
}

function bucket(monthly: MonthlyAggregate[], idx: number): number[] {
  return monthly.filter((m) => m.month === idx).map((m) => m.tMean);
}

function pmin(xs: number[]): number {
  return Math.min(...xs.filter(Number.isFinite));
}
function pmax(xs: number[]): number {
  return Math.max(...xs.filter(Number.isFinite));
}

function buildBucket(
  brasov: MonthlyAggregate[],
  poiana: MonthlyAggregate[],
  monthIdx: number,
): MonthBucket {
  const bv = bucket(brasov, monthIdx);
  const po = bucket(poiana, monthIdx);
  const bvMin = pmin(bv);
  const bvMax = pmax(bv);
  const bvP25 = percentile(bv, 0.25);
  const bvP50 = percentile(bv, 0.5);
  const bvP75 = percentile(bv, 0.75);
  return {
    month: MONTHS[monthIdx],
    monthIdx,
    bvMin,
    bvP25,
    bvP50,
    bvP75,
    bvMax,
    bvLowSpread: bvP25 - bvMin,
    bvBoxSpread: bvP75 - bvP25,
    bvHighSpread: bvMax - bvP75,
    poP50: percentile(po, 0.5),
  };
}

export function MonthlyRangeChart({ brasov, poiana }: MonthlyRangeChartProps) {
  const data = useMemo(
    () => Array.from({ length: 12 }, (_, i) => buildBucket(brasov, poiana, i)),
    [brasov, poiana],
  );

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 18, left: -10, bottom: 4 }}>
          <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}°`}
            width={42}
          />
          <Tooltip
            cursor={{ stroke: "var(--accent-solar)", strokeDasharray: 4 }}
            content={({ payload, label }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload as MonthBucket;
              return (
                <div className="rounded border border-accent-solar-dim bg-bg-tertiary p-2 font-mono text-[11px]">
                  <div className="text-accent-solar">{label}</div>
                  <div>Min {d.bvMin.toFixed(1)}°C</div>
                  <div>P25 {d.bvP25.toFixed(1)}°C</div>
                  <div>Median {d.bvP50.toFixed(1)}°C</div>
                  <div>P75 {d.bvP75.toFixed(1)}°C</div>
                  <div>Max {d.bvMax.toFixed(1)}°C</div>
                  <div className="text-accent-cyan">Poiana median {d.poP50.toFixed(1)}°C</div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
          {/* Stacked area: min → p25 (light), p25 → p75 (dark), p75 → max (light) */}
          <Area
            type="monotone"
            dataKey="bvMin"
            stackId="bv"
            stroke="none"
            fill="transparent"
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="bvLowSpread"
            stackId="bv"
            stroke="none"
            fill="var(--accent-solar)"
            fillOpacity={0.18}
            name="min–p25"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="bvBoxSpread"
            stackId="bv"
            stroke="none"
            fill="var(--accent-solar)"
            fillOpacity={0.45}
            name="p25–p75 (Brașov)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="bvHighSpread"
            stackId="bv"
            stroke="none"
            fill="var(--accent-solar)"
            fillOpacity={0.18}
            name="p75–max"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="bvP50"
            name="Brașov median"
            stroke="var(--accent-solar)"
            strokeWidth={2.4}
            dot={{ r: 2.5, fill: "var(--accent-solar)" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="poP50"
            name="Poiana median"
            stroke="var(--accent-cyan)"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={{ r: 2, fill: "var(--accent-cyan)" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
