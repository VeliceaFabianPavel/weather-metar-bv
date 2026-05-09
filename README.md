<div align="center">

**A live mission-control dashboard for a sun-tracking rotating dome house in Brașov, Romania.**

Real aviation weather · solar mechanics · control-system simulation · ten years of climate history · interactive energy model - all in a single dark-themed instrument-style web app, with **no backend** and **no mocked data**.

</div>

---

## What is this?

Imagine a circular house with a glass dome that slowly rotates throughout the day so its largest windows always face the sun. To do that well, the house needs to know:

- **Where is the sun right now?** → real solar-position math, updated every second
- **Where is the house pointing?** → a rotation controller (a "smart steering" algorithm)
- **What's the weather doing?** → live aviation observations and forecasts
- **What's normal for this place?** → ten years of historical climate
- **Does the rotation actually save energy?** → a thermal and financial model

This dashboard answers all five questions in one screen. It looks like an aerospace ground station and runs entirely in your browser. No installation server-side, no API keys, no mocks - every number on screen is fetched live from public weather networks the moment you open the page.

---

## Four tabs at a glance

| | Tab | What it shows |
|--|---|---|
| **F1** | **METAR** | The real, current aviation weather report for the airport, refreshed every minute |
| **F2** | **Solar / FOPID** | Where the sun is, where the house is pointing, and the rotation controller in action |
| **F3** | **Climate** | A decade of daily temperature, rain, wind, and sunshine for the city and the nearby mountain resort |
| **F4** | **Energy** | How much heating, cooling, and rainwater the dome saves - and when the investment pays off |

---

## F1 · METAR live

> METAR is the standardized text format aviation reports use worldwide. It looks like `LRBV 090000Z AUTO 05005KT 8000 FEW047/// OVC093/// 13/13 Q1015` - and it tells a pilot everything they need to know in one line.

The tab pulls the **real, live METAR for Brașov-Ghimbav airport** (ICAO code: LRBV) directly from international aviation weather networks. Every segment of the string is color-coded by role - wind in cyan, visibility in green, temperature in amber, pressure in purple - and a human-readable decode table sits below.

Around it: a strip of live readouts (temperature, wind, gusts, visibility, cloud cover, pressure, humidity), a 48-hour forecast block (temperature curve, wind+gusts, cloud cover), and an optional decoder where you can paste any external METAR to inspect.

If the airport's signal goes silent, the panel automatically falls back to nearby Romanian stations (Bucharest Otopeni, Sibiu, Bacău, Timișoara) and tells you so.

---

## F2 · Solar control & rotation simulator

The most technical tab - and the heart of the project.

**Where is the sun?** Standard astronomical formulas compute the sun's azimuth (compass bearing) and elevation (height above the horizon) every second. Sunrise, solar noon, and sunset for today are shown alongside.

**Today's Solar Window** - a Cartesian chart with the sun's elevation curve through the entire day in gold, the sun's compass bearing as a dashed cyan line, and a "now" cursor that ticks across in real time. You can hover any minute to read off exact values.

**Azimuth Tape** - a horizontal compass strip 0°–360° with three pointers:
- **☼ Sun** (gold) - where the sunlight is coming from
- **H House** (cyan) - where the dome is currently pointing
- **P Classical** (purple, optional) - where a traditional controller would point

A colored bar between sun and house shows the angular error - green when aligned, amber when slightly off, red when far off.

**The controller** simulates a *fractional-order* PID - a more advanced cousin of the standard PID algorithm that uses fractional calculus to give smoother, more energy-efficient tracking. You can tune all five coefficients with sliders and watch the dome track the sun in real time. A side-by-side **Comparison Mode** runs a classical PID alongside so you can see exactly how much better (or worse) the fractional version is for your settings.

**Performance metrics** - current error, peak overshoot, settling time, steady-state error, RMS error, energy consumed - recomputed live.

**Step Response Test** - apply a synthetic 90° (or any) angle change and watch the open-loop response.

**Disturbance Injection** - buttons to simulate wind gusts, cloud passes, load shifts, and friction spikes, so you can see how the controller copes with real-world upsets.

---

## F3 · Climate history

Ten years of daily weather data (2015–2024) for both **Brașov city** (528 m elevation) and the mountain resort of **Poiana Brașov** (1020 m), pulled from the ERA5 reanalysis archive.

| Visualization | What it tells you |
|---|---|
| **Temperature heatmap** | A 10-year × 366-day grid where every cell is one day - instantly shows the shape of each year |
| **Monthly range chart** | Min / p25 / median / p75 / max temperature for each month |
| **Annual precipitation** | Monthly bars with rain and snow stacked, switchable by year |
| **Wind rose** | Direction × speed frequency, filterable by season and year |
| **Solar radiation** | Actual vs theoretical clear-sky - the gap is energy lost to clouds |
| **City vs mountain** | Mean monthly temperature comparison, with cold-pool inversion months highlighted |
| **Heating Degree Days** | The annual heating-demand fingerprint, base 18 °C |
| **Climate trends** | Linear regression of annual temperature and precipitation, with R² |
| **Summary stats** | Hottest day, coldest day, longest dry streak, average frost dates, sunshine hours |

