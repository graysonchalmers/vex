// Generative helpers for art files: 2D gradient noise, Lindenmayer systems with a turtle that
// turns their strings into polylines, and point-list tweening. All deterministic for a seed.
import { VexError, didYouMean } from "./errors.ts";
import { hash, rng } from "./util.ts";

// ------------------------------------------------------------------ noise

const PERM = new Map<number, Uint8Array>();
function perm(seed: number): Uint8Array {
  let p = PERM.get(seed);
  if (!p) {
    p = new Uint8Array(512);
    const base = Array.from({ length: 256 }, (_, i) => i), r = rng(hash(`noise|${seed}`));
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    PERM.set(seed, p);
  }
  return p;
}
const GRAD: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Smooth gradient noise at (x, y), about -1..1 (0 on integer lattice points); `seed` picks another field. */
export function noise2(x: number, y: number, seed = 0): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new VexError("noise(x, y, seed): x and y must be numbers");
  const p = perm(seed | 0);
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, fx = x - Math.floor(x), fy = y - Math.floor(y);
  const g = (i: number, j: number, dx: number, dy: number) => { const v = GRAD[p[p[(X + i) & 255] + ((Y + j) & 255)] & 7]; return v[0] * dx + v[1] * dy; };
  const u = fade(fx), v = fade(fy);
  const a = g(0, 0, fx, fy) + (g(1, 0, fx - 1, fy) - g(0, 0, fx, fy)) * u;
  const b = g(0, 1, fx, fy - 1) + (g(1, 1, fx - 1, fy - 1) - g(0, 1, fx, fy - 1)) * u;
  return Math.max(-1, Math.min(1, (a + (b - a) * v) * 1.2));
}

// ------------------------------------------------------------------ L-systems

export interface LSystemSpec {
  axiom: string;
  /** symbol -> replacement; a list of replacements is picked at random per use (seeded). */
  rules: Record<string, string | string[]>;
  depth?: number;
  seed?: number;
}

const LSYS_KEYS = ["axiom", "rules", "depth", "seed"];
const MAX_LEN = 400_000;

/** Rewrite the axiom `depth` times. Symbols with no rule are kept. */
export function lsystem(spec: unknown): string {
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) throw new VexError('lsystem({ axiom: "F", rules: { F: "F[+F]F[-F]F" }, depth: 4 })');
  const o = spec as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!LSYS_KEYS.includes(k)) throw new VexError(`lsystem: unknown option '${k}'${didYouMean(k, LSYS_KEYS)}`);
  if (typeof o.axiom !== "string" || !o.axiom) throw new VexError("lsystem: axiom must be a non-empty string");
  if (typeof o.rules !== "object" || o.rules === null) throw new VexError("lsystem: rules is { symbol: replacement, ... }");
  const rules = o.rules as Record<string, unknown>;
  for (const [k, v] of Object.entries(rules)) {
    if ([...k].length !== 1) throw new VexError(`lsystem: rule '${k}' must be one character`);
    if (!(typeof v === "string" || (Array.isArray(v) && v.length && v.every((s) => typeof s === "string")))) throw new VexError(`lsystem: rule '${k}' must be a string or a list of strings`);
  }
  const depth = o.depth === undefined ? 3 : o.depth;
  if (!(Number.isInteger(depth) && (depth as number) >= 0)) throw new VexError("lsystem: depth must be a whole number >= 0");
  const r = rng(hash(`lsys|${o.seed ?? 1}`));
  let s = o.axiom;
  for (let i = 0; i < (depth as number); i++) {
    let out = "";
    for (const ch of s) {
      const rule = rules[ch];
      out += rule === undefined ? ch : typeof rule === "string" ? rule : (rule as string[])[Math.floor(r() * (rule as string[]).length)];
      if (out.length > MAX_LEN) throw new VexError(`lsystem: the string passed ${MAX_LEN} symbols at depth ${i + 1}; lower depth`);
    }
    s = out;
  }
  return s;
}

