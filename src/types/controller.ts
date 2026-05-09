export interface FOPIDParams {
  Kp: number;
  Ki: number;
  Kd: number;
  lambda: number;
  mu: number;
}

export interface PlantParams {
  inertia: number;
  motorTorqueConstant: number;
  friction: number;
  gearRatio: number;
  maxTorque: number;
}

export interface SimulationSample {
  t: number;
  target: number;
  current: number;
  error: number;
  output: number;
  P: number;
  I: number;
  D: number;
  velocity: number;
  classicalCurrent?: number;
  classicalError?: number;
}

export interface SimulationMetrics {
  currentError: number;
  peakOvershoot: number;
  settlingTime: number | null;
  steadyStateError: number;
  energyConsumed: number;
  rms: number;
}

export interface DisturbanceEvent {
  id: string;
  type: "wind" | "cloud" | "load" | "friction";
  startedAt: number;
  duration: number;
  magnitude: number;
  label: string;
}

export interface SimulationState {
  history: SimulationSample[];
  classical?: SimulationSample[];
  metrics: SimulationMetrics;
  disturbances: DisturbanceEvent[];
  running: boolean;
  compareMode: boolean;
}
