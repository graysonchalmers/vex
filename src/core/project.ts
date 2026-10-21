// Project: the registry an art file fills in (the DSL), plus the lazy, cached, cycle-checked
// builder that turns definitions into resolved node trees.
import { VexError, didYouMean, wrap } from "./errors.ts";
import { type Clip, type Rig, checkClip, isRig, makeRig, sample } from "./rig.ts";
import { arcD, points, polyD, smoothD, starD } from "./geom.ts";
import {
  type AssetDef, type AssetKind, type AssetOpts, type FrameInfo, type GroupDef, type Grad, type Item, type Node,
  type Paint, type Ref, type SheetDef, type ShapeNode, type Step, type Style, type UseOpts, STYLE_KEYS, isGrad, isNode, isRef,
} from "./model.ts";
import { Palette } from "./palette.ts";
import { type Box, serialize, svgDoc } from "./svg.ts";
import { fmtArgs, globRe, hash, n, pickRange, rng } from "./util.ts";

const ASSET_OPTS: Record<AssetKind, string[]> = {
  sprite: ["w", "h", "base", "mx", "my", "swap", "flip", "rot", "outline", "ow", "scale"],
  scene: ["w", "h", "bg", "base", "mx", "my", "swap", "flip", "rot", "outline", "ow", "scale"],
  anim: ["w", "h", "bg", "base", "mx", "my", "swap", "flip", "rot", "outline", "ow", "scale", "frames", "fps"],
};
const USE_OPTS = ["scale", "rot", "flip", "anchor", "swap", "opacity", "frame", "delay", "seed"];
const SCATTER_OPTS = USE_OPTS;
const TILE_OPTS = [...USE_OPTS, "dx", "dy"];
const TF_OPTS = ["x", "y", "rot", "scale", "flip", "origin", "opacity", "glow", "blur", "blend"];
const SHEET_OPTS = ["cols", "pad", "scale"];
const BLENDS = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];

/** Shape ops: argument spec ("n" number, "s" string, "a" point list) and extra option keys. */
const SHAPES: Record<string, { args: string; extra: string[]; stroke?: boolean }> = {
  rect: { args: "x:n y:n w:n h:n", extra: ["r"] },
  circle: { args: "cx:n cy:n r:n", extra: [] },
  ellipse: { args: "cx:n cy:n rx:n ry:n", extra: [] },
  poly: { args: "points:a", extra: [] },
  blob: { args: "points:a", extra: ["smooth"] },
  line: { args: "points:a", extra: [], stroke: true },
  curve: { args: "points:a", extra: ["smooth"], stroke: true },
  path: { args: "d:s", extra: [] },
  star: { args: "cx:n cy:n points:n r1:n r2:n", extra: ["rot"] },
  ngon: { args: "cx:n cy:n sides:n r:n", extra: ["rot"] },
  arc: { args: "cx:n cy:n r:n from:n to:n", extra: ["pie"], stroke: true },
  text: { args: "x:n y:n str:s", extra: ["size", "font", "anchor", "weight"] },
};

export interface StepInfo {
  label: string;
  loc?: string;
  /** Number of raw nodes after this step. */
  end: number;
}

export interface Built {
  name: string;
  kind: AssetKind;
  /** Declared size (placement box). */
  w: number;
  h: number;
  /** Drawn area (grows with outline). */
  box: Box;
  /** Final nodes. */
  nodes: Node[];
  /** Nodes before mirror/swap/flip/rot/outline, for step replay. */
  raw: Node[];
  steps: StepInfo[];
  /** Post-processing applied after the steps, by name. */
  post: string[];
  pal: Palette;
  frame: number;
  frames: number;
  fps: number;
  scale: number;
}

function isPlain(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !isNode(v) && !isRef(v) && !isGrad(v);
}

function checkKeys(what: string, obj: object, allowed: string[]): void {
  for (const k of Object.keys(obj))
    if (!allowed.includes(k)) throw new VexError(`${what}: unknown option '${k}'${didYouMean(k, allowed)} (allowed: ${allowed.join(", ")})`);
}

function checkArgs(name: string, spec: string, args: unknown[]): void {
  spec.split(" ").forEach((part, i) => {
    const [pname, type] = part.split(":");
    const v = args[i];
    const usage = `${name}(${spec.split(" ").map((p) => p.split(":")[0]).join(", ")}, style)`;
    if (v === undefined) throw new VexError(`missing argument ${i + 1} (${pname}); usage: ${usage}`);
    const bad = (want: string) => { throw new VexError(`argument ${i + 1} (${pname}) must be ${want}, got ${JSON.stringify(v) ?? typeof v}; usage: ${usage}`); };
    if (type === "n" && (typeof v !== "number" || !Number.isFinite(v))) bad("a number");
    if (type === "s" && typeof v !== "string") bad("a string");
    if (type === "a" && !Array.isArray(v)) bad("a point list [x0, y0, x1, y1, ...]");
  });
}