export interface TurtleOpts {
  x?: number;
  y?: number;
  /** Start heading in degrees, 0 = right, -90 = up (default). */
  heading?: number;
  /** Turn angle in degrees for + and - (default 25). */
  angle?: number;
  /** Step length in units for F, G and f (default 10). */
  step?: number;
  /** Step multiplier applied by each [ (branches get shorter), undone by ] (default 1). */
  shrink?: number;
  /** Random turn wobble in degrees (default 0), seeded. */
  wobble?: number;
  seed?: number;
}

export interface Stroke {
  /** Flat point list [x0, y0, x1, y1, ...]. */
  pts: number[];
  /** Bracket depth the stroke was drawn at (0 = trunk). */
  depth: number;
}

const TURTLE_KEYS = ["x", "y", "heading", "angle", "step", "shrink", "wobble", "seed"];

/**
 * Walk a command string into polylines: F G draw forward, f moves, + turns right (clockwise), - left,
 * [ ] push / pop the state, | turns around. Other symbols are ignored. One stroke per pen-down run.
 */
export function turtle(cmds: unknown, opts: unknown = {}): Stroke[] {
  if (typeof cmds !== "string") throw new VexError('turtle("F+F-F", { x, y, heading, angle, step })');
  if (typeof opts !== "object" || opts === null || Array.isArray(opts)) throw new VexError("turtle options must be an object");
  const o = opts as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!TURTLE_KEYS.includes(k)) throw new VexError(`turtle: unknown option '${k}'${didYouMean(k, TURTLE_KEYS)}`);
  for (const k of TURTLE_KEYS) if (o[k] !== undefined && !(typeof o[k] === "number" && Number.isFinite(o[k]))) throw new VexError(`turtle: ${k} must be a number`);
  const angle = (o.angle as number) ?? 25, shrink = (o.shrink as number) ?? 1, wobble = (o.wobble as number) ?? 0;
  const r = rng(hash(`turtle|${o.seed ?? 1}`));
  let x = (o.x as number) ?? 0, y = (o.y as number) ?? 0, h = (o.heading as number) ?? -90, step = (o.step as number) ?? 10, depth = 0;
  const stack: [number, number, number, number, number][] = [];
  const out: Stroke[] = [];
  let cur: number[] | undefined;
  const rnd = (v: number) => Math.round(v * 1e6) / 1e6 || 0;
  const pen = (down: boolean) => {
    if (down) { if (!cur) cur = [rnd(x), rnd(y)]; }
    else if (cur) { if (cur.length >= 4) out.push({ pts: cur, depth }); cur = undefined; }
  };
  const turn = (deg: number) => { h += deg + (wobble ? (r() * 2 - 1) * wobble : 0); };
  const forward = () => { x += Math.cos((h * Math.PI) / 180) * step; y += Math.sin((h * Math.PI) / 180) * step; };
  for (const c of cmds) {
    switch (c) {
      case "F": case "G": pen(true); forward(); cur!.push(rnd(x), rnd(y)); break;
      case "f": pen(false); forward(); break;
      case "+": turn(angle); pen(false); break;
      case "-": turn(-angle); pen(false); break;
      case "|": turn(180); pen(false); break;
      case "[": pen(false); stack.push([x, y, h, step, depth]); step *= shrink; depth++; break;
      case "]": {
        pen(false);
        const s = stack.pop();
        if (!s) throw new VexError("turtle: ']' without a matching '['");
        [x, y, h, step, depth] = s;
        break;
      }
    }
    if (out.length > 200_000) throw new VexError("turtle: more than 200000 strokes; lower the depth");
  }
  pen(false);
  return out;
}

// ------------------------------------------------------------------ tweening

/** Interpolate two flat point lists of the same length: 0 = a, 1 = b (extrapolates outside). */
export function tween(a: unknown, b: unknown, t: unknown): number[] {
  const ok = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => typeof x === "number" && Number.isFinite(x));
  if (!ok(a) || !ok(b)) throw new VexError("tween(pointsA, pointsB, t): both must be flat number lists");
  if (a.length !== b.length) throw new VexError(`tween: the lists must have the same length (${a.length} vs ${b.length} numbers)`);
  if (typeof t !== "number" || !Number.isFinite(t)) throw new VexError("tween: t must be a number (0 = first list, 1 = second)");
  return a.map((v, i) => v + (b[i] - v) * t);
}
