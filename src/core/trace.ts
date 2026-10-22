// Image -> vex source. The image is reduced to a palette, then traced as stacked color layers:
// layer i covers every pixel whose color sits at rank >= i, so lower layers run under the ones
// above them and no seams open between colors. Each layer is one path: pixel-edge loops (holes
// wind the other way, so the default nonzero fill keeps them open), smoothed and simplified.
import { VexError } from "./errors.ts";
import { n, rng } from "./util.ts";

type P = [number, number];

export interface TraceOpts {
  /** Palette size (default 32). */
  colors?: number;
  /** 0 = exact pixel edges (default), up to 1 = rounder, simplified outlines. */
  smooth?: number;
  /** Pixels with alpha below this are transparent (default 128). */
  alpha?: number;
  /** Asset name in the generated source (default "traced"). */
  name?: string;
  /** Export scale written into the sprite (default 1). */
  scale?: number;
  /** Comment line naming the source image. */
  from?: string;
}

export interface Traced {
  w: number;
  h: number;
  /** Palette in layer order (bottom first), hex. */
  colors: string[];
  /** One path per layer, same order as colors. */
  paths: string[];
  source: string;
}

// ------------------------------------------------------------------ palette

/** sRGB 0..255 -> OKLab, so k-means groups colors the way eyes do. */
function oklab(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** k-means (k-means++ seeding, fixed seed) over the opaque pixels; returns a label per pixel (-1 = transparent). */
function quantize(rgba: Uint8Array, count: number, k: number, alpha: number): { labels: Int32Array; rgb: number[][] } {
  const labels = new Int32Array(count).fill(-1);
  const idx: number[] = [];
  const lab: number[][] = [];
  for (let i = 0; i < count; i++) if (rgba[i * 4 + 3] >= alpha) { idx.push(i); lab.push(oklab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])); }
  if (!idx.length) throw new VexError("trace: the image has no opaque pixels");
  k = Math.min(k, idx.length);
  const d2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const r = rng(7);
  const cent: number[][] = [lab[Math.floor(r() * lab.length)].slice()];
  const near = lab.map((p) => d2(p, cent[0]));
  while (cent.length < k) {
    let sum = 0;
    for (const v of near) sum += v;
    if (sum === 0) break; // fewer distinct colors than k
    let t = r() * sum, j = 0;
    while (j < near.length - 1 && (t -= near[j]) > 0) j++;
    cent.push(lab[j].slice());
    for (let i = 0; i < lab.length; i++) near[i] = Math.min(near[i], d2(lab[i], lab[j]));
  }
  const asg = new Int32Array(lab.length);
  for (let it = 0; it < 16; it++) {
    let moved = 0;
    for (let i = 0; i < lab.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < cent.length; c++) { const d = d2(lab[i], cent[c]); if (d < bd) { bd = d; best = c; } }
      if (asg[i] !== best || it === 0) { asg[i] = best; moved++; }
    }
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < lab.length; i++) { const a = acc[asg[i]]; a[0] += lab[i][0]; a[1] += lab[i][1]; a[2] += lab[i][2]; a[3]++; }
    acc.forEach((a, c) => { if (a[3]) cent[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
    if (!moved) break;
  }
  // Each cluster's color is the mean of its pixels in sRGB (exact source colors, no round trip).
  const sums = cent.map(() => [0, 0, 0, 0]);
  idx.forEach((p, i) => { const s = sums[asg[i]]; s[0] += rgba[p * 4]; s[1] += rgba[p * 4 + 1]; s[2] += rgba[p * 4 + 2]; s[3]++; labels[p] = asg[i]; });
  return { labels, rgb: sums.map((s) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3], s[3]] : [0, 0, 0, 0])) };
}

// ------------------------------------------------------------------ contours

/**
 * Boundary loops of a mask along pixel edges, inside on the right (screen coordinates): outer
 * loops run clockwise, holes counter-clockwise. Collinear steps are merged.
 */
export function loops(mask: Uint8Array, w: number, h: number): P[][] {
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  const W = w + 1;
  // Directed edges keyed by start vertex; a vertex has at most two (where pixels touch diagonally).
  const out = new Map<number, number[]>();
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const k = y0 * W + x0, e = out.get(k);
    if (e) e.push(y1 * W + x1); else out.set(k, [y1 * W + x1]);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue;
    if (!at(x, y - 1)) add(x, y, x + 1, y);
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) add(x, y + 1, x, y);
  }
  const res: P[][] = [];
  for (const start of [...out.keys()]) {
    while (out.get(start)?.length) {
      const pts: P[] = [];
      let v = start, dx = 0, dy = 0;
      for (;;) {
        const es = out.get(v);
        if (!es || !es.length) break;
        // At a diagonal touch, turn right: diagonal neighbours stay separate regions.
        let pick = 0;
        if (es.length > 1) {
          const right = es.findIndex((e) => { const ex = (e % W) - (v % W), ey = Math.floor(e / W) - Math.floor(v / W); return ex === -dy && ey === dx; });
          if (right >= 0) pick = right;
        }
        const e = es.splice(pick, 1)[0];
        if (!es.length) out.delete(v);
        const nx = (e % W) - (v % W), ny = Math.floor(e / W) - Math.floor(v / W);
        if (nx !== dx || ny !== dy) pts.push([v % W, Math.floor(v / W)]);
        dx = nx; dy = ny; v = e;
        if (v === start) break;
      }
      if (pts.length >= 3) res.push(pts);
    }
  }
  return res;
}

