// SVG -> PNG with resvg, so every PNG is a rendering of the exact SVG that is exported.
import { deflateSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";
import { VexError } from "../core/errors.ts";
import { png as encodePng } from "../core/png.ts";
import { innerOf } from "../core/svg.ts";
import { n } from "../core/util.ts";

/** Render an SVG document at its own width/height. */
export function png(svg: string): Buffer {
  // Font discovery is slow; only pay for it when there is text.
  const r = new Resvg(svg, { font: { loadSystemFonts: svg.includes("<text") }, shapeRendering: 2 });
  return r.render().asPng();
}

/**
 * Text drawn as outlines, so an exported SVG looks the same on machines without the font.
 * resvg lays the text out with system fonts and returns the simplified document.
 */
export function outlineText(svg: string): string {
  if (!svg.includes("<text")) return svg;
  return new Resvg(svg, { font: { loadSystemFonts: true } }).toString();
}

/**
 * Render, then crop in pixel space. (Cropping through the viewBox can crash resvg when a
 * blurred element ends up entirely outside it, so the crop never touches the SVG.)
 */
export function pngCrop(svg: string, scale: number, crop?: { x: number; y: number; w: number; h: number }, origin = { x: 0, y: 0 }): Buffer {
  const r = new Resvg(svg, { font: { loadSystemFonts: svg.includes("<text") }, shapeRendering: 2 }).render();
  if (!crop) return r.asPng();
  const x0 = Math.max(0, Math.round((crop.x - origin.x) * scale)), y0 = Math.max(0, Math.round((crop.y - origin.y) * scale));
  const w = Math.min(r.width - x0, Math.round(crop.w * scale)), h = Math.min(r.height - y0, Math.round(crop.h * scale));
  if (!(w > 0 && h > 0)) throw new VexError(`crop ${crop.x},${crop.y},${crop.w},${crop.h} is outside the image`);
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) out.set(r.pixels.subarray(((y0 + y) * r.width + x0) * 4, ((y0 + y) * r.width + x0 + w) * 4), y * w * 4);
  return Buffer.from(encodePng(w, h, out, (b) => deflateSync(b)));
}

export interface PreviewOpts {
  /** Output size of the longest side (default 512). */
  size?: number;
  /** Coordinate grid + rulers (default true). */
  grid?: boolean;
}

const RULER = 18;

/**
 * Agent-facing preview: checkerboard = transparent, faint grid every 8 units, rulers every 16,
 * so coordinates can be read straight off the image.
 */
export function previewSvg(svg: string, box: { x: number; y: number; w: number; h: number }, opts: PreviewOpts = {}): string {
  const size = opts.size ?? 512;
  const s = Math.max(0.25, Math.min(32, size / Math.max(box.w, box.h)));
  const grid = opts.grid !== false;
  const m = grid ? RULER : 0;
  const W = box.w * s + m, H = box.h * s + m;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}" height="${n(H)}" viewBox="0 0 ${n(W)} ${n(H)}">` +
    `<defs><pattern id="__ck" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#cfcfd6"/><rect width="8" height="8" fill="#f2f2f5"/><rect x="8" y="8" width="8" height="8" fill="#f2f2f5"/></pattern></defs>` +
    `<rect width="${n(W)}" height="${n(H)}" fill="#25222e"/>` +
    `<rect x="${m}" y="${m}" width="${n(box.w * s)}" height="${n(box.h * s)}" fill="url(#__ck)"/>` +
    `<svg x="${m}" y="${m}" width="${n(box.w * s)}" height="${n(box.h * s)}" viewBox="${n(box.x)} ${n(box.y)} ${n(box.w)} ${n(box.h)}" overflow="hidden">${innerOf(svg)}</svg>`;
  if (grid) {
    const step = pickStep(s);
    let lines = "", labels = "";
    const x0 = Math.ceil(box.x / step) * step, y0 = Math.ceil(box.y / step) * step;
    for (let x = x0; x <= box.x + box.w; x += step) {
      const px = m + (x - box.x) * s, major = x % (step * 2) === 0;
      lines += `<line x1="${n(px)}" y1="${m}" x2="${n(px)}" y2="${n(H)}" stroke="#5a4fcf" stroke-opacity="${major ? 0.35 : 0.15}" stroke-width="1"/>`;
      if (major) labels += `<text x="${n(px)}" y="13" fill="#c9c3dd" font-size="10" font-family="monospace" text-anchor="middle">${x}</text>`;
    }
    for (let y = y0; y <= box.y + box.h; y += step) {
      const py = m + (y - box.y) * s, major = y % (step * 2) === 0;
      lines += `<line x1="${m}" y1="${n(py)}" x2="${n(W)}" y2="${n(py)}" stroke="#5a4fcf" stroke-opacity="${major ? 0.35 : 0.15}" stroke-width="1"/>`;
      if (major) labels += `<text x="${m - 3}" y="${n(py + 3)}" fill="#c9c3dd" font-size="10" font-family="monospace" text-anchor="end">${y}</text>`;
    }
    out += lines + labels;
  }
  return out + "</svg>";
}

/** Grid spacing in units so lines land roughly 24..64 px apart. */
function pickStep(s: number): number {
  for (const st of [1, 2, 4, 8, 16, 32, 64, 128, 256]) if (st * s >= 24) return st;
  return 512;
}
