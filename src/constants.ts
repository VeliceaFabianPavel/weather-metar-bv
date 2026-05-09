export const STATION = {
  icao: "LRBV",
  name: "Brașov-Ghimbav International Airport",
  shortName: "Brașov-Ghimbav",
  lat: 45.6667,
  lon: 25.6,
  elevation: 528,
  timezone: "Europe/Bucharest",
  magneticDeclination: 5.5,
} as const;

export const POIANA = {
  name: "Poiana Brașov",
  lat: 45.5833,
  lon: 25.55,
  elevation: 1020,
  timezone: "Europe/Bucharest",
} as const;

export const BUILDING = {
  floorArea: 200,
  domeDiameter: 16,
  domeSurfaceArea: 400,
  glazingRatio: 0.7,
  uGlazing: 0.7,
  uFrame: 0.15,
  structureWeight: 55000,
  infiltration: 0.3,
  internalGains: 5,
  heatingSetpoint: 21,
  coolingSetpoint: 26,
  pvArea: 80,
  pvEfficiency: 0.22,
  pvTrackingBonus: 0.35,
  rainwaterArea: 200,
  rainwaterEfficiency: 0.8,
  shgc: 0.45,
} as const;

export const ENERGY_PRICES = {
  gas: 0.3,
  electricity: 1.2,
  woodPellets: 0.25,
  gridCO2: 0.3,
} as const;

export const FOPID_DEFAULTS = {
  Kp: 2.5,
  Ki: 0.8,
  Kd: 1.2,
  lambda: 0.8,
  mu: 0.6,
} as const;

export const PLANT = {
  inertia: 8000,
  motorTorqueConstant: 50,
  friction: 200,
  gearRatio: 500,
  maxTorque: 12000,
} as const;
