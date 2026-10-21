// Spine 4.1 export for vex rigs: one trimmed image per bone packed into an atlas, a skeleton JSON
// (bones, slots in draw order, region attachments) and every clip baked to one linear key per frame.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";
import { png as encodePng } from "../core/png.ts";
import type { Project, SpineDef } from "../core/project.ts";
import { sample } from "../core/rig.ts";
import { rng } from "../core/util.ts";

export const SPINE_VERSION = "4.1.24";

interface Region { bone: string; w: number; h: number; pixels: Uint8Array; cx: number; cy: number; x?: number; y?: number }

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Render a part sprite and trim it to its opaque pixels (1 px margin). */
function region(p: Project, sp: SpineDef, bone: string): Region | undefined {
  const asset = `_spine_${sp.name}_${bone}`;
  const b = p.build(asset), s = sp.scale;
  const img = new Resvg(p.svg(asset, 0, s), { shapeRendering: 2 }).render();
  const W = img.width, H = img.height, px = img.pixels;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 0) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return undefined;
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, pixels = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) pixels.set(px.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + w) * 4), y * w * 4);
  // center of the region in asset units
  return { bone, w, h, pixels, cx: b.box.x + (x0 + w / 2) / s, cy: b.box.y + (y0 + h / 2) / s };
}

/** Shelf-pack regions into a power-of-two-ish atlas with 2 px padding. */
function pack(regions: Region[]): { W: number; H: number } {
  const sorted = [...regions].sort((a, b) => b.h - a.h);
  const W = Math.max(64, 2 ** Math.ceil(Math.log2(Math.sqrt(regions.reduce((a, r) => a + (r.w + 2) * (r.h + 2), 0)) * 1.3)));
  let x = 2, y = 2, row = 0;
  for (const r of sorted) {
    if (x + r.w + 2 > W) { x = 2; y += row + 2; row = 0; }
    r.x = x; r.y = y;
    x += r.w + 2; row = Math.max(row, r.h);
  }
  return { W, H: y + row + 2 };
}

export function writeSpine(p: Project, sp: SpineDef, outDir: string): string {
  const s = sp.scale, rg = sp.rig;
  const regions = sp.parts.map((b) => region(p, sp, b)).filter((r): r is Region => !!r);
  const { W, H } = pack(regions);
  const atlas = new Uint8Array(W * H * 4);
  for (const r of regions) for (let y = 0; y < r.h; y++) atlas.set(r.pixels.subarray(y * r.w * 4, (y + 1) * r.w * 4), ((r.y! + y) * W + r.x!) * 4);

  // Spine is y-up and counter-clockwise; vex is y-down and clockwise. Units are export pixels.
  const pivot = (bone?: string) => (bone ? rg.bones.get(bone)!.pivot : sp.origin);
  const bones: Record<string, unknown>[] = [{ name: "root" }];
  const ordered: string[] = [];
  const visit = (name: string) => {
    if (ordered.includes(name)) return;
    const parent = rg.bones.get(name)!.parent;
    if (parent) visit(parent);
    ordered.push(name);
  };
  for (const name of rg.bones.keys()) visit(name);
  for (const name of ordered) {
    const b = rg.bones.get(name)!, pp = pivot(b.parent);
    bones.push({ name, parent: b.parent ?? "root", x: r2((b.pivot[0] - pp[0]) * s), y: r2(-(b.pivot[1] - pp[1]) * s) });
  }
  const byBone = new Map(regions.map((r) => [r.bone, r]));
  const slots = rg.order.filter((b) => byBone.has(b)).map((b) => ({ name: b, bone: b, attachment: b }));
  const attachments: Record<string, unknown> = {};
  for (const r of regions) {
    const pv = rg.bones.get(r.bone)!.pivot;
    attachments[r.bone] = { [r.bone]: { x: r2((r.cx - pv[0]) * s), y: r2(-(r.cy - pv[1]) * s), width: r.w, height: r.h } };
  }

  const animations: Record<string, unknown> = {};
  for (const [cn, c] of Object.entries(sp.clips)) {
    const timelines: Record<string, Record<string, unknown[]>> = {};
    for (const [bone, keys] of Object.entries(c.clip)) {
      const tl: Record<string, unknown[]> = {};
      for (let i = 0; i <= c.frames; i++) {
        const t = i / c.frames;
        const fi = { i, n: c.frames, t, sin: (a = 1, ph = 0, cy = 1) => a * Math.sin(2 * Math.PI * (t * cy + ph)), cos: (a = 1, ph = 0, cy = 1) => a * Math.cos(2 * Math.PI * (t * cy + ph)), rng: (sd = 0) => rng(sd) };
        const time = r2((i / c.fps) * 1000) / 1000;
        if (keys.rot) (tl.rotate ??= []).push({ time, value: r2(-(sample(keys.rot, fi) as number)) });
        if (keys.move) { const m = sample(keys.move, fi) as [number, number]; (tl.translate ??= []).push({ time, x: r2(m[0] * s), y: r2(-m[1] * s) }); }
        if (keys.scale) { const v = sample(keys.scale, fi) as number | [number, number]; const [x, y] = typeof v === "number" ? [v, v] : v; (tl.scale ??= []).push({ time, x: r2(x), y: r2(y) }); }
      }
      timelines[bone] = tl;
    }
    animations[cn] = { bones: timelines };
  }

  const skeleton = {
    skeleton: { spine: SPINE_VERSION, x: r2(-sp.origin[0] * s), y: r2(-(sp.h - sp.origin[1]) * s), width: sp.w * s, height: sp.h * s, images: "./" },
    bones, slots, skins: [{ name: "default", attachments }], animations,
  };
  const dir = join(outDir, "spine");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${sp.name}.json`), JSON.stringify(skeleton, null, 1) + "\n");
  writeFileSync(join(dir, `${sp.name}.png`), encodePng(W, H, atlas, (b) => deflateSync(b)));
  const lines = [`${sp.name}.png`, `size:${W},${H}`, "filter:Linear,Linear"];
  for (const r of regions) lines.push(r.bone, `bounds:${r.x},${r.y},${r.w},${r.h}`);
  writeFileSync(join(dir, `${sp.name}.atlas`), lines.join("\n") + "\n");
  // A preview page with every clip in the official Spine web player (serve the folder over HTTP to open it).
  const clipNames = JSON.stringify(Object.keys(animations));
  writeFileSync(join(dir, `${sp.name}.html`), `<!doctype html><html><head><meta charset="utf-8"><title>${sp.name} · Spine</title>
<script src="https://unpkg.com/@esotericsoftware/spine-player@4.1.56/dist/iife/spine-player.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@esotericsoftware/spine-player@4.1.56/dist/spine-player.css">
<style>body{margin:0;background:#232033;display:flex;flex-wrap:wrap;gap:6px;padding:6px;font:12px monospace;color:#9a93ab}.p{width:220px;height:280px}</style>
</head><body><script>
for (const anim of ${clipNames}) {
  const c = document.createElement("div"); c.innerHTML = "<div>" + anim + "</div><div class=p id=p_" + anim + "></div>"; document.body.appendChild(c);
  new spine.SpinePlayer("p_" + anim, { jsonUrl: "${sp.name}.json", atlasUrl: "${sp.name}.atlas", animation: anim, premultipliedAlpha: false,
    backgroundColor: "#232033", showControls: false, viewport: { padLeft: "10%", padRight: "10%", padTop: "8%", padBottom: "8%" } });
}
</script></body></html>
`);
  return `spine ${sp.name}: ${bones.length - 1} bones, ${slots.length} slots, ${Object.keys(animations).length} clips, atlas ${W}x${H}`;
}