function tfString(x: number, y: number, rot = 0, sx = 1, sy = 1, ox = 0, oy = 0): string | undefined {
  const parts: string[] = [];
  if (x || y) parts.push(`translate(${n(x)} ${n(y)})`);
  if (rot) parts.push(`rotate(${n(rot)})`);
  if (sx !== 1 || sy !== 1) parts.push(`scale(${n(sx)} ${n(sy)})`);
  if (ox || oy) parts.push(`translate(${n(-ox)} ${n(-oy)})`);
  return parts.length ? parts.join(" ") : undefined;
}

function flipXY(flip: unknown, what: string): [number, number] {
  if (flip === undefined) return [1, 1];
  if (flip !== "x" && flip !== "y" && flip !== "xy") throw new VexError(`${what}: flip must be "x", "y" or "xy"`);
  return [flip.includes("x") ? -1 : 1, flip.includes("y") ? -1 : 1];
}

function anchorOf(a: UseOpts["anchor"], dflt: [number, number]): [number, number] {
  if (a === undefined) return dflt;
  if (a === "center") return [0.5, 0.5];
  if (a === "bottom") return [0.5, 1];
  if (a === "top") return [0.5, 0];
  if (Array.isArray(a) && a.length === 2 && a.every((v) => typeof v === "number")) return a;
  throw new VexError(`anchor must be [ax, ay] (fractions of the asset box), "center", "bottom" or "top"`);
}

function frameInfo(i: number, count: number, seed: number): FrameInfo {
  const t = i / count;
  return {
    i, n: count, t,
    sin: (amp = 1, phase = 0, cycles = 1) => amp * Math.sin(2 * Math.PI * (t * cycles + phase)),
    cos: (amp = 1, phase = 0, cycles = 1) => amp * Math.cos(2 * Math.PI * (t * cycles + phase)),
    rng: (s = 0) => rng(seed + s),
  };
}

export class Project {
  readonly assets = new Map<string, AssetDef>();
  readonly order: string[] = [];
  readonly groups = new Map<string, GroupDef>();
  readonly sheets: SheetDef[] = [];
  readonly spines: SpineDef[] = [];
  /** Art files loaded so far (absolute paths or virtual names), for locations and watching. */
  readonly files: string[] = [];
  pal: Palette = Palette.builtin("sweetie16");
  /** Set by a loader to support include(). */
  includeHook?: (path: string) => void;

  private cache = new Map<string, Built>();
  private building = new Set<string>();
  private failed = new Map<string, VexError>();

  // ---------------------------------------------------------------- locations

  addFile(file: string): void {
    if (!this.files.includes(file)) this.files.push(file);
  }

  locFromStack(stack: string): string | undefined {
    for (const line of stack.split("\n")) {
      for (const f of this.files) {
        const i = line.indexOf(f + ":");
        if (i < 0) continue;
        const m = /^:(\d+):(\d+)/.exec(line.slice(i + f.length));
        if (m) return `${f.replace(/^.*[\\/]/, "")}:${m[1]}:${m[2]}`;
      }
    }
    return undefined;
  }

  callerLoc(): string | undefined {
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 60;
    const stack = new Error().stack ?? "";
    Error.stackTraceLimit = limit;
    return this.locFromStack(stack);
  }

  // ---------------------------------------------------------------- DSL

