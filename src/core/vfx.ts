// Particles: a deterministic, stateless simulation. Each particle is identified by the frame it
// spawned on and its index; its state at any frame is recomputed from that seed, so any frame can
// be drawn on its own, and looping effects stay seamless (particles from the previous loop carry over).
import { VexError, didYouMean } from "./errors.ts";
import type { FrameInfo } from "./model.ts";
import { hash, rng } from "./util.ts";

type Range = number | [number, number];

export interface ParticleOpts {
  /** Spawn point, or an area [x, y, w, h]. */
  at?: [number, number];
  area?: [number, number, number, number];
  /** Particles per frame (looping effects). */
  rate?: number;
  /** Particles spawned at once on frame `start` (one-shot effects). */
  burst?: number;
  start?: number;
  /** Lifetime in frames. */
  life?: Range;
  /** Speed in units per frame, and direction in degrees (0 = right, -90 = up). */
  speed?: Range;
  angle?: Range;
  gravity?: [number, number];
  /** Velocity lost per frame (0..1). */
  drag?: number;
  /** Size over life: [start, end] (each may be a range for variety). */
  size?: [Range, Range];
  /** Colors over life: palette keys or hex, spread evenly from birth to death. */
  color?: string[];
  opacity?: [number, number];
  shape?: "circle" | "spark" | "square" | "star" | "ring";
  /** Draw a sprite per particle instead of a shape (scaled by size / sprite width). */
  sprite?: string;
  /** Spin in degrees per frame (square, star, sprite). */
  spin?: Range;
  glow?: number;
  blend?: string;
  seed?: number;
  /** Looping effects (default: true with rate, false with burst). */
  loop?: boolean;
}

export const PARTICLE_KEYS = ["at", "area", "rate", "burst", "start", "life", "speed", "angle", "gravity", "drag", "size", "color", "opacity", "shape", "sprite", "spin", "glow", "blend", "seed", "loop"];
const SHAPES = ["circle", "spark", "square", "star", "ring"];

export function checkParticles(o: Record<string, unknown>): ParticleOpts {
  for (const k of Object.keys(o)) if (!PARTICLE_KEYS.includes(k)) throw new VexError(`particles: unknown option '${k}'${didYouMean(k, PARTICLE_KEYS)}`);
  if (o.rate === undefined && o.burst === undefined) throw new VexError("particles needs a rate (per frame, looping) or a burst (count, one shot)");
  if (o.at === undefined && o.area === undefined) throw new VexError("particles needs at: [x, y] or area: [x, y, w, h]");
  if (o.shape !== undefined && !SHAPES.includes(o.shape as string)) throw new VexError(`particles shape must be ${SHAPES.join(", ")}${didYouMean(String(o.shape), SHAPES)}`);
  return o as ParticleOpts;
}

const pick = (v: Range | undefined, r: () => number, d: number) => (v === undefined ? d : typeof v === "number" ? v : v[0] + (v[1] - v[0]) * r());
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  /** 0 at birth .. 1 at death. */
  t: number;
  size: number;
  color: string;
  opacity: number;
  rot: number;
}

/** Every live particle at frame f. */
export function simulate(o: ParticleOpts, f: FrameInfo): Particle[] {
  const loop = o.loop ?? o.rate !== undefined;
  const maxLife = Math.ceil(typeof o.life === "number" ? o.life : o.life ? o.life[1] : 20);
  const base = o.seed ?? 1;
  const out: Particle[] = [];
  const spawns: [number, number][] = [];       // [spawn frame, index]
  if (o.burst !== undefined) {
    const s = o.start ?? 0;
    for (let k = 0; k < o.burst; k++) spawns.push([s, k]);
  } else {
    const rate = o.rate!;
    for (let s = f.i - maxLife; s <= f.i; s++) {
      if (!loop && s < 0) continue;
      // fractional rates: spawn floor(rate) plus one more with probability frac, decided per frame
      const key = loop ? ((s % f.n) + f.n) % f.n : s;
      const r = rng(hash(`${base}|rate|${key}`));
      const count = Math.floor(rate) + (r() < rate - Math.floor(rate) ? 1 : 0);
      for (let k = 0; k < count; k++) spawns.push([s, k]);
    }
  }
  for (const [s, k] of spawns) {
    const age = f.i - s;
    if (age < 0) continue;
    const key = loop ? ((s % f.n) + f.n) % f.n : s;
    const r = rng(hash(`${base}|p|${key}|${k}`));
    const life = Math.max(1, pick(o.life, r, 20));
    if (age > life) continue;
    let x: number, y: number;
    if (o.area) { x = o.area[0] + r() * o.area[2]; y = o.area[1] + r() * o.area[3]; }
    else { x = o.at![0]; y = o.at![1]; }
    const sp = pick(o.speed, r, 1), an = (pick(o.angle, r, -90) * Math.PI) / 180;
    let vx = Math.cos(an) * sp, vy = Math.sin(an) * sp;
    const g = o.gravity ?? [0, 0], drag = o.drag ?? 0;
    const s0 = pick(o.size?.[0], r, 3), s1 = pick(o.size?.[1], r, 0), spin = pick(o.spin, r, 0), rot0 = r() * 360;
    for (let a = 0; a < age; a++) { vx = vx * (1 - drag) + g[0]; vy = vy * (1 - drag) + g[1]; x += vx; y += vy; }
    const t = Math.min(1, age / life);
    const cols = o.color ?? ["#ffffff"];
    const color = cols[Math.min(cols.length - 1, Math.floor(t * cols.length))];
    out.push({ x, y, vx, vy, t, size: lerp(s0, s1, t), color, opacity: lerp(o.opacity?.[0] ?? 1, o.opacity?.[1] ?? 0, t), rot: rot0 + spin * age });
  }
  return out;
}
