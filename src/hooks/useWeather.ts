import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CurrentWeather,
  FetchState,
  HourlyWeather,
  WeatherSnapshot,
} from "../types/weather";
import { STATION } from "../constants";

const REFRESH_MS = 60_000;

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    showers: number;
    snowfall: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    cloud_cover: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    weather_code: number[];
    pressure_msl: number[];
  };
}

function buildUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "cloud_cover",
      "visibility",
      "wind_speed_10m",
      "wind_direction_10m",
      "weather_code",
      "pressure_msl",
    ].join(","),
    timezone: "Europe/Bucharest",
    forecast_days: "2",
    wind_speed_unit: "ms",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function transform(response: OpenMeteoResponse): WeatherSnapshot {
  const c = response.current;
  const current: CurrentWeather = {
    time: new Date(c.time),
    temperature: c.temperature_2m,
    apparentTemperature: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    rain: c.rain,
    showers: c.showers,
    snowfall: c.snowfall,
    weatherCode: c.weather_code,
    cloudCover: c.cloud_cover,
    pressureMsl: c.pressure_msl,
    surfacePressure: c.surface_pressure,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m,
  };
  const h = response.hourly;
  const hourly: HourlyWeather = {
    time: h.time.map((t) => new Date(t)),
    temperature: h.temperature_2m,
    humidity: h.relative_humidity_2m,
    cloudCover: h.cloud_cover,
    visibility: h.visibility,
    windSpeed: h.wind_speed_10m,
    windDirection: h.wind_direction_10m,
    weatherCode: h.weather_code,
    pressureMsl: h.pressure_msl,
  };
  return {
    station: STATION.icao,
    fetchedAt: new Date(),
    current,
    hourly,
  };
}

export interface UseWeatherResult {
  state: FetchState<WeatherSnapshot>;
  refetch: () => Promise<void>;
  countdownMs: number;
}

export function useWeather(
  lat = STATION.lat,
  lon = STATION.lon,
): UseWeatherResult {
  const [state, setState] = useState<FetchState<WeatherSnapshot>>({
    status: "idle",
  });
  const [countdownMs, setCountdownMs] = useState(REFRESH_MS);
  const lastFetchRef = useRef<number>(0);

  const fetchOnce = useCallback(async () => {
    setState((prev) =>
      prev.status === "success"
        ? { status: "loading", data: prev.data }
        : { status: "loading" },
    );
    try {
      const res = await fetch(buildUrl(lat, lon));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as OpenMeteoResponse;
      const snapshot = transform(json);
      setState({ status: "success", data: snapshot });
      lastFetchRef.current = Date.now();
      setCountdownMs(REFRESH_MS);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setState((prev) => ({
        status: "error",
        error: msg,
        data: prev.status === "success" ? prev.data : undefined,
      }));
      lastFetchRef.current = Date.now();
      setCountdownMs(REFRESH_MS);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  useEffect(() => {
    if (lastFetchRef.current === 0) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - lastFetchRef.current;
      const remaining = REFRESH_MS - elapsed;
      if (remaining <= 0) {
        fetchOnce();
      } else {
        setCountdownMs(remaining);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [fetchOnce, state.status]);

  return { state, refetch: fetchOnce, countdownMs };
}
