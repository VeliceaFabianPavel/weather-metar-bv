import type { FOPIDParams, PlantParams } from "../types/controller";

/** Shortest signed angular difference (degrees), in (-180, 180]. */
export function shortestAngularError(target: number, current: number): number {
  return ((target - current + 540) % 360) - 180;
}

/**
 * Grünwald–Letnikov fractional derivative/integral of a discrete signal.
 *
 * `errors` is the time-ordered signal (oldest → newest).
 * `alpha` > 0  → fractional derivative of order alpha
 * `alpha` < 0  → fractional integral of order |alpha|
 *
 * Uses the recursive Grünwald binomial coefficients
 *   w_0 = 1, w_j = w_{j-1} * (1 - (alpha+1)/j)
 *
 * Memory depth bounded to `memory` to keep the controller real-time-safe.
 */
export function grunwaldLetnikov(
  errors: number[],
  alpha: number,
  dt: number,
  memory = 50,
): number {
  if (errors.length === 0) return 0;
  const n = Math.min(errors.length, memory);
  const w: number[] = new Array(n);
  w[0] = 1;
  for (let j = 1; j < n; j++) {
    w[j] = w[j - 1] * (1 - (alpha + 1) / j);
  }
  let sum = 0;
  for (let j = 0; j < n; j++) {
    sum += w[j] * errors[errors.length - 1 - j];
  }
  return sum / Math.pow(dt, alpha);
}

/**
 * FOPID controller output:
 *   u(t) = Kp·e + Ki·D^{-λ}·e + Kd·D^{μ}·e
 *
 * The integral term uses negative order = -lambda, the derivative uses positive order mu.
 */
export function fopidControl(
  errors: number[],
  params: FOPIDParams,
  dt: number,
): { output: number; P: number; I: number; D: number } {
  const e = errors[errors.length - 1] ?? 0;
  const P = params.Kp * e;
  const I = params.Ki * grunwaldLetnikov(errors, -params.lambda, dt);
  const D = params.Kd * grunwaldLetnikov(errors, params.mu, dt);
  const output = P + I + D;
  return { output, P, I, D };
}

/** Saturate a value within ±limit. */
export function saturate(x: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, x));
}

/**
 * Plant model: 2nd-order rotating dome with motor torque + friction.
 *   J·θ̈ + b·θ̇ = τ_motor − τ_dist
 *
 * Returns updated angle/velocity after one Euler step of size `dt`.
 */
export function plantStep(
  angleDeg: number,
  velocityDegPerS: number,
  controlSignal: number,
  plant: PlantParams,
  dt: number,
  externalTorque = 0,
  inertiaMultiplier = 1,
  frictionMultiplier = 1,
): { angle: number; velocity: number; torque: number } {
  const J = plant.inertia * inertiaMultiplier;
  const b = plant.friction * frictionMultiplier;
  // Treat control signal in degrees → motor current in A through gear & torque constant.
  // Reduced equivalent torque at output shaft: τ = Km · u / N · gearRatio = Km · u
  // (the /N then ·N cancel for output-side torque).
  const torqueRaw = plant.motorTorqueConstant * controlSignal;
  const torque = saturate(torqueRaw, plant.maxTorque);
  // Convert velocity deg/s → rad/s for the dynamics, then back.
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;
  const omega = velocityDegPerS * DEG;
  const accel = (torque - b * omega - externalTorque) / J; // rad/s²
  const newOmega = omega + accel * dt;
  const newAngleDeg = angleDeg + newOmega * RAD * dt;
  return {
    angle: ((newAngleDeg % 360) + 360) % 360,
    velocity: newOmega * RAD,
    torque,
  };
}

/** Random Gaussian noise via Box-Muller. */
export function gaussian(mean = 0, stddev = 1): number {
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export interface PerformanceInputs {
  errors: number[];
  outputs: number[];
  dt: number;
  /** Threshold for considering the system "settled" (degrees). */
  settledBand?: number;
}

/** Compute step-response performance metrics from a recent window. */
export function computeMetrics(input: PerformanceInputs): {
  peakOvershoot: number;
  settlingTime: number | null;
  steadyStateError: number;
  energy: number;
  rms: number;
} {
  const { errors, outputs, dt, settledBand = 1.5 } = input;
  if (errors.length === 0) {
    return {
      peakOvershoot: 0,
      settlingTime: null,
      steadyStateError: 0,
      energy: 0,
      rms: 0,
    };
  }
  const initial = errors[0];
  let peak = initial;
  for (const e of errors) {
    if (Math.sign(e) !== Math.sign(initial) && Math.abs(e) > Math.abs(peak)) {
      peak = e;
    }
  }
  const overshoot =
    initial !== 0
      ? Math.max(0, (Math.abs(peak) / Math.abs(initial)) * 100 - 100)
      : 0;
  let settlingTime: number | null = null;
  for (let i = 0; i < errors.length; i++) {
    let stable = true;
    for (let j = i; j < errors.length; j++) {
      if (Math.abs(errors[j]) > settledBand) {
        stable = false;
        break;
      }
    }
    if (stable) {
      settlingTime = i * dt;
      break;
    }
  }
  const tail = errors.slice(-Math.min(20, errors.length));
  const sse =
    tail.reduce((sum, e) => sum + Math.abs(e), 0) / Math.max(1, tail.length);
  // Energy = Σ |u| · dt (proportional to torque-time)
  const energy = outputs.reduce((sum, u) => sum + Math.abs(u) * dt, 0);
  const rms = Math.sqrt(
    errors.reduce((sum, e) => sum + e * e, 0) / errors.length,
  );
  return { peakOvershoot: overshoot, settlingTime, steadyStateError: sse, energy, rms };
}
