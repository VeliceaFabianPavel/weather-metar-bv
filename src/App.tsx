import { lazy, Suspense, useState } from "react";
import { Header } from "./components/Header";
import { TabBar, type TabDef } from "./components/TabBar";
import { METARLive } from "./pages/METARLive";
import { SolarControl } from "./pages/SolarControl";
import { ClockProvider } from "./hooks/useClock";

const ClimateHistory = lazy(() =>
  import("./pages/ClimateHistory").then((m) => ({ default: m.ClimateHistory })),
);
const EnergyModel = lazy(() =>
  import("./pages/EnergyModel").then((m) => ({ default: m.EnergyModel })),
);
const ResearchTools = lazy(() =>
  import("./pages/ResearchTools").then((m) => ({ default: m.ResearchTools })),
);

type TabKey = "metar" | "solar" | "climate" | "energy" | "research";

const TABS: TabDef<TabKey>[] = [
  { key: "metar", label: "METAR", hint: "60s sync" },
  { key: "solar", label: "Solar / FOPID", hint: "10 Hz sim" },
  { key: "climate", label: "Climate", hint: "10y archive" },
  { key: "energy", label: "Energy", hint: "thermal model" },
  { key: "research", label: "Research", hint: "export · cite" },
];

export default function App() {
  const [active, setActive] = useState<TabKey>("metar");

  return (
    <ClockProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <TabBar tabs={TABS} active={active} onChange={setActive} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 md:px-4 md:py-5">
          <div key={active} className="tab-fade">
            {active === "metar" && <METARLive />}
            {active === "solar" && <SolarControl />}
            {active === "climate" && (
              <Suspense fallback={<TabFallback label="Loading climate archive…" />}>
                <ClimateHistory />
              </Suspense>
            )}
            {active === "energy" && (
              <Suspense fallback={<TabFallback label="Loading energy model…" />}>
                <EnergyModel />
              </Suspense>
            )}
            {active === "research" && (
              <Suspense fallback={<TabFallback label="Loading research tools…" />}>
                <ResearchTools />
              </Suspense>
            )}
          </div>
        </main>
        <footer className="border-t border-line px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
          NOAA AviationWeather · Open-Meteo,
          2026 · LRBV
        </footer>
      </div>
    </ClockProvider>
  );
}

function TabFallback({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
        {label}
      </span>
    </div>
  );
}