  /** Functions visible to art files. */
  env(): Record<string, unknown> {
    const env: Record<string, unknown> = {};
    /** Run fn with the caller's location attached to any error. */
    const at = <T>(what: string, fn: (loc?: string) => T): T => {
      const loc = this.callerLoc();
      try { return fn(loc); } catch (e) { throw wrap(e).within(what, loc); }
    };
    const color = (c: unknown, what: string): string => {
      if (typeof c !== "string") throw new VexError(`${what} must be a color string, got ${JSON.stringify(c) ?? typeof c}`);
      this.pal.resolve(c);
      return c;
    };
    const paintArg = (p: unknown, what: string): Paint => (isGrad(p) ? p : color(p, what));
    const styleArg = (v: unknown, extra: string[], strokeDefault: boolean): { style: Style; ex: Record<string, unknown> } => {
      if (v === undefined) throw new VexError(`needs a style: a color ("g") or { fill, stroke, sw, ... }`);
      if (typeof v === "string" || isGrad(v)) return { style: strokeDefault ? { stroke: paintArg(v, "stroke"), sw: 1 } : { fill: paintArg(v, "fill") }, ex: {} };
      if (!isPlain(v)) throw new VexError(`style must be a color or an options object`);
      checkKeys("style", v, [...STYLE_KEYS, ...extra]);
      const style: Style = {}, ex: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        if (extra.includes(k)) ex[k] = val;
        else if (k === "fill" || k === "stroke") style[k] = paintArg(val, k);
        else if (k === "glow" && isPlain(val)) {
          checkKeys("glow", val, ["r", "color", "strength"]);
          if (val.color !== undefined) color(val.color, "glow color");
          style.glow = val as unknown as Style["glow"];
        } else if (k === "grain") {
          if (!isPlain(val)) throw new VexError("grain must be { freq, octaves, seed }");
          checkKeys("grain", val, ["freq", "octaves", "seed"]);
          style.grain = val as Style["grain"];
        } else if (k === "blend") {
          if (!BLENDS.includes(val as string)) throw new VexError(`blend must be one of ${BLENDS.join(", ")}${didYouMean(String(val), BLENDS)}`);
          style.blend = val as string;
        } else (style as Record<string, unknown>)[k] = val;
      }
      if (style.fill === undefined && style.stroke === undefined) {
        if (strokeDefault) throw new VexError(`style needs a stroke (or fill)`);
        throw new VexError(`style needs a fill or a stroke`);
      }
      return { style, ex };
    };

    env.use = (p: unknown) => at("use", () => {
      if (Array.isArray(p)) this.pal = Palette.fromColors(p as string[]);
      else if (typeof p === "string") this.pal = Palette.builtin(p);
      else throw new VexError('use("sweetie16") or use(["#000", "#fff", ...])');
    });
    env.pal = (aliases: unknown) => at("pal", () => {
      if (!isPlain(aliases)) throw new VexError('pal({ k: "#1b1630", g: 6 })');
      this.pal = this.pal.extend(aliases as Record<string, string>);
    });
    env.ramps = (...ramps: unknown[]) => at("ramps", () => { this.pal = this.pal.withRamps(ramps as string[]); });
    env.dark = (key: unknown, steps: unknown = 1) => at("dark", () => this.pal.step(color(key, "key"), -Number(steps)));
    env.lite = (key: unknown, steps: unknown = 1) => at("lite", () => this.pal.step(color(key, "key"), Number(steps)));
    const stops = (cs: unknown, what: string): [string, number][] => {
      if (!Array.isArray(cs) || cs.length < 2) throw new VexError(`${what} needs a color list like ["w", "g"] or [["w", 0], ["g", 1]]`);
      return cs.map((c, i) => (Array.isArray(c) ? [color(c[0], "stop"), Number(c[1])] : [color(c, "stop"), i / (cs.length - 1)]));
    };
    env.lin = (cs: unknown, angle: unknown = 90): Grad => at("lin", () => {
      if (typeof angle !== "number") throw new VexError("lin(colors, angleDegrees)");
      return { __grad: "lin", stops: stops(cs, "lin"), angle };
    });
    env.rad = (cs: unknown, o: unknown = {}): Grad => at("rad", () => {
      if (!isPlain(o)) throw new VexError("rad(colors, { cx, cy, r })");
      checkKeys("rad", o, ["cx", "cy", "r"]);
      return { __grad: "rad", stops: stops(cs, "rad"), ...(o as { cx?: number }) };
    });

    const define = (kind: AssetKind, name: unknown, rest: unknown[]) => at(kind, (loc) => {
      if (typeof name !== "string" || !name) throw new VexError(`${kind} needs a name string first`);
      const prev = this.assets.get(name) ?? this.groups.get(name);
      if (prev) throw new VexError(`'${name}' is already defined at ${prev.loc}`);
      const opts = (isPlain(rest[0]) ? rest.shift() : {}) as AssetOpts;
      checkKeys(`${kind} '${name}'`, opts, ASSET_OPTS[kind]);
      if (opts.outline !== undefined) color(opts.outline, "outline");
      if (opts.bg !== undefined) paintArg(opts.bg, "bg");
      for (const [k, v] of Object.entries(opts.swap ?? {})) { color(k, "swap key"); color(v, "swap value"); }
      this.assets.set(name, { kind, name, opts, items: rest as Item[], pal: this.pal, loc });
      this.order.push(name);
    });
    env.sprite = (name: unknown, ...rest: unknown[]) => define("sprite", name, rest);
    env.scene = (name: unknown, ...rest: unknown[]) => define("scene", name, rest);
    env.anim = (name: unknown, ...rest: unknown[]) => define("anim", name, rest);
    env.group = (name: unknown, members: unknown) => at("group", (loc) => {
      if (typeof name !== "string" || !Array.isArray(members) || !members.every((m) => typeof m === "string"))
        throw new VexError('group("name", ["a", "b*", ...])');
      const prev = this.assets.get(name) ?? this.groups.get(name);
      if (prev) throw new VexError(`'${name}' is already defined at ${prev.loc}`);
      this.groups.set(name, { name, members, loc });
    });
    env.sheet = (name: unknown, entries: unknown, opts: unknown = {}) => at("sheet", (loc) => {
      if (typeof name !== "string" || !Array.isArray(entries) || !isPlain(opts)) throw new VexError('sheet("name", ["a", "b*"], { cols, pad, scale })');
      checkKeys(`sheet '${name}'`, opts, SHEET_OPTS);
      this.sheets.push({ name, entries, opts: opts as SheetDef["opts"], loc });
    });
    env.include = (path: unknown) => {
      if (typeof path !== "string") throw new VexError('include("other.vx.js")', this.callerLoc());
      if (!this.includeHook) throw new VexError("include() is not available here", this.callerLoc());
      this.includeHook(path);
    };
    env.rng = (seed?: number) => rng(seed);

