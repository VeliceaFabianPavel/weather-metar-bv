import { useState } from "react";
import type { ParsedMETAR } from "../../types/weather";
import { parseMETAR } from "../../utils/metar";
import { METARDecoder } from "./METARDecoder";
import { METARDisplay } from "./METARDisplay";

interface ManualMETARProps {
  initial?: string;
}

export function ManualMETAR({ initial = "" }: ManualMETARProps) {
  const [text, setText] = useState(initial);
  const [parsed, setParsed] = useState<ParsedMETAR | null>(
    initial ? parseMETAR(initial) : null,
  );
  const [error, setError] = useState<string | null>(null);

  const onParse = (raw: string) => {
    setText(raw);
    if (!raw.trim()) {
      setParsed(null);
      setError(null);
      return;
    }
    try {
      const result = parseMETAR(raw);
      if (!result) throw new Error("Could not parse — check station code or syntax.");
      setParsed(result);
      setError(null);
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "Parse failed");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label-tech mb-2 block">Paste any METAR string</label>
        <textarea
          value={text}
          onChange={(e) => onParse(e.target.value)}
          rows={2}
          spellCheck={false}
          placeholder="METAR LRBV ..."
          className="w-full resize-none px-3 py-2 font-mono text-sm placeholder:text-text-dim"
        />
      </div>
      {error && (
        <div className="border border-accent-red/40 bg-bg-tertiary px-3 py-2 font-mono text-xs text-accent-red">
          {error}
        </div>
      )}
      {parsed && (
        <div className="space-y-3">
          <METARDisplay raw={parsed.raw} />
          <METARDecoder parsed={parsed} />
        </div>
      )}
    </div>
  );
}
