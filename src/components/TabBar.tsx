import { useEffect, useRef, useState } from "react";

export interface TabDef<K extends string> {
  key: K;
  label: string;
  hint?: string;
}

interface TabBarProps<K extends string> {
  tabs: TabDef<K>[];
  active: K;
  onChange: (key: K) => void;
}

export function TabBar<K extends string>({ tabs, active, onChange }: TabBarProps<K>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab="${active}"]`,
    );
    if (!el) return;
    const parent = containerRef.current!;
    const rect = el.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();
    setIndicator({ left: rect.left - pRect.left, width: rect.width });
  }, [active, tabs.length]);

  return (
    <div className="border-b border-line bg-bg-primary">
      <div
        ref={containerRef}
        className="relative mx-auto flex max-w-[1600px] items-stretch overflow-x-auto"
      >
        {tabs.map((tab, i) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              data-tab={tab.key}
              onClick={() => onChange(tab.key)}
              className={`group relative flex shrink-0 items-baseline gap-3 border-r border-line px-5 py-3 transition-colors ${
                isActive
                  ? "text-accent-solar"
                  : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              }`}
            >
              <span
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim"
                style={{ color: isActive ? "var(--accent-solar)" : undefined }}
              >
                F{i + 1}
              </span>
              <span
                className="font-mono text-[12px] uppercase tracking-[0.14em]"
                style={{ fontWeight: 500 }}
              >
                {tab.label}
              </span>
              {tab.hint && (
                <span className="ml-2 hidden font-mono text-[9px] tracking-[0.1em] text-text-dim md:inline">
                  · {tab.hint}
                </span>
              )}
            </button>
          );
        })}
        <div
          className="tab-underline absolute bottom-0 h-[2px]"
          style={{
            left: indicator.left,
            width: indicator.width,
            background: "var(--accent-solar)",
            boxShadow: "0 0 10px var(--accent-solar)",
          }}
        />
      </div>
    </div>
  );
}
