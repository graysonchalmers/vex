// `vex trace`: decode an image, trace it into vex source, then render that source and measure
// how close it comes to the image, so every trace reports its own fidelity.
import { readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { VexError } from "../core/errors.ts";
import { trace, type TraceOpts, type Traced } from "../core/trace.ts";
import { loadSource } from "./load.ts";

export interface Image {
  w: number;
  h: number;
  /** Straight (not premultiplied) RGBA. */
  rgba: Uint8Array;
}

/** Width, height and MIME type from the file header (PNG, JPEG, GIF). */
export function imageInfo(b: Buffer): { w: number; h: number; mime: string } {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), mime: "image/png" };
  if (b.length > 10 && b.toString("latin1", 0, 3) === "GIF") return { w: b.readUInt16LE(6), h: b.readUInt16LE(8), mime: "image/gif" };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), mime: "image/jpeg" };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  throw new VexError("unsupported image (PNG, JPEG or GIF)");
}

/** Decode with resvg (already a dependency): the image is drawn 1:1 into an SVG of its own size. */
export function readImage(file: string): Image {
  const b = readFileSync(file);
  const { w, h, mime } = imageInfo(b);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">` +
    `<image width="${w}" height="${h}" image-rendering="optimizeSpeed" xlink:href="data:${mime};base64,${b.toString("base64")}"/></svg>`;
  return { w, h, rgba: straight(new Resvg(svg).render().pixels) };
}

/** resvg returns premultiplied RGBA. */
export function straight(p: Uint8Array): Uint8Array {
  const o = new Uint8Array(p.length);
  for (let i = 0; i < p.length; i += 4) {
    const a = p[i + 3];
    o[i + 3] = a;
    if (a) for (let c = 0; c < 3; c++) o[i + c] = Math.min(255, Math.round((p[i + c] * 255) / a));
  }
  return o;
}

export interface Fidelity {
  /** Mean color difference over pixels opaque in either image, 0..255 per channel. */
  meanError: number;
  /** Share of those pixels within 16 per channel of the image. */
  close: number;
  /** Pixels where only one of the two is opaque. */
  silhouetteMiss: number;
}

/** Render the traced source through vex and compare it with the image, pixel by pixel. */
export function fidelity(t: Traced, img: Image, name: string): Fidelity {
  const r = new Resvg(loadSource(t.source).svg(name, 0, 1)).render();
  if (r.width !== img.w || r.height !== img.h) throw new VexError(`trace: rendered ${r.width}x${r.height}, image is ${img.w}x${img.h}`);
  const got = straight(r.pixels), want = img.rgba;
  let sum = 0, close = 0, count = 0, miss = 0;
  for (let i = 0; i < want.length; i += 4) {
    const a = want[i + 3] >= 128, b = got[i + 3] >= 128;
    if (!a && !b) continue;
    if (a !== b) { miss++; continue; }
    const d = Math.max(Math.abs(want[i] - got[i]), Math.abs(want[i + 1] - got[i + 1]), Math.abs(want[i + 2] - got[i + 2]));
    sum += (Math.abs(want[i] - got[i]) + Math.abs(want[i + 1] - got[i + 1]) + Math.abs(want[i + 2] - got[i + 2])) / 3;
    if (d <= 16) close++;
    count++;
  }
  return { meanError: count ? sum / count : 0, close: count ? close / count : 1, silhouetteMiss: miss };
}

export function traceFile(file: string, opts: TraceOpts): { traced: Traced; fit: Fidelity } {
  const img = readImage(file);
  const traced = trace(img.w, img.h, img.rgba, opts);
  return { traced, fit: fidelity(traced, img, opts.name ?? "traced") };
}
