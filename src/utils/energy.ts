import type { ClimateNormal, MonthlyAggregate } from "../types/climate";
import { BUILDING, ENERGY_PRICES, STATION } from "../constants";
import { clearSkyDailyEnergy, panelOrientationFactor } from "./solar";

export interface BuildingParams {
  floorArea: number;
  domeDiameter: number;
  domeSurfaceArea: number;
  glazingRatio: number;
  uGlazing: number;
  uFrame: number;
  infiltration: number;
  internalGains: number;
  heatingSetpoint: number;
  coolingSetpoint: number;
  shgc: number;
  pvArea: number;
  pvEfficiency: number;
  pvTrackingBonus: number;
  rainwaterArea: number;
  rainwaterEfficiency: number;
}

export const DEFAULT_BUILDING: BuildingParams = { ...BUILDING };

export interface EnergyPrices {
  gas: number;
  electricity: number;
  woodPellets: number;
  gridCO2: number;
}

export const DEFAULT_PRICES: EnergyPrices = { ...ENERGY_PRICES };

/** Volume of a hemispherical dome over circular floor */
export function domeVolume(diameter: number): number {
  const r = diameter / 2;
  return (2 / 3) * Math.PI * r * r * r;
}

/** Area-weighted U value for the dome envelope. */
export function uAverage(p: BuildingParams): number {
  return p.glazingRatio * p.uGlazing + (1 - p.glazingRatio) * p.uFrame;
}

export interface MonthlyEnergyBalance {
  month: number;
  heatingDemand: number; // kWh
  coolingDemand: number; // kWh
  solarGainStatic: number;
  solarGainTracked: number;
  solarGainIdeal: number;
  netStatic: number;
  netTracked: number;
  netIdeal: number;
  pvGeneration: number;
  rainwaterLitres: number;
}

/**
 * Compute monthly energy balance for static / tracked / ideal scenarios using
 * climate normals (mean temperature, radiation) for the location.
 *
 * Heat balance per month (simplified, monthly-step quasi-static):
 *   ΔT = setpoint − T_mean
 *   Q_loss = (U·A_env + 0.34·V·n) · ΔT · hours/month
 *   Q_gain = Q_internal + Q_solar
 *   Q_solar = SHGC · A_glass · I_solar_kWh · f_orient
 */
export function computeEnergyBalance(
  normals: ClimateNormal[],
  building: BuildingParams = DEFAULT_BUILDING,
): MonthlyEnergyBalance[] {
  const env = building.domeSurfaceArea;
  const Ag = env * building.glazingRatio;
  const V = domeVolume(building.domeDiameter);
  const Uavg = uAverage(building);
  const lossCoeff = Uavg * env + 0.34 * V * building.infiltration; // W/K
  const internalKw = (building.internalGains * building.floorArea) / 1000;

  const out: MonthlyEnergyBalance[] = [];
  for (const n of normals) {
    const daysInMonth = new Date(2024, n.month + 1, 0).getDate();
    const hours = daysInMonth * 24;

    // Tmean to setpoint deltas (heating positive, cooling negative)
    const heatingDelta = Math.max(0, building.heatingSetpoint - (n.tMean ?? 0));
    const coolingDelta = Math.max(0, (n.tMean ?? 0) - building.coolingSetpoint);

    const heatingLoss = (lossCoeff * heatingDelta * hours) / 1000; // kWh
    const coolingLoss = (lossCoeff * coolingDelta * hours) / 1000;

    // Solar radiation: normal is monthly sum of daily radiation in MJ/m² (Open-Meteo).
    // Convert MJ/m² to kWh/m² (×0.2778), and that's per day average — we already have monthly sum.
    const monthlyKwhPerM2 = ((n.radiation ?? 0) * 0.2778) / Math.max(1, daysInMonth);
    const monthlyTotalKwhPerM2 = monthlyKwhPerM2 * daysInMonth;

    const fStatic = 0.5;
    const fTracked = 0.78;
    const fIdeal = 0.9;
    const solarStatic = building.shgc * Ag * monthlyTotalKwhPerM2 * fStatic;
    const solarTracked = building.shgc * Ag * monthlyTotalKwhPerM2 * fTracked;
    const solarIdeal = building.shgc * Ag * monthlyTotalKwhPerM2 * fIdeal;

    const internalGain = internalKw * hours;

    const netStatic = Math.max(0, heatingLoss - solarStatic - internalGain);
    const netTracked = Math.max(0, heatingLoss - solarTracked - internalGain);
    const netIdeal = Math.max(0, heatingLoss - solarIdeal - internalGain);

    // PV
    const pvBase = building.pvArea * building.pvEfficiency * monthlyTotalKwhPerM2;
    const pvGeneration = pvBase * (1 + building.pvTrackingBonus);

    // Rainwater (precipitation in mm × area × efficiency = litres)
    const rainwaterLitres =
      n.precipitation * building.rainwaterArea * building.rainwaterEfficiency;

    out.push({
      month: n.month,
      heatingDemand: heatingLoss,
      coolingDemand: coolingLoss,
      solarGainStatic: solarStatic,
      solarGainTracked: solarTracked,
      solarGainIdeal: solarIdeal,
      netStatic,
      netTracked,
      netIdeal,
      pvGeneration,
      rainwaterLitres,
    });
  }
  return out;
}

