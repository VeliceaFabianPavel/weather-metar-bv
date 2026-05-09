import { useEffect, useRef, useState, type RefObject } from "react";
import {
  downloadCSV,
  downloadElementAsPNG,
  downloadElementAsSVG,
  safeFilename,
  timestamp,
  type CSVMeta,
  type FigurePreset,
} from "../utils/export";

export interface CSVPayload {
  rows: Record<string, unknown>[];
  meta?: CSVMeta;
}

interface ExportToolbarProps {
  /** Element that wraps the chart/SVG to export. */
  targetRef: RefObject<HTMLElement>;
  /** Base filename (will be sanitized + suffixed with timestamp). */
  filename: string;
  /** Lazy CSV builder so big tables aren't materialised on every render. */
  csv?: () => CSVPayload;
  /** Hide PNG/SVG buttons (useful for panels where capture isn't meaningful). */
  imageDisabled?: boolean;
  /** Hide CSV button. */
  csvDisabled?: boolean;
  /** Background colour written into PNG/SVG. Default white for IEEE prints. */
  background?: string;
  /** Compact mode renders a single "[ ⤓ ]" button + popover (default true). */
  compact?: boolean;
}

export function ExportToolbar({
  targetRef,
  filename,
  csv,
  imageDisabled,
  csvDisabled,
  background = "#ffffff",
  compact = true,
}: ExportToolbarProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const baseName = `${safeFilename(filename)}-${timestamp()}`;

  const runImage = async (preset: FigurePreset, format: "png" | "svg") => {
    if (!targetRef.current) {
      setError("Target not mounted");
      return;
    }
    setBusy(`${format.toUpperCase()} ${preset}`);
    setError(null);
    try {
      if (format === "png") {
        await downloadElementAsPNG(targetRef.current, `${baseName}-${preset}`, {
          preset,
          background,
        });
      } else {
        downloadElementAsSVG(targetRef.current, baseName, { background });
      }
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const runCSV = () => {
    if (!csv) return;
    setBusy("CSV");
    setError(null);
    try {
      const { rows, meta } = csv();
      downloadCSV(rows, baseName, meta);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV export failed");
    } finally {
      setBusy(null);
    }
  };

  if (!compact) {
    // Inline expanded version (used by Research Tools page).
    return (
      <div className="flex flex-wrap items-center gap-2">
        {!imageDisabled && (
          <>
            <ExportBtn label="PNG · IEEE 1col" onClick={() => runImage("ieee-single", "png")} busy={busy} />
            <ExportBtn label="PNG · IEEE 2col" onClick={() => runImage("ieee-double", "png")} busy={busy} />
            <ExportBtn label="SVG (vector)" onClick={() => runImage("ieee-single", "svg")} busy={busy} />
          </>
        )}
        {!csvDisabled && csv && <ExportBtn label="CSV" onClick={runCSV} busy={busy} />}
        {error && (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-red">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div ref={popRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] hover:border-accent-solar hover:text-accent-solar ${
          open ? "border-accent-solar text-accent-solar" : "text-text-secondary"
        }`}
        title="Export figure or data"
      >
        {busy ? `[ ${busy}… ]` : "[ ⤓ export ]"}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-56 border border-accent-solar/60 bg-bg-secondary shadow-[0_0_18px_rgba(247,163,11,0.18)]"
          role="menu"
        >
          <div className="border-b border-line px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-text-dim">
            Figure · 300 dpi
          </div>
          {!imageDisabled && (
            <>
              <MenuItem
                label="PNG · IEEE 1-col (3.5″)"
                hint="1050 px"
                onClick={() => runImage("ieee-single", "png")}
              />
              <MenuItem
                label="PNG · IEEE 2-col (7.16″)"
                hint="2100 px"
                onClick={() => runImage("ieee-double", "png")}
              />
              <MenuItem
                label="PNG · screen (1×)"
                hint="as displayed"
                onClick={() => runImage("screen", "png")}
              />
              <MenuItem
                label="SVG · vector"
                hint="editable"
                onClick={() => runImage("ieee-single", "svg")}
              />
            </>
          )}
          {!csvDisabled && csv && (
            <>
              <div className="border-y border-line px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-text-dim">
                Data
              </div>
              <MenuItem label="CSV · plotted data" hint="rfc-4180" onClick={runCSV} />
            </>
          )}
          {error && (
            <div className="border-t border-accent-red/40 bg-bg-tertiary px-3 py-2 font-mono text-[10px] text-accent-red">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left font-mono text-[11px] text-text-secondary hover:bg-bg-hover hover:text-accent-solar"
    >
      <span>{label}</span>
      {hint && (
        <span className="text-[9.5px] uppercase tracking-[0.14em] text-text-dim">
          {hint}
        </span>
      )}
    </button>
  );
}

function ExportBtn({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy: string | null;
}) {
  return (
    <button
      type="button"
      disabled={!!busy}
      onClick={onClick}
      className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary hover:border-accent-solar hover:text-accent-solar disabled:opacity-50"
    >
      [ {busy === label ? `${label}…` : label} ]
    </button>
  );
}
