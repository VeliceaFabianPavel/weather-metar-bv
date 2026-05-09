import { useMemo, useRef, useState } from "react";
import { Panel } from "../components/Panel";
import { MetricCard } from "../components/MetricCard";
import { CountdownRing } from "../components/CountdownRing";
import { StatusDot } from "../components/StatusDot";
import { ExportToolbar, type CSVPayload } from "../components/ExportToolbar";
import { useWeather } from "../hooks/useWeather";
import { useRealMETAR } from "../hooks/useRealMETAR";
import {
  describeWeatherCode,
  formatPressure,
  formatTemp,
  formatVisibility,
  formatWindKt,
  pad,
  MS_TO_KT,
} from "../utils/format";
import { METARDisplay } from "../components/metar/METARDisplay";
import { METARDecoder } from "../components/metar/METARDecoder";
import { WeatherCharts } from "../components/metar/WeatherCharts";
import { ManualMETAR } from "../components/metar/ManualMETAR";

function pressureTrend(values: number[]): "rising" | "falling" | "stable" {
  if (values.length < 3) return "stable";
  const head = values[0];
  const tail = values[values.length - 1];
  const diff = tail - head;
  if (diff > 1) return "rising";
  if (diff < -1) return "falling";
  return "stable";
}

export function METARLive() {
  const weather = useWeather();
  const metar = useRealMETAR();
  const [showManual, setShowManual] = useState(false);
  const forecastRef = useRef<HTMLDivElement>(null);

  const snapshot = weather.state.data;
  const metarData = metar.state.data;
  const metarLoading = metar.state.status === "loading" && !metarData;
  const metarError = metar.state.status === "error" ? metar.state.error : null;

  const forecastCSV = (): CSVPayload | null => {
    if (!snapshot) return null;
    const h = snapshot.hourly;
    const rows = h.time.slice(0, 48).map((t, i) => ({
      time_utc: t.toISOString(),
      temperature_C: h.temperature[i],
      humidity_pct: h.humidity[i],
      cloudCover_pct: h.cloudCover[i],
      visibility_m: h.visibility[i],
      windSpeed_ms: h.windSpeed[i],
      windDirection_deg: h.windDirection[i],
      pressureMsl_hPa: h.pressureMsl[i],
      weatherCode_wmo: h.weatherCode[i],
    }));
    return {
      rows,
      meta: {
        header: [
          "Open-Meteo 48 h forecast · ICON+GFS ensemble",
          `Station: ${snapshot.station}`,
          `Fetched: ${snapshot.fetchedAt.toISOString()}`,
        ],
      },
    };
  };

  const trend = useMemo<"rising" | "falling" | "stable">(() => {
    if (!snapshot) return "stable";
    const now = Date.now();
    const recent: number[] = [];
    snapshot.hourly.time.forEach((t, i) => {
      if (t.getTime() <= now && recent.length < 3) {
        const p = snapshot.hourly.pressureMsl[i];
        if (Number.isFinite(p)) recent.unshift(p);
      }
    });
    return pressureTrend(recent.reverse());
  }, [snapshot]);

  return (
    <div className="space-y-3">
      {/* Real METAR — primary panel */}
      <Panel
        id="[01]"
        title={
          metarData?.fallback
            ? `Real METAR · ${metarData.station} (LRBV unavailable)`
            : "Real METAR · LRBV"
        }
        meta={
          metarData
            ? `${metarData.source} · issued ${metarData.parsed.time.toISOString().slice(11, 16)}Z`
            : undefined
        }
        trailing={
          <div className="flex items-center gap-3">
            {metarData?.fallback && (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-solar">
                LRBV silent → {metarData.station}
              </span>
            )}
            {metar.state.status === "error" && (
              <StatusDot status="error" label="OFFLINE" />
            )}
            {metar.state.status === "success" && <StatusDot status="online" />}
            <CountdownRing
              remainingMs={metar.countdownMs}
              totalMs={60_000}
              size={32}
            />
            <button
              onClick={() => metar.refetch()}
              className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary hover:border-accent-solar hover:text-accent-solar"
            >
              [ refresh ]
            </button>
          </div>
        }
      >
        {metarLoading && (
          <div className="flex h-24 items-center justify-center font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
            Querying aviationweather.gov…
          </div>
        )}
        {metarError && !metarData && (
          <div className="border border-accent-red/40 bg-bg-tertiary p-3 font-mono text-[11px] text-accent-red">
            Real METAR feed unavailable: {metarError}.<br />
            <span className="text-text-secondary">
              LRBV is a regional airport — METAR may not be broadcast at all hours.
              The Open-Meteo derived observation below is the operational fallback.
            </span>
          </div>
        )}
        {metarData && (
          <div className="space-y-3">
            <METARDisplay
              raw={metarData.raw}
              source={`${metarData.station} · ${metarData.source} · cycle ${metarData.parsed.time.toISOString().slice(11, 16)}Z`}
            />
            <METARDecoder parsed={metarData.parsed} />
          </div>
        )}
      </Panel>

      {/* Section A — Live readouts from Open-Meteo */}
      {snapshot && (
        <>
          <div className="flex items-baseline gap-3 px-1">
            <span className="frame-id">[02]</span>
            <span className="frame-title">Surface Observations · Open-Meteo</span>
            <span className="frame-meta">
              T+{Math.floor((Date.now() - snapshot.fetchedAt.getTime()) / 1000)}s
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              label="Temperature"
              value={formatTemp(snapshot.current.temperature, 1).replace("°C", "")}
              unit="°C"
              accent={
                snapshot.current.temperature < 0
                  ? "cyan"
                  : snapshot.current.temperature > 25
                    ? "solar"
                    : "neutral"
              }
              hint={`Feels ${formatTemp(snapshot.current.apparentTemperature)}`}
            />
            <MetricCard
              label="Wind"
              value={formatWindKt(snapshot.current.windSpeed)}
              unit="kt"
              accent="cyan"
              hint={`Gust ${formatWindKt(snapshot.current.windGusts)}kt · ${pad(
                Math.round(snapshot.current.windDirection),
                3,
              )}°`}
              trailing={
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
                  <g
                    style={{
                      transform: `rotate(${snapshot.current.windDirection + 180}deg)`,
                      transformOrigin: "11px 11px",
                      transition: "transform 600ms ease",
                    }}
                  >
                    <line
                      x1="11"
                      y1="3"
                      x2="11"
                      y2="19"
                      stroke="var(--accent-cyan)"
                      strokeWidth="1.4"
                    />
                    <polygon points="11,3 8,9 14,9" fill="var(--accent-cyan)" />
                  </g>
                </svg>
              }
            />
            <MetricCard
              label="Visibility"
              value={
                formatVisibility(
                  snapshot.hourly.visibility[0] ?? 9999,
                ).replace(" km", "").replace(" m", "")
              }
              unit={(snapshot.hourly.visibility[0] ?? 9999) >= 1000 ? "km" : "m"}
              accent="green"
              hint={describeWeatherCode(snapshot.current.weatherCode).label}
            />
            <MetricCard
              label="Cloud Cover"
              value={Math.round(snapshot.current.cloudCover)}
              unit="%"
              accent="neutral"
              hint={
                snapshot.current.snowfall > 0
                  ? `SN ${snapshot.current.snowfall.toFixed(1)}mm/h`
                  : snapshot.current.rain > 0
                    ? `RA ${snapshot.current.rain.toFixed(1)}mm/h`
                    : snapshot.current.cloudCover > 90
                      ? "Overcast"
                      : snapshot.current.cloudCover > 50
                        ? "Broken"
                        : "Clear"
              }
            />
            <MetricCard
              label="Pressure"
              value={formatPressure(snapshot.current.pressureMsl)}
              unit="hPa"
              accent="purple"
              hint={`Trend ${trend}`}
              trailing={
                <span
                  className="font-mono text-xs"
                  style={{
                    color:
                      trend === "rising"
                        ? "var(--accent-green)"
                        : trend === "falling"
                          ? "var(--accent-red)"
                          : "var(--text-dim)",
                  }}
                >
                  {trend === "rising" ? "▲" : trend === "falling" ? "▼" : "—"}
                </span>
              }
            />
            <MetricCard
              label="Humidity"
              value={Math.round(snapshot.current.humidity)}
              unit="%"
              accent="cyan"
              hint={`Wind ${(snapshot.current.windSpeed * MS_TO_KT).toFixed(0)}kt sustained`}
            />
          </div>
        </>
      )}

      {/* Section C: 48h forecast */}
      {snapshot && (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <div className="flex items-baseline gap-3">
              <span className="frame-id">[03]</span>
              <span className="frame-title">48-Hour Forecast · GFS+ICON ensemble</span>
            </div>
            <ExportToolbar
              targetRef={forecastRef}
              filename="metar-48h-forecast"
              csv={() => forecastCSV() ?? { rows: [] }}
              imageDisabled
            />
          </div>
          <div ref={forecastRef}>
            <WeatherCharts hourly={snapshot.hourly} hoursAhead={48} />
          </div>
        </div>
      )}

      {/* Section D: optional manual decoder (collapsed by default) */}
      <Panel
        id="[04]"
        title="METAR Decoder"
        meta="Paste any external METAR to inspect"
        trailing={
          <button
            onClick={() => setShowManual((v) => !v)}
            className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary hover:border-accent-solar hover:text-accent-solar"
          >
            [ {showManual ? "hide" : "open"} ]
          </button>
        }
      >
        {showManual ? (
          <ManualMETAR />
        ) : (
          <div className="font-mono text-[11px] text-text-dim">
            Decoder is closed — open to paste any METAR string for parsing.
          </div>
        )}
      </Panel>
    </div>
  );
}