export function annualTotals(monthly: MonthlyEnergyBalance[]) {
  return monthly.reduce(
    (acc, m) => {
      acc.heatingDemand += m.heatingDemand;
      acc.coolingDemand += m.coolingDemand;
      acc.solarGainStatic += m.solarGainStatic;
      acc.solarGainTracked += m.solarGainTracked;
      acc.solarGainIdeal += m.solarGainIdeal;
      acc.netStatic += m.netStatic;
      acc.netTracked += m.netTracked;
      acc.netIdeal += m.netIdeal;
      acc.pvGeneration += m.pvGeneration;
      acc.rainwaterLitres += m.rainwaterLitres;
      return acc;
    },
    {
      heatingDemand: 0,
      coolingDemand: 0,
      solarGainStatic: 0,
      solarGainTracked: 0,
      solarGainIdeal: 0,
      netStatic: 0,
      netTracked: 0,
      netIdeal: 0,
      pvGeneration: 0,
      rainwaterLitres: 0,
    },
  );
}

export interface CostBreakdown {
  source: string;
  efficiency: number;
  pricePerKwh: number;
  annualCostStatic: number;
  annualCostTracked: number;
  annualCostIdeal: number;
  co2Static: number;
  co2Tracked: number;
}

export function computeCosts(
  totals: ReturnType<typeof annualTotals>,
  prices: EnergyPrices = DEFAULT_PRICES,
): CostBreakdown[] {
  const sources: { source: string; efficiency: number; price: number; co2: number }[] = [
    { source: "Gas condensing boiler", efficiency: 0.95, price: prices.gas, co2: 0.2 },
    { source: "Heat pump (COP 3.0)", efficiency: 3.0, price: prices.electricity, co2: prices.gridCO2 },
    { source: "Wood pellets", efficiency: 0.8, price: prices.woodPellets, co2: 0.04 },
  ];
  return sources.map((s) => ({
    source: s.source,
    efficiency: s.efficiency,
    pricePerKwh: s.price,
    annualCostStatic: (totals.netStatic / s.efficiency) * s.price,
    annualCostTracked: (totals.netTracked / s.efficiency) * s.price,
    annualCostIdeal: (totals.netIdeal / s.efficiency) * s.price,
    co2Static: (totals.netStatic / s.efficiency) * s.co2,
    co2Tracked: (totals.netTracked / s.efficiency) * s.co2,
  }));
}

export interface PaybackInputs {
  rotationCost: number;
  smartGlassCost: number;
  annualSavings: number;
  pricePerKwh: number;
  inflationRate: number;
  discountRate: number;
  horizonYears: number;
  emissionsAvoidedKgPerYear: number;
}

export interface PaybackResult {
  totalCapex: number;
  simplePayback: number;
  discountedPayback: number | null;
  npv: number;
  cumulative: { year: number; savings: number; cumulative: number; pv: number; cumulativeNpv: number }[];
  totalCo2Avoided: number;
}

export function computePayback(input: PaybackInputs): PaybackResult {
  const totalCapex = input.rotationCost + input.smartGlassCost;
  let cumulative = -totalCapex;
  let cumulativeNpv = -totalCapex;
  let payback: number | null = null;
  let discountedPayback: number | null = null;
  const series: PaybackResult["cumulative"] = [];
  for (let y = 1; y <= input.horizonYears; y++) {
    const inflation = Math.pow(1 + input.inflationRate, y - 1);
    const savings = input.annualSavings * inflation;
    const discount = Math.pow(1 + input.discountRate, y);
    const pv = savings / discount;
    cumulative += savings;
    cumulativeNpv += pv;
    if (cumulative >= 0 && payback === null) payback = y;
    if (cumulativeNpv >= 0 && discountedPayback === null) discountedPayback = y;
    series.push({ year: y, savings, cumulative, pv, cumulativeNpv });
  }
  return {
    totalCapex,
    simplePayback: payback ?? input.horizonYears,
    discountedPayback,
    npv: cumulativeNpv,
    cumulative: series,
    totalCo2Avoided: input.emissionsAvoidedKgPerYear * input.horizonYears,
  };
}

/** Compute a representative day's hourly energy gain for tracked vs static scenarios. */
export function dailyHourlyProfile(
  date: Date,
  building: BuildingParams = DEFAULT_BUILDING,
  cloudCover = 0.4,
): { hour: number; static: number; tracked: number; ideal: number; loss: number; net: number }[] {
  const out: { hour: number; static: number; tracked: number; ideal: number; loss: number; net: number }[] = [];
  // Static panel facing south (azimuth 180)
  const staticAz = 180;
  const Ag = building.domeSurfaceArea * building.glazingRatio;
  const lossPerHour =
    (uAverage(building) * building.domeSurfaceArea * 1) / 1000; // kWh/K·hr
  for (let h = 0; h < 24; h++) {
    const slot = new Date(date);
    slot.setHours(h, 0, 0, 0);
    // Approximate clear-sky → adjust by cloud cover
    const clearSky = clearSkyDailyEnergy(slot, STATION.lat, STATION.lon);
    const irradiance = clearSky * (1 - cloudCover * 0.7) * (1 / 24); // kWh/m² for that hour (very rough)
    const sunAz = (h - 6) * 15 + 90; // crude azimuth across a day, just for shape
    const fStatic = panelOrientationFactor(staticAz, sunAz) * 0.7;
    const fTracked = 0.85;
    const fIdeal = 1.0;
    const sStatic = building.shgc * Ag * irradiance * fStatic;
    const sTracked = building.shgc * Ag * irradiance * fTracked;
    const sIdeal = building.shgc * Ag * irradiance * fIdeal;
    const loss = lossPerHour * 5; // rough delta T placeholder; visual only
    out.push({
      hour: h,
      static: sStatic,
      tracked: sTracked,
      ideal: sIdeal,
      loss,
      net: sTracked - loss,
    });
  }
  return out;
}
