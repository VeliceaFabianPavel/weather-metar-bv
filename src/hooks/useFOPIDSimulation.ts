import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeMetrics,
  fopidControl,
  gaussian,
  plantStep,
  shortestAngularError,
} from "../utils/fopid";
import type {
  DisturbanceEvent,
  FOPIDParams,
  PlantParams,
  SimulationMetrics,
  SimulationSample,
} from "../types/controller";
import { FOPID_DEFAULTS, PLANT } from "../constants";

const DT = 0.1; // 10 Hz timestep
const HISTORY_SECONDS = 600; // 10 simulated minutes
const HISTORY_SAMPLES = HISTORY_SECONDS / DT; // 6000 samples
const ERROR_MEMORY = 50;

interface UseFOPIDSimulationOptions {
  /** Function returning current target azimuth (deg). */
  getTarget: () => number;
  /** Current wind speed in m/s — drives noise/disturbance magnitude. */
  windSpeed: number;
  enabled?: boolean;
}

export interface UseFOPIDSimulationResult {
  history: SimulationSample[];
  classicalHistory: SimulationSample[];
  metrics: SimulationMetrics;
  classicalMetrics: SimulationMetrics;
  params: FOPIDParams;
  setParams: (p: FOPIDParams | ((prev: FOPIDParams) => FOPIDParams)) => void;
  plant: PlantParams;
  compareMode: boolean;
  setCompareMode: (v: boolean) => void;
  disturbances: DisturbanceEvent[];
  injectDisturbance: (type: DisturbanceEvent["type"]) => void;
  reset: () => void;
  runStepResponse: (step: number) => SimulationSample[];
  currentAngle: number;
  classicalAngle: number;
}

