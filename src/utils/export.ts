/**
 * Research-grade export utilities for IEEE-style figures and tabular data.
 *
 * Three primary exports:
 *  - downloadCSV(rows, filename, meta?)        — RFC-4180-quoted CSV with optional header comment block
 *  - downloadJSON(payload, filename)           — pretty-printed JSON
 *  - downloadElementAsPNG / downloadElementAsSVG — capture any DOM node (Recharts / raw SVG / heatmap)
 *
 * IEEE figure presets:
 *  - "ieee-single"  ≈ 88.9 mm  (3.5") at 300 DPI → 1050 px wide
 *  - "ieee-double"  ≈ 181 mm   (7.16") at 300 DPI → 2100 px wide
 *  - "screen"       — same pixel size as on screen (1× DPR)
 */

export type FigurePreset = "ieee-single" | "ieee-double" | "screen";

export const PRESET_DPI = 300;
export const PRESET_WIDTH_PX: Record<FigurePreset, number> = {
  "ieee-single": 1050, //  3.50" × 300 DPI
  "ieee-double": 2100, //  7.16" × 300 DPI (rounded)
  screen: 0,
};

// ───────────────────────────── filename + tabular ─────────────────────────────

export function safeFilename(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`;
}

function csvCell(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  let s: string;
  if (typeof v === "number") {
    s = Number.isFinite(v) ? String(v) : "";
  } else {
    s = String(v);
  }
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface CSVMeta {
  /** Lines prefixed with "# " written before the header row. */
  header?: string[];
  /** Optional column order; defaults to keys of the first row. */
  columns?: string[];
}

export function rowsToCSV(
  rows: Record<string, unknown>[],
  meta: CSVMeta = {},
): string {
  if (!rows.length && !meta.columns?.length) return "";
  const cols = meta.columns ?? Object.keys(rows[0] ?? {});
  const lines: string[] = [];
  if (meta.header?.length) {
    for (const h of meta.header) lines.push(`# ${h}`);
  }
  lines.push(cols.map(csvCell).join(","));
  for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(","));
  return lines.join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has time to read the URL.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadCSV(
  rows: Record<string, unknown>[],
  filename: string,
  meta?: CSVMeta,
) {
  const csv = rowsToCSV(rows, meta);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function downloadJSON(payload: unknown, filename: string) {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

export function downloadText(text: string, filename: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  downloadBlob(blob, filename);
}

// ───────────────────────────── chart capture ─────────────────────────────────

/**
 * Walk `el` and inline a snapshot of the *computed* style on every node.
 * Necessary because cloned SVGs lose their CSS context — colors set via
 * `var(--accent-solar)` etc. would render as black/transparent otherwise.
 */
function inlineComputedStyles(src: Element, dst: Element) {
  const srcChildren = Array.from(src.children);
  const dstChildren = Array.from(dst.children);
  const cs = window.getComputedStyle(src);
  const sty = (dst as HTMLElement | SVGElement).style;
  // Properties that matter for vector-ish chart rendering. Copying the *whole*
  // computed style is huge and slow.
  const props = [
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-width",
    "stroke-opacity",
    "stroke-dasharray",
    "stroke-linecap",
    "stroke-linejoin",
    "color",
    "font",
    "font-family",
    "font-size",
    "font-weight",
    "letter-spacing",
    "text-anchor",
    "dominant-baseline",
    "opacity",
    "visibility",
  ];
  for (const p of props) {
    const v = cs.getPropertyValue(p);
    if (v) sty.setProperty(p, v);
  }
  for (let i = 0; i < srcChildren.length && i < dstChildren.length; i++) {
    inlineComputedStyles(srcChildren[i], dstChildren[i]);
  }
}

function findRenderableSVG(el: HTMLElement): SVGSVGElement | null {
  if (el instanceof SVGSVGElement) return el;
  // Recharts wraps each chart in `.recharts-wrapper > svg`.
  const recharts = el.querySelector<SVGSVGElement>(".recharts-wrapper svg");
  if (recharts) return recharts;
  return el.querySelector<SVGSVGElement>("svg");
}

interface SerializedSVG {
  xml: string;
  width: number;
  height: number;
}

function serializeSVG(
  src: SVGSVGElement,
  options: { background?: string } = {},
): SerializedSVG {
  const rect = src.getBoundingClientRect();
  const width = rect.width || src.clientWidth || 800;
  const height = rect.height || src.clientHeight || 400;

  const clone = src.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  inlineComputedStyles(src, clone);

  if (options.background) {
    const bgRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", options.background);
    clone.insertBefore(bgRect, clone.firstChild);
  }

  const xml = new XMLSerializer().serializeToString(clone);
  // Some browsers omit the XML declaration; add it for SVG portability.
  const withHeader = xml.startsWith("<?xml")
    ? xml
    : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  return { xml: withHeader, width, height };
}

export interface ExportImageOptions {
  preset?: FigurePreset;
  /** Override pixel width directly (ignores preset). */
  widthPx?: number;
  /** Background colour. Default `#ffffff` for IEEE prints, or the panel bg. */
  background?: string;
  /** Padding (in target pixels) added around the figure. */
  padding?: number;
  /** Forced pixel ratio. Default = preset DPI / 96. */
  pixelRatio?: number;
}

export async function downloadElementAsPNG(
  el: HTMLElement,
  filename: string,
  opts: ExportImageOptions = {},
): Promise<void> {
  const svg = findRenderableSVG(el);
  if (!svg) throw new Error("No <svg> found inside element to export.");
  const preset = opts.preset ?? "ieee-single";
  const background = opts.background ?? "#ffffff";
  const padding = opts.padding ?? 16;

  const { xml, width, height } = serializeSVG(svg, { background });

  const targetW =
    opts.widthPx ??
    (preset === "screen" ? width : PRESET_WIDTH_PX[preset]) ??
    width;
  const scale = targetW / width;
  const pixelRatio = opts.pixelRatio ?? (preset === "screen" ? 1 : PRESET_DPI / 96);
  const canvasW = Math.round((targetW + padding * 2) * pixelRatio);
  const canvasH = Math.round((height * scale + padding * 2) * pixelRatio);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas not supported");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to rasterize SVG"));
      img.src = url;
    });
    ctx.drawImage(
      img,
      padding * pixelRatio,
      padding * pixelRatio,
      width * scale * pixelRatio,
      height * scale * pixelRatio,
    );
  } finally {
    URL.revokeObjectURL(url);
  }

  const pngBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/png",
      1,
    );
  });
  downloadBlob(pngBlob, filename.endsWith(".png") ? filename : `${filename}.png`);
}

