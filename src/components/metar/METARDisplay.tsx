import { useState } from "react";
import { tokenizeMETAR, METAR_TOKEN_COLOR } from "../../utils/metar";

interface METARDisplayProps {
  raw: string;
  source?: string;
}

export function METARDisplay({ raw, source }: METARDisplayProps) {
  const [copied, setCopied] = useState(false);
  const tokens = tokenizeMETAR(raw);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="relative border border-line bg-bg-primary">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
          {source ?? "METAR · raw"}
        </span>
        <button
          onClick={onCopy}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary transition-colors hover:text-accent-solar"
        >
          {copied ? "[ copied ]" : "[ copy ]"}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words p-3 font-mono text-[15px] leading-relaxed">
        {tokens.map((tok, i) => (
          <span
            key={i}
            style={{ color: METAR_TOKEN_COLOR[tok.role] }}
            className="mr-2"
          >
            {tok.text}
          </span>
        ))}
      </pre>
    </div>
  );
}
