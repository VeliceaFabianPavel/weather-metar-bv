import { useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import { useHistoricalData } from "../hooks/useHistoricalData";
import {
  annualTotals,
  computeCosts,
  computeEnergyBalance,
  DEFAULT_BUILDING,
  DEFAULT_PRICES,
  type BuildingParams,
  type EnergyPrices,
} from "../utils/energy";
import { ThermalModel } from "../components/energy/ThermalModel";
import { EnergyBalance } from "../components/energy/EnergyBalance";
import { CostComparison } from "../components/energy/CostComparison";
import { NZEBAnalysis } from "../components/energy/NZEBAnalysis";
import { RainwaterChart } from "../components/energy/RainwaterChart";
import { PaybackCalculator } from "../components/energy/PaybackCalculator";
import { DailyProfile } from "../components/energy/DailyProfile";
import { ENERGY_PRICES } from "../constants";

export function EnergyModel() {
  const { state } = useHistoricalData();
  const [building, setBuilding] = useState<BuildingParams>(DEFAULT_BUILDING);
  const [prices, setPrices] = useState<EnergyPrices>(DEFAULT_PRICES);

  const monthly = useMemo(
    () => (state.data ? computeEnergyBalance(state.data.brasov.normals, building) : []),
    [state.data, building],
  );
  const totals = useMemo(() => annualTotals(monthly), [monthly]);
  const costs = useMemo(() => computeCosts(totals, prices), [totals, prices]);

  const heatPump = costs[1];
  const annualSavings = heatPump
    ? heatPump.annualCostStatic - heatPump.annualCostTracked
    : 0;
  const emissionsAvoided = heatPump
    ? heatPump.co2Static - heatPump.co2Tracked
    : 0;

  if (state.status === "loading" && !state.data) {
    return (
      <div className="flex items-center justify-center py-24 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-solar">
        Loading climate normals for energy model…
      </div>
    );
  }
  if (!state.data) {
    return (
      <div className="border border-accent-red/40 bg-bg-secondary p-4 font-mono text-[11px] text-accent-red">
        Energy model needs the climate archive — see Climate tab for fetch errors.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Panel id="[01]" title="Building Parameters" meta="all charts update live">
        <ThermalModel building={building} onChange={setBuilding} />
      </Panel>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          id="[02]"
          title="Monthly Energy Balance"
          meta="static · FOPID-tracked · ideal"
          className="xl:col-span-2"
        >
          <EnergyBalance monthly={monthly} />
        </Panel>
        <Panel id="[03]" title="Daily Profile" meta="winter vs summer">
          <DailyProfile building={building} />
        </Panel>
      </div>

      <Panel
        id="[04]"
        title="Annual Heating Cost · Three Scenarios"
        meta="Romania · gas / heat pump COP3 / wood pellets"
        trailing={
          <div className="flex items-center gap-3">
            {(
              [
                { key: "gas" as const, label: "Gas" },
                { key: "electricity" as const, label: "Elec" },
                { key: "woodPellets" as const, label: "Wood" },
              ]
            ).map((p) => (
              <label
                key={p.key}
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary"
              >
                <span>{p.label}</span>
                <input
                  type="number"
                  step={0.01}
                  value={prices[p.key]}
                  onChange={(e) =>
                    setPrices((prev) => ({
                      ...prev,
                      [p.key]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-16 px-1.5 py-0.5 text-right font-mono text-[11px]"
                />
              </label>
            ))}
          </div>
        }
      >
        <CostComparison costs={costs} />
      </Panel>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel
          id="[05]"
          title="NZEB · PV vs Consumption"
          meta={`PV ${building.pvArea} m² × ${(building.pvEfficiency * 100).toFixed(0)}% · tracking +${(building.pvTrackingBonus * 100).toFixed(0)}%`}
        >
          <NZEBAnalysis monthly={monthly} />
        </Panel>
        <Panel
          id="[06]"
          title="Rainwater Catchment"
          meta={`${building.rainwaterArea} m² · η ${(building.rainwaterEfficiency * 100).toFixed(0)}%`}
        >
          <RainwaterChart monthly={monthly} />
        </Panel>
      </div>

      <Panel id="[07]" title="Investment Payback" meta="NPV · payback · CO₂ avoided">
        <PaybackCalculator
          annualSavings={annualSavings}
          emissionsAvoided={emissionsAvoided}
        />
      </Panel>

      <div className="border border-line bg-bg-secondary p-3 font-mono text-[11px] text-text-secondary">
        <span className="label-tech mr-2">Refs</span>
        gas {ENERGY_PRICES.gas.toFixed(2)} RON/kWh · electricity{" "}
        {ENERGY_PRICES.electricity.toFixed(2)} RON/kWh · grid{" "}
        {ENERGY_PRICES.gridCO2.toFixed(2)} kgCO₂/kWh · tracking gain calibrated
        against the Heliotrop +40% claim.
      </div>
    </div>
  );
}
