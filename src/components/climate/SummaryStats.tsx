import { useMemo } from "react";
import type { AnnualAggregate } from "../../types/climate";
import { formatDate } from "../../utils/format";

interface SummaryStatsProps {
  annual: AnnualAggregate[];
}

interface Stat {
  label: string;
  value: string;
  hint?: string;
  accent: string;
}

export function SummaryStats({ annual }: SummaryStatsProps) {
  const stats = useMemo<Stat[]>(() => {
    if (!annual.length) return [];
    const hottest = annual.reduce(
      (best, a) => (a.hottestDay.temp > best.hottestDay.temp ? a : best),
      annual[0],
    );
    const coldest = annual.reduce(
      (best, a) => (a.coldestDay.temp < best.coldestDay.temp ? a : best),
      annual[0],
    );
    const wettest = annual.reduce(
      (best, a) => (a.wettestDay.mm > best.wettestDay.mm ? a : best),
      annual[0],
    );
    const windiest = annual.reduce(
      (best, a) => (a.windiestDay.speed > best.windiestDay.speed ? a : best),
      annual[0],
    );
    const longestDry = annual.reduce(
      (best, a) => (a.longestDryStreak > best.longestDryStreak ? a : best),
      annual[0],
    );
    const firstFrosts = annual
      .map((a) => a.firstFrost)
      .filter((d): d is Date => !!d);
    const lastFrosts = annual
      .map((a) => a.lastFrost)
      .filter((d): d is Date => !!d);
    const avgFirstFrost =
      firstFrosts.length > 0
        ? new Date(
            firstFrosts.reduce((s, d) => s + d.getTime(), 0) / firstFrosts.length,
          )
        : null;
    const avgLastFrost =
      lastFrosts.length > 0
        ? new Date(
            lastFrosts.reduce((s, d) => s + d.getTime(), 0) / lastFrosts.length,
          )
        : null;
    const avgSunshine =
      annual.reduce((s, a) => s + a.sunshineHours, 0) / annual.length;
    return [
      {
        label: "Hottest day",
        value: `${hottest.hottestDay.temp.toFixed(1)} °C`,
        hint: formatDate(hottest.hottestDay.date),
        accent: "var(--accent-red)",
      },
      {
        label: "Coldest day",
        value: `${coldest.coldestDay.temp.toFixed(1)} °C`,
        hint: formatDate(coldest.coldestDay.date),
        accent: "var(--accent-cyan)",
      },
      {
        label: "Wettest day",
        value: `${wettest.wettestDay.mm.toFixed(1)} mm`,
        hint: formatDate(wettest.wettestDay.date),
        accent: "var(--accent-cyan)",
      },
      {
        label: "Windiest day",
        value: `${windiest.windiestDay.speed.toFixed(0)} km/h`,
        hint: formatDate(windiest.windiestDay.date),
        accent: "#a78bfa",
      },
      {
        label: "Longest dry streak",
        value: `${longestDry.longestDryStreak} days`,
        hint: `In ${longestDry.year}`,
        accent: "var(--accent-solar)",
      },
      {
        label: "Avg first / last frost",
        value:
          avgFirstFrost && avgLastFrost
            ? `${avgFirstFrost.toLocaleDateString("en-GB", { month: "short", day: "2-digit" })} → ${avgLastFrost.toLocaleDateString("en-GB", { month: "short", day: "2-digit" })}`
            : "—",
        accent: "var(--accent-cyan)",
      },
      {
        label: "Sunshine hours / yr",
        value: `${avgSunshine.toFixed(0)} h`,
        hint: `Avg over ${annual.length} yrs`,
        accent: "var(--accent-solar)",
      },
    ];
  }, [annual]);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border border-line bg-bg-secondary px-2.5 py-2 transition-colors hover:border-line-strong"
          style={{ borderLeftColor: s.accent, borderLeftWidth: 2 }}
        >
          <div className="cluster-label">{s.label}</div>
          <div className="mt-1 font-mono text-base tabular" style={{ color: s.accent }}>
            {s.value}
          </div>
          {s.hint && <div className="text-[10px] text-text-dim">{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}
