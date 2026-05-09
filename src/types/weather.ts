export interface CloudLayer {
  coverage: "FEW" | "SCT" | "BKN" | "OVC" | "SKC" | "CLR" | "NSC";
  base: number;
  type?: "CB" | "TCU";
}

export type WindUnit = "KT" | "MPS";
export type PressureUnit = "Q" | "A";

export interface ParsedMETAR {
  station: string;
  time: Date;
  rawTime?: string;
  wind: {
    direction: number | "VRB";
    speed: number;
    gusts?: number;
    variable?: [number, number];
    unit: WindUnit;
  };
  visibility: number;
  clouds: CloudLayer[];
  temperature: number;
  dewpoint: number;
  pressure: { value: number; unit: PressureUnit };
  weather?: string[];
  remarks?: string;
  isAuto?: boolean;
  raw: string;
}

export interface CurrentWeather {
  time: Date;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  pressureMsl: number;
  surfacePressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
}

export interface HourlyWeather {
  time: Date[];
  temperature: number[];
  humidity: number[];
  cloudCover: number[];
  visibility: number[];
  windSpeed: number[];
  windDirection: number[];
  weatherCode: number[];
  pressureMsl: number[];
}

export interface WeatherSnapshot {
  station: string;
  fetchedAt: Date;
  current: CurrentWeather;
  hourly: HourlyWeather;
}

export type FetchState<T> =
  | { status: "idle"; data?: T }
  | { status: "loading"; data?: T }
  | { status: "success"; data: T }
  | { status: "error"; error: string; data?: T };
