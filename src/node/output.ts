// Writes build results to disk: SVGs, PNGs at each scale, anim strips, atlases + JSON, previews.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { VexError, didYouMean, wrap } from "../core/errors.ts";
import type { Project } from "../core/project.ts";
import { type Box, innerOf } from "../core/svg.ts";
import { n } from "../core/util.ts";
import { png, previewSvg } from "./raster.ts";

export interface OutputOptions {
  /** Only these assets/sheets (default: everything exported). */
  only?: string[];
  /** Write previews to out/_preview (default true). */
  preview?: boolean;
  /** Extra export multipliers on top of each asset's own scale (default [1]); 2 -> name@2x.png. */
  scales?: number[];
  /** Coordinate grid on previews (default true). */
  grid?: boolean;
}

export interface OutputResult {
  lines: string[];
  errors: VexError[];
}

function write(path: string, data: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

interface Cell {
  name: string;
  svg: string;
  box: Box;
  ms?: number;
}

interface Packed {
  svg: string;
  w: number;
  h: number;
  frames: { name: string; x: number; y: number; w: number; h: number; ms?: number }[];
}

/** Grid-pack frames into one SVG in output pixels (each cell is an exact nested document). */
export function pack(cells: Cell[], scale: number, cols?: number, pad = 0): Packed {
  const c = Math.max(1, Math.min(cells.length, cols ?? Math.ceil(Math.sqrt(cells.length))));
  const cw = Math.ceil(Math.max(...cells.map((x) => x.box.w)) * scale), ch = Math.ceil(Math.max(...cells.map((x) => x.box.h)) * scale);
  const rows = Math.ceil(cells.length / c);
  const W = c * cw + (c - 1) * pad, H = rows * ch + (rows - 1) * pad;
  let body = "";
  const frames: Packed["frames"] = [];
  cells.forEach((cell, i) => {
    const x = (i % c) * (cw + pad), y = Math.floor(i / c) * (ch + pad);
    const w = Math.ceil(cell.box.w * scale), h = Math.ceil(cell.box.h * scale);
    body += `<svg x="${x}" y="${y}" width="${n(cell.box.w * scale)}" height="${n(cell.box.h * scale)}" viewBox="${n(cell.box.x)} ${n(cell.box.y)} ${n(cell.box.w)} ${n(cell.box.h)}" overflow="hidden">${innerOf(cell.svg)}</svg>`;
    frames.push({ name: cell.name, x, y, w, h, ms: cell.ms });
  });
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`, w: W, h: H, frames };
}

/** TexturePacker/Aseprite-style hash JSON (Phaser, PixiJS, Godot importers read it). */
export function sheetJson(image: string, p: Packed, scale: number, tags: { name: string; from: number; to: number }[]): string {
  const frames: Record<string, unknown> = {};
  for (const f of p.frames)
    frames[f.name] = {
      frame: { x: f.x, y: f.y, w: f.w, h: f.h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h }, sourceSize: { w: f.w, h: f.h },
      ...(f.ms !== undefined ? { duration: f.ms } : {}),
    };
  return JSON.stringify({
    frames,
    meta: { app: "vex", version: "0.1.0", image, format: "RGBA8888", size: { w: p.w, h: p.h }, scale: String(scale), frameTags: tags.map((t) => ({ ...t, direction: "forward" })) },
  }, null, 2) + "\n";
}

const suffix = (m: number) => (m === 1 ? "" : `@${n(m)}x`);

/** Build and write. Each asset fails independently; errors are collected, not thrown. */
export function writeOutputs(p: Project, out: string, opts: OutputOptions = {}): OutputResult {
  const lines: string[] = [], errors: VexError[] = [];
  const scales = opts.scales?.length ? opts.scales : [1];
  const sheetNames = new Set(p.sheets.map((s) => s.name));
  if (opts.only)
    for (const x of opts.only)
      if (!p.assets.has(x) && !sheetNames.has(x))
        errors.push(new VexError(`unknown asset or sheet '${x}'${didYouMean(x, [...p.order, ...sheetNames])}`));
  const want = opts.only ? new Set(opts.only) : undefined;
  const names = want ? p.order.filter((x) => want.has(x)) : p.exported();

  for (const name of names) {
    const def = p.assets.get(name)!;
    try {
      const b = p.build(name);
      const dir = join(out, `${def.kind}s`);
      if (b.frames === 1) {
        const svg = p.svg(name, 0, 1);
        write(join(dir, name + ".svg"), svg);
        for (const m of scales) write(join(dir, name + suffix(m) + ".png"), png(p.svg(name, 0, b.scale * m)));
        if (opts.preview !== false) write(join(out, "_preview", name + ".png"), png(previewSvg(svg, b.box, { grid: opts.grid })));
        lines.push(`${def.kind} ${name} ${n(b.box.w * b.scale)}x${n(b.box.h * b.scale)}`);
      } else {
        const ms = Math.round(1000 / b.fps);
        const cells: Cell[] = Array.from({ length: b.frames }, (_, i) => {
          const svg = p.svg(name, i, 1);
          write(join(dir, name, `${i}.svg`), svg);
          return { name: `${name}_${i}`, svg, box: p.build(name, i).box, ms };
        });
        for (const m of scales) {
          const pk = pack(cells, b.scale * m, cells.length);
          write(join(dir, name + suffix(m) + ".png"), png(pk.svg));
          write(join(dir, name + suffix(m) + ".json"), sheetJson(name + suffix(m) + ".png", pk, b.scale * m, [{ name, from: 0, to: cells.length - 1 }]));
        }
        if (opts.preview !== false) {
          // All frames side by side, 1 unit gap, on one checkerboard.
          const strip = pack(cells, 1, Math.min(cells.length, 8), 1);
          write(join(out, "_preview", name + ".png"), png(previewSvg(strip.svg, { x: 0, y: 0, w: strip.w, h: strip.h }, { size: 1024, grid: opts.grid })));
        }
        lines.push(`anim ${name} ${n(b.box.w * b.scale)}x${n(b.box.h * b.scale)} (${b.frames} frames @ ${b.fps}fps)`);
      }
    } catch (e) {
      errors.push(wrap(e));
    }
  }

  for (const s of p.sheets) {
    if (want && !want.has(s.name)) continue;
    try {
      const cells: Cell[] = [], tags: { name: string; from: number; to: number }[] = [];
      for (const name of p.sheetNames(s)) {
        const b = p.build(name);
        if (b.frames > 1) tags.push({ name, from: cells.length, to: cells.length + b.frames - 1 });
        for (let i = 0; i < b.frames; i++)
          cells.push({ name: b.frames > 1 ? `${name}_${i}` : name, svg: p.svg(name, i, 1), box: p.build(name, i).box, ms: b.frames > 1 ? Math.round(1000 / b.fps) : undefined });
      }
      if (!cells.length) throw new VexError("sheet is empty (no entries matched)");
      const base = s.opts.scale ?? 1;
      for (const m of scales) {
        const pk = pack(cells, base * m, s.opts.cols, s.opts.pad ?? 2);
        write(join(out, s.name + suffix(m) + ".png"), png(pk.svg));
        write(join(out, s.name + suffix(m) + ".json"), sheetJson(s.name + suffix(m) + ".png", pk, base * m, tags));
        if (m === scales[0]) lines.push(`sheet ${s.name} ${pk.w}x${pk.h} (${cells.length} frames)`);
      }
      if (opts.preview !== false) {
        const pk = pack(cells, base, s.opts.cols, s.opts.pad ?? 2);
        write(join(out, "_preview", s.name + ".png"), png(previewSvg(pk.svg, { x: 0, y: 0, w: pk.w, h: pk.h }, { size: 1024, grid: false })));
      }
    } catch (e) {
      errors.push(wrap(e).within(`sheet '${s.name}'`, s.loc));
    }
  }
  return { lines, errors };
}
