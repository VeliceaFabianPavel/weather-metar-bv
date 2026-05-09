import type { SolarPosition, SunPathPoint } from "../types/solar";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Julian day from a JS Date (UT). */
export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Day-of-year (1..366). */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86400000);
}

/** Equation of time (minutes), accurate enough for engineering use. */
export function equationOfTime(date: Date): number {
  const N = dayOfYear(date);
  const B = ((N - 81) * 360) / 365;
  const Br = B * DEG;
  return 9.87 * Math.sin(2 * Br) - 7.53 * Math.cos(Br) - 1.5 * Math.sin(Br);
}

/** Solar declination (degrees). */
export function solarDeclination(date: Date): number {
  const N = dayOfYear(date);
  return 23.45 * Math.sin(((360 / 365) * (N + 284)) * DEG);
}

/**
 * Compute sun azimuth (deg from north, 0..360) and elevation (deg above horizon).
 * Uses standard astronomical formulas suitable for solar tracking applications.
 */
export function calculateSolarPosition(
  date: Date,
  lat: number,
  lon: number,
): SolarPosition {
  const dec = solarDeclination(date);
  const eot = equationOfTime(date);

  // Local solar time (in hours)
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3.6e6;
  const solarTime = utcHours + lon / 15 + eot / 60;
  const hourAngle = (solarTime - 12) * 15; // degrees

  const latR = lat * DEG;
  const decR = dec * DEG;
  const haR = hourAngle * DEG;

  const sinEl = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(haR);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl))) * RAD;

  // Azimuth from north (clockwise)
  const cosEl = Math.cos(elevation * DEG);
  let azimuth: number;
  if (cosEl < 1e-6) {
    azimuth = 0;
  } else {
    const cosA =
      (Math.sin(decR) - Math.sin(elevation * DEG) * Math.sin(latR)) /
      (cosEl * Math.cos(latR));
    const A = Math.acos(Math.max(-1, Math.min(1, cosA))) * RAD;
    azimuth = haR > 0 ? 360 - A : A;
  }

  // Sunrise/sunset hour angle (when elevation = 0, accounting for refraction at -0.833°)
  const cosH0 =
    (Math.sin(-0.833 * DEG) - Math.sin(latR) * Math.sin(decR)) /
    (Math.cos(latR) * Math.cos(decR));

  let sunrise: Date;
  let sunset: Date;
  let dayLength: number;
  if (cosH0 > 1) {
    // Polar night
    sunrise = sunset = new Date(date);
    dayLength = 0;
  } else if (cosH0 < -1) {
    // Polar day
    sunrise = new Date(date);
    sunset = new Date(date.getTime() + 86400000);
    dayLength = 24;
  } else {
    const H0 = (Math.acos(cosH0) * RAD) / 15; // hours
    const noonUtc = 12 - lon / 15 - eot / 60;
    sunrise = utcHoursToDate(date, noonUtc - H0);
    sunset = utcHoursToDate(date, noonUtc + H0);
    dayLength = 2 * H0;
  }

  const noonUtc = 12 - lon / 15 - eot / 60;
  const solarNoon = utcHoursToDate(date, noonUtc);

  return {
    azimuth: ((azimuth % 360) + 360) % 360,
    elevation,
    zenith: 90 - elevation,
    declination: dec,
    hourAngle,
    sunrise,
    sunset,
    solarNoon,
    dayLength,
    equationOfTime: eot,
  };
}

function utcHoursToDate(reference: Date, h: number): Date {
  const d = new Date(reference);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + h * 3600 * 1000);
}

/** Generate sun positions across the day at a fixed step (minutes). */
export function buildSunPath(
  date: Date,
  lat: number,
  lon: number,
  stepMinutes = 10,
): SunPathPoint[] {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const points: SunPathPoint[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    const t = new Date(start.getTime() + m * 60_000);
    const pos = calculateSolarPosition(t, lat, lon);
    points.push({ time: t, azimuth: pos.azimuth, elevation: pos.elevation });
  }
  return points;
}

/** Theoretical clear-sky shortwave radiation (W/m²) at the surface. */
export function clearSkyRadiation(date: Date, lat: number, lon: number): number {
  const pos = calculateSolarPosition(date, lat, lon);
  if (pos.elevation <= 0) return 0;
  const sinEl = Math.sin(pos.elevation * DEG);
  // Hottel clear-sky model (simplified, sea level)
  const I0 = 1361; // solar constant
  const tau = 0.7; // atmospheric transmittance
  const am = 1 / (sinEl + 1e-3); // air mass approximation
  return I0 * sinEl * Math.pow(tau, am);
}

/** Daily clear-sky energy (kWh/m²/day) integrated by trapezoidal rule. */
export function clearSkyDailyEnergy(date: Date, lat: number, lon: number): number {
  let total = 0;
  const stepMin = 30;
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  for (let m = 0; m < 24 * 60; m += stepMin) {
    const t = new Date(start.getTime() + m * 60_000);
    total += clearSkyRadiation(t, lat, lon) * (stepMin / 60); // Wh/m²
  }
  return total / 1000; // kWh/m²/day
}

/** Map sun azimuth (deg) to a panel orientation factor [0..1]. */
export function panelOrientationFactor(houseAz: number, sunAz: number): number {
  const diff = Math.abs(((houseAz - sunAz + 540) % 360) - 180);
  return Math.max(0, Math.cos(diff * DEG));
}
