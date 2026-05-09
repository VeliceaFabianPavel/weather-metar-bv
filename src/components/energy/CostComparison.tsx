import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CostBreakdown } from "../../utils/energy";

interface CostComparisonProps {
  costs: CostBreakdown[];
}

export function CostComparison({ costs }: CostComparisonProps) {
  const data = costs.map((c) => ({
    source: c.source,
    Static: Math.round(c.annualCostStatic),
    Tracked: Math.round(c.annualCostTracked),
    Ideal: Math.round(c.annualCostIdeal),
  }));

  return (
    <div className="space-y-3">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 14, right: 18, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 4" />
            <XAxis dataKey="source" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v.toLocaleString()}`}
              width={70}
              label={{
                value: "RON / year",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-dim)",
              }}
            />
            <Tooltip
              cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }}
              formatter={(v: number) => [`${v.toLocaleString()} RON`]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Static" fill="var(--text-secondary)" name="Static dome" />
            <Bar dataKey="Tracked" fill="var(--accent-solar)" name="FOPID-tracked" />
            <Bar dataKey="Ideal" fill="var(--accent-cyan)" name="Ideal tracking" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto rounded border border-border-default">
        <table className="min-w-full text-xs">
          <thead className="bg-bg-tertiary">
            <tr className="text-left text-text-secondary">
              <th className="px-3 py-2 font-heading uppercase tracking-widest">Source</th>
              <th className="px-3 py-2 font-heading uppercase tracking-widest">η</th>
              <th className="px-3 py-2 text-right font-heading uppercase tracking-widest">
                RON/kWh
              </th>
              <th className="px-3 py-2 text-right font-heading uppercase tracking-widest">
                Static
              </th>
              <th className="px-3 py-2 text-right font-heading uppercase tracking-widest">
                Tracked
              </th>
              <th className="px-3 py-2 text-right font-heading uppercase tracking-widest">
                Saved
              </th>
              <th className="px-3 py-2 text-right font-heading uppercase tracking-widest">
                CO₂ saved kg
              </th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => {
              const saved = c.annualCostStatic - c.annualCostTracked;
              const co2 = c.co2Static - c.co2Tracked;
              return (
                <tr key={c.source} className="border-t border-border-default font-mono">
                  <td className="px-3 py-2 text-text-primary">{c.source}</td>
                  <td className="px-3 py-2">{c.efficiency.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{c.pricePerKwh.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-text-secondary">
                    {c.annualCostStatic.toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right text-accent-solar">
                    {c.annualCostTracked.toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right text-accent-green">
                    {saved.toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right text-accent-cyan">
                    {co2.toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