export function useFOPIDSimulation(
  opts: UseFOPIDSimulationOptions,
): UseFOPIDSimulationResult {
  const [params, setParams] = useState<FOPIDParams>({ ...FOPID_DEFAULTS });
  const [compareMode, setCompareMode] = useState(false);
  const [history, setHistory] = useState<SimulationSample[]>([]);
  const [classicalHistory, setClassicalHistory] = useState<SimulationSample[]>([]);
  const [disturbances, setDisturbances] = useState<DisturbanceEvent[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    currentError: 0,
    peakOvershoot: 0,
    settlingTime: null,
    steadyStateError: 0,
    energyConsumed: 0,
    rms: 0,
  });
  const [classicalMetrics, setClassicalMetrics] = useState<SimulationMetrics>({
    currentError: 0,
    peakOvershoot: 0,
    settlingTime: null,
    steadyStateError: 0,
    energyConsumed: 0,
    rms: 0,
  });

  const stateRef = useRef({
    angle: 180,
    velocity: 0,
    errors: [] as number[],
    samples: [] as SimulationSample[],
    classicalAngle: 180,
    classicalVelocity: 0,
    classicalErrors: [] as number[],
    classicalSamples: [] as SimulationSample[],
    t: 0,
    paramsRef: { ...FOPID_DEFAULTS } as FOPIDParams,
  });

  // Keep params ref in sync to avoid stale closure inside the loop.
  useEffect(() => {
    stateRef.current.paramsRef = params;
  }, [params]);

  const getTargetRef = useRef(opts.getTarget);
  useEffect(() => {
    getTargetRef.current = opts.getTarget;
  }, [opts.getTarget]);

  const windRef = useRef(opts.windSpeed);
  useEffect(() => {
    windRef.current = opts.windSpeed;
  }, [opts.windSpeed]);

  const enabledRef = useRef(opts.enabled ?? true);
  useEffect(() => {
    enabledRef.current = opts.enabled ?? true;
  }, [opts.enabled]);

  const compareRef = useRef(compareMode);
  useEffect(() => {
    compareRef.current = compareMode;
  }, [compareMode]);

  const disturbancesRef = useRef(disturbances);
  useEffect(() => {
    disturbancesRef.current = disturbances;
  }, [disturbances]);

  const reset = useCallback(() => {
    stateRef.current.angle = 180;
    stateRef.current.velocity = 0;
    stateRef.current.errors = [];
    stateRef.current.samples = [];
    stateRef.current.classicalAngle = 180;
    stateRef.current.classicalVelocity = 0;
    stateRef.current.classicalErrors = [];
    stateRef.current.classicalSamples = [];
    stateRef.current.t = 0;
    setHistory([]);
    setClassicalHistory([]);
    setDisturbances([]);
  }, []);

  const injectDisturbance = useCallback((type: DisturbanceEvent["type"]) => {
    const wind = windRef.current;
    let event: DisturbanceEvent;
    const startedAt = Date.now();
    switch (type) {
      case "wind":
        event = {
          id: `${type}-${startedAt}`,
          type,
          startedAt,
          duration: 5000,
          magnitude: Math.max(50, wind * 80),
          label: `Wind gust (${(wind * 1.94).toFixed(0)} kt)`,
        };
        break;
      case "cloud":
        event = {
          id: `${type}-${startedAt}`,
          type,
          startedAt,
          duration: 30000,
          magnitude: 1,
          label: "Cloud pass",
        };
        break;
      case "load":
        event = {
          id: `${type}-${startedAt}`,
          type,
          startedAt,
          duration: 60000,
          magnitude: 0.2,
          label: "Load shift ±20%",
        };
        break;
      case "friction":
        event = {
          id: `${type}-${startedAt}`,
          type,
          startedAt,
          duration: 10000,
          magnitude: 3,
          label: "Friction spike (×3)",
        };
        break;
    }
    setDisturbances((d) => [...d, event].slice(-12));
  }, []);

  // Simulation loop @ 10 Hz
  useEffect(() => {
    const id = setInterval(() => {
      if (!enabledRef.current) return;
      const s = stateRef.current;
      s.t += DT;
      const target = getTargetRef.current();

      // Active disturbances
      const now = Date.now();
      const active = disturbancesRef.current.filter(
        (d) => now - d.startedAt < d.duration,
      );
      const wind = windRef.current;
      let extTorque = gaussian(0, Math.max(0.5, wind * 5));
      let inertiaMul = 1;
      let frictionMul = 1;
      let cloudOverride = false;
      for (const d of active) {
        if (d.type === "wind") extTorque += d.magnitude * (Math.random() - 0.3);
        if (d.type === "load") inertiaMul = 1 + d.magnitude;
        if (d.type === "friction") frictionMul = d.magnitude;
        if (d.type === "cloud") cloudOverride = true;
      }

      const effectiveTarget = cloudOverride ? s.angle : target;

      // FOPID branch
      const error = shortestAngularError(effectiveTarget, s.angle);
      s.errors.push(error);
      if (s.errors.length > ERROR_MEMORY) s.errors.shift();
      const ctl = fopidControl(s.errors, s.paramsRef, DT);
      const next = plantStep(
        s.angle,
        s.velocity,
        ctl.output,
        PLANT,
        DT,
        extTorque,
        inertiaMul,
        frictionMul,
      );
      s.angle = next.angle;
      s.velocity = next.velocity;
      const sample: SimulationSample = {
        t: s.t,
        target: effectiveTarget,
        current: s.angle,
        error,
        output: ctl.output,
        P: ctl.P,
        I: ctl.I,
        D: ctl.D,
        velocity: s.velocity,
      };

      // Classical PID branch (lambda=mu=1) for compare mode
      if (compareRef.current) {
        const cErr = shortestAngularError(effectiveTarget, s.classicalAngle);
        s.classicalErrors.push(cErr);
        if (s.classicalErrors.length > ERROR_MEMORY) s.classicalErrors.shift();
        const classicalParams: FOPIDParams = {
          ...s.paramsRef,
          lambda: 1,
          mu: 1,
        };
        const cCtl = fopidControl(s.classicalErrors, classicalParams, DT);
        const cNext = plantStep(
          s.classicalAngle,
          s.classicalVelocity,
          cCtl.output,
          PLANT,
          DT,
          extTorque,
          inertiaMul,
          frictionMul,
        );
        s.classicalAngle = cNext.angle;
        s.classicalVelocity = cNext.velocity;
        s.classicalSamples.push({
          t: s.t,
          target: effectiveTarget,
          current: s.classicalAngle,
          error: cErr,
          output: cCtl.output,
          P: cCtl.P,
          I: cCtl.I,
          D: cCtl.D,
          velocity: s.classicalVelocity,
        });
        if (s.classicalSamples.length > HISTORY_SAMPLES) {
          s.classicalSamples.splice(0, s.classicalSamples.length - HISTORY_SAMPLES);
        }
        sample.classicalCurrent = s.classicalAngle;
        sample.classicalError = cErr;
      }

      s.samples.push(sample);
      if (s.samples.length > HISTORY_SAMPLES) {
        s.samples.splice(0, s.samples.length - HISTORY_SAMPLES);
      }
    }, DT * 1000);
    return () => clearInterval(id);
  }, []);

  // Throttled state sync to React (~4 fps display rate keeps the UI smooth
  // without flooding the reconciler — the underlying sim still runs at 10 Hz)
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current;
      const sliced = s.samples.slice(-600);
      const cSliced = s.classicalSamples.slice(-600);
      setHistory(sliced);
      setClassicalHistory(cSliced);
      const errs = sliced.map((x) => x.error);
      const outs = sliced.map((x) => x.output);
      const m = computeMetrics({ errors: errs, outputs: outs, dt: DT });
      setMetrics({
        currentError: errs[errs.length - 1] ?? 0,
        peakOvershoot: m.peakOvershoot,
        settlingTime: m.settlingTime,
        steadyStateError: m.steadyStateError,
        energyConsumed: m.energy,
        rms: m.rms,
      });
      if (compareRef.current && cSliced.length) {
        const cErrs = cSliced.map((x) => x.error);
        const cOuts = cSliced.map((x) => x.output);
        const cm = computeMetrics({ errors: cErrs, outputs: cOuts, dt: DT });
        setClassicalMetrics({
          currentError: cErrs[cErrs.length - 1] ?? 0,
          peakOvershoot: cm.peakOvershoot,
          settlingTime: cm.settlingTime,
          steadyStateError: cm.steadyStateError,
          energyConsumed: cm.energy,
          rms: cm.rms,
        });
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  /** Run an offline step-response simulation for plot/test purposes. */
  const runStepResponse = useCallback(
    (step: number): SimulationSample[] => {
      const samples: SimulationSample[] = [];
      const errors: number[] = [];
      let angle = 0;
      let velocity = 0;
      const target = step;
      const steps = Math.round(15 / DT); // 15 simulated seconds
      for (let i = 0; i < steps; i++) {
        const t = i * DT;
        const error = shortestAngularError(target, angle);
        errors.push(error);
        if (errors.length > ERROR_MEMORY) errors.shift();
        const ctl = fopidControl(errors, params, DT);
        const next = plantStep(angle, velocity, ctl.output, PLANT, DT);
        angle = next.angle;
        velocity = next.velocity;
        samples.push({
          t,
          target,
          current: angle,
          error,
          output: ctl.output,
          P: ctl.P,
          I: ctl.I,
          D: ctl.D,
          velocity,
        });
      }
      return samples;
    },
    [params],
  );

  return {
    history,
    classicalHistory,
    metrics,
    classicalMetrics,
    params,
    setParams,
    plant: PLANT,
    compareMode,
    setCompareMode,
    disturbances,
    injectDisturbance,
    reset,
    runStepResponse,
    currentAngle: stateRef.current.angle,
    classicalAngle: stateRef.current.classicalAngle,
  };
}