    for (const [name, spec] of Object.entries(SHAPES)) {
      env[name] = (...args: unknown[]): ShapeNode => at(name, (loc) => {
        checkArgs(name, spec.args, args);
        const argc = spec.args.split(" ").length;
        const { style, ex } = styleArg(args[argc], spec.extra, !!spec.stroke);
        if (args.length > argc + 1) throw new VexError(`too many arguments; options go in the style object`);
        return { k: "shape", ...shapeGeom(name, args, ex), style, step: { label: `${name}(${fmtArgs(args.slice(0, argc))})`, loc } };
      });
    }

    const ref = (kind: Ref["__ref"], allowed: string[], optsAt: number) => (...args: unknown[]): Ref => at(kind, (loc) => {
      const o = args[optsAt];
      if (o !== undefined) {
        if (!isPlain(o)) throw new VexError(`argument ${optsAt + 1} must be an options object`);
        checkKeys(kind, o, allowed);
        const sw = (o as UseOpts).swap;
        if (sw) for (const [k, v] of Object.entries(sw)) { color(k, "swap key"); color(v, "swap value"); }
      }
      return { __ref: kind, args, step: { label: `${kind}(${fmtArgs(args.slice(0, optsAt))})`, loc } };
    });
    const stamp = ref("stamp", USE_OPTS, 3);
    env.stamp = (...args: unknown[]) => {
      if (typeof args[0] !== "string") throw new VexError('stamp("name", x, y, { scale, rot, flip, anchor, swap, ... })', this.callerLoc());
      return stamp(...args);
    };
    env.scatter = ref("scatter", SCATTER_OPTS, 6);
    env.tile = ref("tile", TILE_OPTS, 5);
    env.tf = (o: unknown, ...items: unknown[]): Ref => at("tf", (loc) => {
      if (!isPlain(o)) throw new VexError("tf({ x, y, rot, scale, flip, origin, opacity, glow, blur, blend }, ...items)");
      checkKeys("tf", o, TF_OPTS);
      return { __ref: "tf", args: [o, ...items], step: { label: `tf(${fmtArgs([o])})`, loc } };
    });
    env.sym = (x: unknown, ...items: unknown[]): Ref => at("sym", (loc) => {
      if (typeof x !== "number") throw new VexError("sym(axisX, ...items): draws items plus their mirror image about x = axisX");
      return { __ref: "sym", args: [x, ...items], step: { label: `sym(${n(x)})`, loc } };
    });
    env.clip = (mask: unknown, ...items: unknown[]): Ref => at("clip", (loc) => {
      if (!isNode(mask) && !Array.isArray(mask)) throw new VexError("clip(maskShape, ...items): the mask is a shape like circle(...) or a list of shapes");
      return { __ref: "clip", args: [mask, ...items], step: { label: "clip(…)", loc } };
    });
    env.rig = (spec: unknown) => at("rig", () => makeRig(spec));
    // Spine export: each bone's art becomes a hidden part sprite (rest pose, full asset box).
    env.spine = (name: unknown, rg: unknown, o: unknown) => at("spine", (loc) => {
      if (typeof name !== "string" || !name) throw new VexError('spine("name", rig, { w, h, scale, outline, clips: { walk: { clip, frames, fps } } })');
      if (!isRig(rg)) throw new VexError("spine: the second argument must come from rig({ ... })");
      if (!isPlain(o)) throw new VexError("spine options must be an object");
      checkKeys(`spine '${name}'`, o, ["w", "h", "scale", "outline", "ow", "clips", "origin"]);
      if (!(typeof o.w === "number" && typeof o.h === "number")) throw new VexError(`spine '${name}' needs { w, h }: the rig's asset box`);
      const clips = (o.clips ?? {}) as Record<string, unknown>;
      if (!isPlain(clips)) throw new VexError("spine clips: { name: { clip, frames, fps } }");
      const parsed: SpineDef["clips"] = {};
      for (const [cn, c] of Object.entries(clips)) {
        if (!isPlain(c) || !(typeof c.frames === "number" && c.frames >= 1)) throw new VexError(`spine clip '${cn}': { clip, frames, fps }`);
        parsed[cn] = { clip: checkClip(rg, c.clip ?? {}), frames: c.frames, fps: Number(c.fps ?? 12) };
      }
      const parts: string[] = [];
      for (const [bone, b] of rg.bones) {
        if (!b.items.length) continue;
        const asset = `_spine_${name}_${bone}`;
        (env.sprite as (...a: unknown[]) => void)(asset, { w: o.w, h: o.h, ...(o.outline ? { outline: o.outline, ow: o.ow ?? 1.5 } : {}) }, ...b.items);
        parts.push(bone);
      }
      this.spines.push({ name, rig: rg, w: o.w, h: o.h, scale: Number(o.scale ?? 1), clips: parsed, parts, origin: (o.origin as [number, number]) ?? [o.w / 2, o.h], loc });
    });
    env.pose = (rg: unknown, clip: unknown = {}) => at("pose", () => {
      if (!isRig(rg)) throw new VexError("pose(rig, clip): the first argument must come from rig({ ... })");
      const c = checkClip(rg, clip);
      const tf = env.tf as (o: unknown, ...items: unknown[]) => Ref;
      // Each bone is drawn in z order, wrapped in its chain's transforms (root outermost), so the
      // hierarchy decides where it goes and z decides what is on top.
      return (f: FrameInfo) => rg.order.map((name) => {
        let item: unknown = rg.bones.get(name)!.items;
        const chain = rg.chains.get(name)!;
        for (let k = chain.length - 1; k >= 0; k--) {
          const b = rg.bones.get(chain[k])!, keys = c[chain[k]] ?? {};
          const rot = keys.rot ? sample(keys.rot, f) : 0;
          const mv = keys.move ? sample(keys.move, f) : [0, 0];
          const sc = keys.scale ? sample(keys.scale, f) : 1;
          if (!rot && !mv[0] && !mv[1] && sc === 1) continue;
          item = tf({ x: mv[0], y: mv[1], rot, scale: sc, origin: b.pivot }, item);
        }
        return item;
      });
    });
    return env;
  }

  // ---------------------------------------------------------------- resolving

  candidates(name: string, depth = 0): string[] {
    if (depth > 8) throw new VexError(`group nesting too deep at '${name}'`);
    const g = this.groups.get(name);
    if (g) return g.members.flatMap((m) => this.candidates(m, depth + 1));
    if (name.includes("*")) {
      const re = globRe(name);
      const list = this.order.filter((x) => re.test(x));
      if (!list.length) throw new VexError(`'${name}' matches no assets`);
      return list;
    }
    return [name];
  }

  /** Build an asset at a frame (anims wrap around; still assets ignore it). */
  build(name: string, frame = 0, seed = 0): Built {
    const def = this.assets.get(name);
    if (!def) {
      if (this.groups.has(name) || name.includes("*")) throw new VexError(`'${name}' is a group/glob: use it in stamp, scatter or tile`);
      throw new VexError(`unknown asset '${name}'${didYouMean(name, this.order)}`);
    }
    const count = frameCount(def);
    const f = ((Math.floor(frame) % count) + count) % count;
    const key = `${name}#${f}@${seed}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const failed = this.failed.get(key);
    if (failed) throw new VexError(`depends on '${name}', which failed`);
    if (this.building.has(name)) throw new VexError(`reference cycle through '${name}'`);
    this.building.add(name);
    try {
      const out = this.buildAsset(def, f, count, seed);
      this.cache.set(key, out);
      return out;
    } catch (e) {
      const err = wrap(e, (s) => this.locFromStack(s)).within(`${def.kind} '${name}'`, def.loc);
      this.failed.set(key, err);
      throw err;
    } finally {
      this.building.delete(name);
    }
  }

  /** Finished SVG document of an asset frame. */
  svg(name: string, frame = 0, scale?: number): string {
    const b = this.build(name, frame);
    const s = serialize(b.nodes, b.pal, idPrefix(name, b.frame));
    return svgDoc(b.box, s.defs, s.bodies.join(""), scale ?? b.scale);
  }

  exported(): string[] {
    return this.order.filter((x) => !x.startsWith("_"));
  }

  /** Expand a sheet's entries: globs match exported names, groups expand to members. */
  sheetNames(s: SheetDef): string[] {
    const out: string[] = [];
    const add = (x: string) => { if (!out.includes(x)) out.push(x); };
    for (const e of s.entries) {
      if (e.includes("*")) {
        const re = globRe(e);
        this.exported().filter((x) => re.test(x)).forEach(add);
      } else if (this.groups.has(e)) this.candidates(e).forEach(add);
      else add(e);
    }
    return out;
  }

  private buildAsset(def: AssetDef, frame: number, count: number, seed: number): Built {
    const { opts } = def;
    let w: number, h: number, box: Box, raw: Node[] = [], scale = opts.scale ?? 1;
    if (opts.base) {
      const b = this.build(opts.base, frame, seed);
      scale = opts.scale ?? b.scale;
      w = opts.w ?? b.w;
      h = opts.h ?? b.h;
      box = { ...b.box };
      raw.push({ k: "g", pal: b.pal, children: b.nodes, step: { label: `base '${opts.base}'`, loc: def.loc } });
    } else {
      if (!(typeof opts.w === "number" && opts.w > 0 && typeof opts.h === "number" && opts.h > 0))
        throw new VexError(`needs a size: ${def.kind}("${def.name}", { w: 32, h: 32 }, ...)`);
      w = opts.w;
      h = opts.h;
      box = { x: 0, y: 0, w, h };
    }
    if (opts.bg !== undefined) raw.push({ k: "shape", tag: "rect", attrs: { x: box.x, y: box.y, width: box.w, height: box.h }, style: { fill: opts.bg }, step: { label: "background", loc: def.loc } });

    const fi = frameInfo(frame, count, hash(def.name) + seed);
    const steps: StepInfo[] = raw.map((r, i) => ({ label: r.step!.label, loc: r.step!.loc, end: i + 1 }));
    for (const item of def.items) {
      const got = this.expand(item, def, fi, seed, 0);
      raw.push(...got);
      const st = stepOf(item, def);
      steps.push({ label: st.label, loc: st.loc, end: raw.length });
    }

    let nodes = raw;
    const post: string[] = [];
    if (opts.mx) {
      nodes = [{ k: "g", children: nodes }, { k: "g", tf: `matrix(-1 0 0 1 ${n(w)} 0)`, children: nodes }];
      post.push("mirror x");
    }
    if (opts.my) {
      nodes = [{ k: "g", children: nodes }, { k: "g", tf: `matrix(1 0 0 -1 0 ${n(h)})`, children: nodes }];
      post.push("mirror y");
    }
    if (opts.swap) { nodes = [{ k: "g", swap: opts.swap, children: nodes }]; post.push("swap"); }
    if (opts.flip || opts.rot) {
      const [fx, fy] = flipXY(opts.flip, def.name);
      nodes = [{ k: "g", tf: tfString(w / 2, h / 2, opts.rot ?? 0, fx, fy, w / 2, h / 2), children: nodes }];
      post.push([opts.flip && `flip ${opts.flip}`, opts.rot && `rot ${opts.rot}`].filter(Boolean).join(", "));
    }
    if (opts.outline) {
      const ow = opts.ow ?? 2;
      if (!(ow > 0)) throw new VexError(`ow (outline width) must be > 0`);
      nodes = [{ k: "g", silhouette: { color: opts.outline, ow }, children: nodes }];
      box = { x: box.x - ow, y: box.y - ow, w: box.w + 2 * ow, h: box.h + 2 * ow };
      post.push(`outline ${opts.outline}`);
    }
    return {
      name: def.name, kind: def.kind, w, h, box, nodes, raw, steps, post, pal: def.pal,
      frame, frames: count, fps: opts.fps ?? 12, scale,
    };
  }

  private expand(item: unknown, def: AssetDef, fi: FrameInfo, seed: number, depth: number): Node[] {
    if (depth > 64) throw new VexError("items nest too deep (a function returning itself?)");
    if (item === null || item === undefined || item === false) return [];
    if (Array.isArray(item)) return item.flatMap((v) => this.expand(v, def, fi, seed, depth + 1));
    if (typeof item === "function") {
      let got: unknown;
      try { got = item(fi); } catch (e) { throw wrap(e, (s) => this.locFromStack(s)); }
      return this.expand(got, def, fi, seed, depth + 1);
    }
    if (isNode(item)) return [item];
    if (isRef(item)) {
      try { return this.resolve(item, def, fi, seed, depth); } catch (e) { throw wrap(e, (s) => this.locFromStack(s)).within(item.step.label, item.step.loc); }
    }
    const what = typeof item === "string" ? `the string ${JSON.stringify(item.slice(0, 20))}` : `a ${typeof item}`;
    throw new VexError(`item is ${what}; items are shapes, stamp/tf/clip/scatter/tile, functions (f) => items, or lists of those`, this.callerLoc());
  }

  private resolve(r: Ref, def: AssetDef, fi: FrameInfo, seed: number, depth: number): Node[] {
    const a = r.args;
    if (r.__ref === "tf") {
      const o = a[0] as Record<string, unknown>;
      const [fx, fy] = flipXY(o.flip, "tf");
      const sc = o.scale ?? 1;
      const [sx, sy] = Array.isArray(sc) ? sc as [number, number] : [sc as number, sc as number];
      const [ox, oy] = (o.origin as [number, number] | undefined) ?? [0, 0];
      const style: Style = {};
      for (const k of ["opacity", "glow", "blur", "blend"] as const) if (o[k] !== undefined) (style as Record<string, unknown>)[k] = o[k];
      const tf = tfString(Number(o.x ?? 0) + ox, Number(o.y ?? 0) + oy, Number(o.rot ?? 0), sx * fx, sy * fy, ox, oy);
      return [{ k: "g", tf, style: Object.keys(style).length ? style : undefined, children: this.expand(a.slice(1), def, fi, seed, depth + 1) }];
    }
    if (r.__ref === "sym") {
      const ax = a[0] as number;
      const kids = this.expand(a.slice(1), def, fi, seed, depth + 1);
      return [{ k: "g", children: kids }, { k: "g", tf: `matrix(-1 0 0 1 ${n(2 * ax)} 0)`, children: kids }];
    }
    if (r.__ref === "clip") {
      const mask = this.expand(a[0], def, fi, seed, depth + 1);
      return [{ k: "clip", mask, children: this.expand(a.slice(1), def, fi, seed, depth + 1) }];
    }
    if (typeof a[0] !== "string") throw new VexError(`${r.__ref} needs an asset name first`);
    const name = a[0];
    const cands = this.candidates(name);
    const pick = (rr: () => number) => cands[Math.floor(rr() * cands.length) % cands.length];
    if (r.__ref === "stamp") {
      checkArgs("stamp", "name:s x:n y:n", a);
      const o = (a[3] ?? {}) as UseOpts;
      const rr = rng(hash(`${name}|${a[1]}|${a[2]}`) + seed);
      return [this.place(pick(rr), a[1] as number, a[2] as number, o, fi, seed, [0, 0], rr)];
    }
    if (r.__ref === "tile") {
      checkArgs("tile", "name:s x:n y:n cols:n rows:n", a);
      const o = (a[5] ?? {}) as UseOpts & { dx?: number; dy?: number };
      const first = this.build(cands[0], 0, seed);
      const dx = o.dx ?? first.w, dy = o.dy ?? first.h;
      const out: Node[] = [];
      for (let j = 0; j < (a[4] as number); j++)
        for (let i = 0; i < (a[3] as number); i++) {
          const rr = rng(hash(`${name}|${i}|${j}`) + seed);
          out.push(this.place(pick(rr), (a[1] as number) + i * dx, (a[2] as number) + j * dy, o, fi, seed, [0, 0], rr));
        }
      return out;
    }
    // scatter(name, x, y, w, h, count, opts)
    checkArgs("scatter", "name:s x:n y:n w:n h:n count:n", a);
    const [, x, y, w, h, count] = a as [string, number, number, number, number, number];
    const o = (a[6] ?? {}) as UseOpts & { scale?: number | [number, number]; rot?: number | [number, number] };
    const rr = rng(hash(`${name}|${x}|${y}|${w}|${h}|${count}`) + seed);
    const out: Node[] = [];
    for (let k = 0; k < count; k++) {
      const px = x + rr() * w, py = y + rr() * h;
      const s = pickRange(o.scale as number | [number, number] | undefined, rr, 1);
      const rot = pickRange(o.rot as number | [number, number] | undefined, rr, 0);
      const flip = o.flip ? ([o.flip.includes("x") && rr() < 0.5 && "x", o.flip.includes("y") && rr() < 0.5 && "y"].filter(Boolean).join("") || undefined) as UseOpts["flip"] : undefined;
      out.push(this.place(pick(rr), px, py, { ...o, scale: s, rot, flip, delay: (o.delay ?? 0) + k }, fi, seed, [0.5, 0.5], rr));
    }
    return out;
  }

  /** One placed copy of an asset as a transformed group. */
  private place(name: string, x: number, y: number, o: UseOpts, fi: FrameInfo, seed: number, dfltAnchor: [number, number], rr: () => number): Node {
    const target = this.assets.get(name);
    const tFrames = target ? frameCount(target) : 1;
    const frame = o.frame ?? (tFrames > 1 && fi.n > 1 ? Math.round((fi.i / fi.n) * tFrames) + (o.delay ?? 0) : o.delay ?? 0);
    const b = this.build(name, frame, o.seed ?? (seed ? seed + Math.floor(rr() * 1e6) : 0));
    const [ax, ay] = anchorOf(o.anchor, dfltAnchor);
    const sc = o.scale ?? 1;
    const [sx, sy] = Array.isArray(sc) ? sc : [sc, sc];
    const [fx, fy] = flipXY(o.flip, `stamp '${name}'`);
    return {
      k: "g", pal: b.pal, swap: o.swap,
      tf: tfString(x, y, o.rot ?? 0, sx * fx, sy * fy, ax * b.w, ay * b.h),
      style: o.opacity !== undefined ? { opacity: o.opacity } : undefined,
      children: b.nodes,
    };
  }
}

function frameCount(def: AssetDef): number {
  if (def.kind !== "anim") return 1;
  const f = def.opts.frames ?? 8;
  if (!(Number.isInteger(f) && f >= 1 && f <= 600)) throw new VexError(`anim '${def.name}': frames must be an integer 1..600`);
  return f;
}

function stepOf(item: unknown, def: AssetDef): Step {
  if (isNode(item) && item.step) return item.step;
  if (isRef(item)) return item.step;
  if (typeof item === "function") return { label: "ƒ(f)", loc: def.loc };
  if (Array.isArray(item)) return { label: `[${item.length} items]`, loc: def.loc };
  return { label: "item", loc: def.loc };
}

export interface SpineDef {
  name: string;
  rig: Rig;
  w: number;
  h: number;
  /** Export pixels per unit. */
  scale: number;
  clips: Record<string, { clip: Clip; frames: number; fps: number }>;
  /** Bones that draw something. */
  parts: string[];
  /** Skeleton origin in asset units (default: bottom center). */
  origin: [number, number];
  loc?: string;
}

export function idPrefix(name: string, frame: number): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "_") + (frame ? `_f${frame}` : "") + "_";
}

function shapeGeom(name: string, a: unknown[], ex: Record<string, unknown>): Pick<ShapeNode, "tag" | "attrs" | "text"> {
  const num = (i: number) => a[i] as number;
  switch (name) {
    case "rect": {
      const attrs: Record<string, number> = { x: num(0), y: num(1), width: num(2), height: num(3) };
      if (ex.r !== undefined) attrs.rx = Number(ex.r);
      if (!(attrs.width >= 0 && attrs.height >= 0)) throw new VexError("rect: w and h must be >= 0");
      return { tag: "rect", attrs };
    }
    case "circle": return { tag: "circle", attrs: { cx: num(0), cy: num(1), r: num(2) } };
    case "ellipse": return { tag: "ellipse", attrs: { cx: num(0), cy: num(1), rx: num(2), ry: num(3) } };
    case "poly": return { tag: "path", attrs: { d: polyD(points(a[0], "poly", 3), true) } };
    case "line": return { tag: "path", attrs: { d: polyD(points(a[0], "line", 2), false) } };
    case "blob": return { tag: "path", attrs: { d: smoothD(points(a[0], "blob", 3), true, Number(ex.smooth ?? 1)) } };
    case "curve": return { tag: "path", attrs: { d: smoothD(points(a[0], "curve", 2), false, Number(ex.smooth ?? 1)) } };
    case "path": return { tag: "path", attrs: { d: a[0] as string } };
    case "star": return { tag: "path", attrs: { d: starD(num(0), num(1), num(2), num(3), num(4), Number(ex.rot ?? 0)) } };
    case "ngon": return { tag: "path", attrs: { d: starD(num(0), num(1), num(2), num(3), num(3), Number(ex.rot ?? 0)) } };
    case "arc": return { tag: "path", attrs: { d: arcD(num(0), num(1), num(2), num(3), num(4), !!ex.pie) } };
    case "text": {
      const attrs: Record<string, string | number> = { x: num(0), y: num(1), "font-size": Number(ex.size ?? 8), "font-family": String(ex.font ?? "sans-serif") };
      if (ex.anchor) attrs["text-anchor"] = String(ex.anchor);
      if (ex.weight) attrs["font-weight"] = String(ex.weight);
      return { tag: "text", attrs, text: a[2] as string };
    }
  }
  throw new VexError(`unknown shape '${name}'`);
}