/** Chaikin corner cutting on a closed loop. */
function chaikin(p: P[], q: number): P[] {
  const o: P[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    o.push([a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q], [a[0] + (b[0] - a[0]) * (1 - q), a[1] + (b[1] - a[1]) * (1 - q)]);
  }
  return o;
}

/** Ramer-Douglas-Peucker on a closed loop. */
function simplify(p: P[], eps: number): P[] {
  if (p.length < 4 || eps <= 0) return p;
  const rdp = (s: P[]): P[] => {
    const a = s[0], b = s[s.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
    let k = 0, dm = -1;
    for (let i = 1; i < s.length - 1; i++) {
      const d = Math.abs((b[0] - a[0]) * (a[1] - s[i][1]) - (a[0] - s[i][0]) * (b[1] - a[1])) / L;
      if (d > dm) { dm = d; k = i; }
    }
    return dm > eps ? [...rdp(s.slice(0, k + 1)).slice(0, -1), ...rdp(s.slice(k))] : [a, b];
  };
  // Split at the point farthest from the first, so both halves are open chains.
  let far = 0, fd = -1;
  for (let i = 1; i < p.length; i++) { const d = (p[i][0] - p[0][0]) ** 2 + (p[i][1] - p[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const out = [...rdp(p.slice(0, far + 1)).slice(0, -1), ...rdp([...p.slice(far), p[0]]).slice(0, -1)];
  return out.length >= 3 ? out : p;
}

/**
 * Path data for one loop, relative so it stays compact: exact pixel loops are runs of h/v steps;
 * smoothed loops are l steps between rounded absolute points (no drift).
 */
function loopD(p: P[], exact: boolean): string {
  let d = `M${n(p[0][0])} ${n(p[0][1])}`;
  const r = (v: number) => Math.round(v * 100) / 100;
  for (let i = 1; i < p.length; i++) {
    const dx = r(p[i][0]) - r(p[i - 1][0]), dy = r(p[i][1]) - r(p[i - 1][1]);
    d += exact ? (dx ? `h${dx}` : `v${dy}`) : `l${n(dx)} ${n(dy)}`;
  }
  return d + "Z";
}

const hex = (c: number[]) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// ------------------------------------------------------------------ trace

export function trace(w: number, h: number, rgba: Uint8Array, opts: TraceOpts = {}): Traced {
  if (rgba.length !== w * h * 4) throw new VexError(`trace: expected ${w * h * 4} bytes of RGBA, got ${rgba.length}`);
  const smooth = Math.max(0, Math.min(1, opts.smooth ?? 0));
  const { labels, rgb } = quantize(rgba, w * h, Math.max(1, Math.round(opts.colors ?? 32)), opts.alpha ?? 128);
  // Layer order: dark to light. Each layer is then a level set ("at least this light"), and level
  // sets nest into a few coherent regions instead of scattering into specks.
  const L = rgb.map((c) => oklab(c[0], c[1], c[2])[0]);
  const order = rgb.map((c, i) => i).filter((i) => rgb[i][3] > 0).sort((a, b) => L[a] - L[b]);
  const rank = new Int32Array(rgb.length);
  order.forEach((c, r) => (rank[c] = r));
  const mask = new Uint8Array(w * h);
  const paths: string[] = [];
  for (let r = 0; r < order.length; r++) {
    for (let i = 0; i < w * h; i++) mask[i] = labels[i] >= 0 && rank[labels[i]] >= r ? 1 : 0;
    let d = "";
    for (let loop of loops(mask, w, h)) {
      if (smooth > 0) loop = simplify(chaikin(chaikin(loop, 0.25), 0.25), 0.1 + smooth * 0.4);
      d += loopD(loop, smooth === 0);
    }
    paths.push(d);
  }
  const colors = order.map((c) => hex(rgb[c]));
  const name = opts.name ?? "traced";
  const keys = colors.map((_, i) => "c" + String(i).padStart(2, "0"));
  // The layers are a named constant so other files can reuse them: layer 0 is the whole silhouette.
  const layers = name.replace(/\W/g, "_").replace(/^(\d)/, "_$1") + "_layers";
  const source = [
    `// Traced${opts.from ? ` from ${opts.from}` : ""} by \`vex trace\`: ${colors.length} colors, smooth ${smooth}.`,
    `// Layers stack dark to light; each covers its own color and runs under the lighter layers above it,`,
    `// so ${layers}[0] is the whole silhouette (handy as a clip mask).`,
    `pal({ ${keys.map((k, i) => `${k}: "${colors[i]}"`).join(", ")} })`,
    ``,
    `const ${layers} = [`,
    ...paths.map((d, i) => `  ["${keys[i]}", "${d}"],`),
    `]`,
    ``,
    `sprite(${JSON.stringify(name)}, { w: ${w}, h: ${h}${opts.scale && opts.scale !== 1 ? `, scale: ${n(opts.scale)}` : ""} },`,
    `  ${layers}.map(([key, d]) => path(d, key)))`,
    ``,
  ].join("\n");
  return { w, h, colors, paths, source };
}