export function downloadElementAsSVG(
  el: HTMLElement,
  filename: string,
  opts: { background?: string } = {},
) {
  const svg = findRenderableSVG(el);
  if (!svg) throw new Error("No <svg> found inside element to export.");
  const { xml } = serializeSVG(svg, { background: opts.background ?? "#ffffff" });
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename.endsWith(".svg") ? filename : `${filename}.svg`);
}

// ───────────────────────────── citations ─────────────────────────────

export interface CitationFields {
  key: string;
  title: string;
  authors?: string[];
  org: string;
  url: string;
  year?: number;
  note?: string;
}

export function bibtexEntry(c: CitationFields): string {
  const year = c.year ?? new Date().getUTCFullYear();
  const author = (c.authors ?? []).join(" and ");
  const lines = [`@misc{${c.key},`];
  lines.push(`  title = {${c.title}},`);
  if (author) lines.push(`  author = {${author}},`);
  lines.push(`  organization = {${c.org}},`);
  lines.push(`  year = {${year}},`);
  lines.push(`  url = {${c.url}},`);
  if (c.note) lines.push(`  note = {${c.note}},`);
  lines.push(`  urldate = {${new Date().toISOString().slice(0, 10)}}`);
  lines.push("}");
  return lines.join("\n");
}

export function ieeeReference(c: CitationFields, n: number): string {
  const author = c.authors?.length ? c.authors.join(", ") : c.org;
  const year = c.year ?? new Date().getUTCFullYear();
  const accessed = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `[${n}] ${author}, "${c.title}," ${c.org}, ${year}. [Online]. Available: ${c.url}. [Accessed: ${accessed}].`;
}