The fetch happens once and is cached locally for 30 days, so subsequent visits are instant.

---

## F4 · Energy model

An interactive thermal and financial model. You edit the building parameters - floor area, dome diameter, glazing ratio, U-values, infiltration rate, setpoints, PV area, etc. - and **every chart updates live**.

- **Monthly energy balance** - heating demand vs cooling demand vs solar gains, comparing three scenarios: a static dome, a FOPID-tracked dome, and an "ideal" perfect tracker
- **Daily energy profile** - hour-by-hour gains and losses for a typical winter or summer day
- **Cost comparison** - annual heating cost across gas, heat pump (COP 3.0), and wood pellets, with editable energy prices
- **NZEB analysis** - does the PV generation on the dome cover the building's annual consumption? (NZEB = Nearly Zero Energy Building)
- **Rainwater catchment** - how many litres the dome surface collects each month, with a household-usage reference line
- **Investment payback calculator** - simple payback, discounted payback (NPV), and CO₂ emissions avoided over a configurable horizon

---

## Where the data comes from

| Source | What we fetch | Refresh |
|---|---|---|
| **Vatsim METAR network** (primary) | The real LRBV METAR string | Every 60 s |
| **NOAA AviationWeather** (proxy fallback) | Same, when Vatsim is unreachable | Every 60 s |
| **Open-Meteo Forecast API** | Current temperature/wind/pressure + 48-hour hourly forecast | Every 60 s |
| **Open-Meteo Archive (ERA5)** | 2015–2024 daily climate data for two stations | Once, cached 30 days |

All endpoints are free and CORS-friendly. **No API keys required.**

---

## Quick start

```bash
# Install dependencies (~30 seconds)
npm install

# Start the dev server (opens at http://localhost:5173)
npm run dev

# Type check
npm run typecheck

# Production build (output → dist/)
npm run build
```

Requires Node.js 18 or newer. The production build is a fully static SPA - `dist/` can be hosted anywhere that serves static files.

---

## Tech stack

- **React 18** + **TypeScript** (strict mode)
- **Vite 5** for dev server and build
- **Tailwind CSS 3** for styling
- **Recharts** for charts
- **Custom SVG** for the wind rose, temperature heatmap, and azimuth tape
- **No backend, no database, no external state management** - pure client-side React with built-in hooks

---

## Project layout

```
src/
├── App.tsx              · tab shell + global clock provider
├── main.tsx             · entry point
├── index.css            · theme, console-frame styles, scan-line texture
├── constants.ts         · station, building, energy-price constants
│
├── types/               · TypeScript shapes
├── utils/               · pure logic, no React
│   ├── metar.ts         · METAR parser + tokenizer + generator
│   ├── realMetar.ts     · live METAR fetcher with fallback chain
│   ├── solar.ts         · solar position math (Julian day, declination…)
│   ├── fopid.ts         · Grünwald-Letnikov fractional calculus
│   ├── climate.ts       · aggregation + statistics
│   ├── energy.ts        · heat balance + payback calculations
│   └── format.ts        · display helpers
├── hooks/               · React data hooks (useWeather, useFOPID, …)
├── components/          · reusable UI primitives + per-tab components
└── pages/               · the four tab pages
```

---

## Design language

The look is deliberately *not* generic dashboard. It draws from aerospace ground-station and scientific instrument panels:

- Near-black background with subtle scan-line texture
- Two-color accent system - **amber** for solar / primary, **cyan** for technology / secondary
- IBM Plex Mono for every number, with tabular figures so columns align
- Sharp 0-radius frames with amber corner brackets at top-left and bottom-right
- Function-key tabs: **F1 · METAR**, **F2 · Solar**, **F3 · Climate**, **F4 · Energy**
- Numbered panels like real instruments: `[01]`, `[02]`, `[03]`…
- Bracketed buttons: `[ refresh ]`, `[ pause ]`, `[ defaults ]`

---

## A note for non-technical readers

Most of the math and engineering happens behind the scenes. You don't need to understand fractional calculus or solar declination to use this dashboard - just open it, click through the four tabs, and read the numbers. The METAR tab is plain weather, the Solar tab is a live picture of where the sun is, the Climate tab is a decade of weather summarized, and the Energy tab is "how much money would the rotation save."

If you're curious what any chart means, hover over it - every chart has tooltips that explain the values.

---

## License

MIT - feel free to adapt the dashboard, the controller code, or the climate analysis for your own projects.
