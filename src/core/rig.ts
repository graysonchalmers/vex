// Skeletal animation: a tree of bones (each rotates about its pivot and carries its children),
// keyframed clips with easing, and posing into ordinary transform groups per frame.
import { VexError, didYouMean } from "./errors.ts";
import type { FrameInfo } from "./model.ts";

export interface BoneDef {
  parent?: string;
  /** Rotation pivot in the asset's coordinates (rest pose). */
  pivot: [number, number];
  /** Draw order: higher on top (default: declaration order). Independent of the hierarchy. */
  z?: number;
  items: unknown[];
}

export interface Rig {
  __rig: true;
  bones: Map<string, BoneDef>;
  /** Root-to-leaf chain per bone. */
  chains: Map<string, string[]>;
  /** Bones in draw order. */
  order: string[];
}

export const EASES = ["linear", "in", "out", "inOut", "step"] as const;
export type Ease = (typeof EASES)[number];

/** A keyframe: [frame, value] or [frame, value, ease into the next key]. */
export type Key<T> = [number, T] | [number, T, Ease];
export type Track<T> = Key<T>[] | ((f: FrameInfo) => T);

export interface BoneKeys {
  rot?: Track<number>;
  move?: Track<[number, number]>;
  scale?: Track<number | [number, number]>;
}

export type Clip = Record<string, BoneKeys>;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function makeRig(spec: unknown): Rig {
  if (!isObj(spec) || !Object.keys(spec).length) throw new VexError("rig({ bone: { parent?, pivot: [x, y], z?, items: [...] }, ... })");
  const bones = new Map<string, BoneDef>();
  let n = 0;
  for (const [name, b] of Object.entries(spec)) {
    if (!isObj(b)) throw new VexError(`bone '${name}' must be { parent?, pivot, z?, items }`);
    for (const k of Object.keys(b))
      if (!["parent", "pivot", "z", "items"].includes(k)) throw new VexError(`bone '${name}': unknown option '${k}'${didYouMean(k, ["parent", "pivot", "z", "items"])}`);
    const p = b.pivot;
    if (!Array.isArray(p) || p.length !== 2 || !p.every((v) => typeof v === "number" && Number.isFinite(v))) throw new VexError(`bone '${name}' needs pivot: [x, y]`);
    if (b.parent !== undefined && typeof b.parent !== "string") throw new VexError(`bone '${name}': parent must be a bone name`);
    const items = b.items === undefined ? [] : Array.isArray(b.items) ? b.items : [b.items];
    bones.set(name, { parent: b.parent as string | undefined, pivot: p as [number, number], z: b.z === undefined ? n : Number(b.z), items });
    n++;
  }
  const chains = new Map<string, string[]>();
  for (const name of bones.keys()) {
    const chain: string[] = [];
    for (let cur: string | undefined = name; cur !== undefined; cur = bones.get(cur)!.parent) {
      if (chain.includes(cur)) throw new VexError(`bone cycle: ${[...chain, cur].reverse().join(" -> ")}`);
      if (!bones.has(cur)) throw new VexError(`bone '${chain[chain.length - 1]}': unknown parent '${cur}'${didYouMean(cur, bones.keys())}`);
      chain.unshift(cur);
    }
    chains.set(name, chain);
  }
  const order = [...bones.keys()].sort((a, b) => bones.get(a)!.z! - bones.get(b)!.z!);
  return { __rig: true, bones, chains, order };
}

export function isRig(v: unknown): v is Rig {
  return isObj(v) && v.__rig === true;
}

function ease(e: Ease, t: number): number {
  switch (e) {
    case "step": return 0;
    case "in": return t * t;
    case "out": return 1 - (1 - t) * (1 - t);
    case "inOut": return t * t * (3 - 2 * t);
    default: return t;
  }
}

/** Value of a track at frame i (keys hold before the first and after the last key). */
export function sample<T extends number | number[]>(track: Track<T>, f: FrameInfo): T {
  if (typeof track === "function") return track(f);
  const i = f.i;
  if (i <= track[0][0]) return track[0][1];
  const last = track[track.length - 1];
  if (i >= last[0]) return last[1];
  let k = 0;
  while (track[k + 1][0] <= i) k++;
  const [f0, v0, e = "inOut"] = track[k], [f1, v1] = track[k + 1];
  const t = ease(e as Ease, (i - f0) / (f1 - f0));
  if (typeof v0 === "number") return (v0 + ((v1 as number) - v0) * t) as T;
  return (v0 as number[]).map((a, j) => a + ((v1 as number[])[j] - a) * t) as T;
}

export function checkClip(rig: Rig, clip: unknown, frames?: number): Clip {
  if (!isObj(clip)) throw new VexError("a clip is { bone: { rot, move, scale }, ... }");
  for (const [bone, keys] of Object.entries(clip)) {
    if (!rig.bones.has(bone)) throw new VexError(`clip: unknown bone '${bone}'${didYouMean(bone, rig.bones.keys())}`);
    if (!isObj(keys)) throw new VexError(`clip bone '${bone}': use { rot, move, scale }`);
    for (const [ch, tr] of Object.entries(keys)) {
      if (!["rot", "move", "scale"].includes(ch)) throw new VexError(`clip bone '${bone}': unknown channel '${ch}'${didYouMean(ch, ["rot", "move", "scale"])} (rot, move, scale)`);
      if (typeof tr === "function") continue;
      if (!Array.isArray(tr) || !tr.length) throw new VexError(`${bone}.${ch}: keys are [[frame, value, ease?], ...] or a function (f) => value`);
      let prev = -Infinity;
      for (const k of tr) {
        if (!Array.isArray(k) || k.length < 2 || typeof k[0] !== "number") throw new VexError(`${bone}.${ch}: each key is [frame, value] or [frame, value, ease]`);
        if (k[0] <= prev) throw new VexError(`${bone}.${ch}: key frames must increase (${prev} then ${k[0]})`);
        prev = k[0];
        if (frames !== undefined && (k[0] < 0 || k[0] > frames)) throw new VexError(`${bone}.${ch}: key at frame ${k[0]} is outside 0..${frames}`);
        if (k[2] !== undefined && !EASES.includes(k[2])) throw new VexError(`${bone}.${ch}: ease '${k[2]}'${didYouMean(String(k[2]), EASES)} (${EASES.join(", ")})`);
        const v = k[1];
        const ok = ch === "rot" ? typeof v === "number" : ch === "move" ? Array.isArray(v) && v.length === 2 : typeof v === "number" || (Array.isArray(v) && v.length === 2);
        if (!ok) throw new VexError(`${bone}.${ch}: value ${JSON.stringify(v)} should be ${ch === "rot" ? "degrees" : ch === "move" ? "[dx, dy]" : "a number or [sx, sy]"}`);
      }
    }
  }
  return clip as Clip;
}
