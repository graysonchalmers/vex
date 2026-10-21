// Serializes resolved nodes to SVG. The only owner of color resolution: palette keys stay keys
// through the whole build so swaps (variants, use(..., { swap })) compose, and resolve here.
import { VexError } from "./errors.ts";
import { type GlowOpts, type Grad, type Node, type Paint, type ShapeNode, type Style, isGrad } from "./model.ts";
import type { Palette } from "./palette.ts";
import { esc, n } from "./util.ts";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Sil {
  color: string;
  ow: number;
}

class Ctx {
  defs: string[] = [];
  private seen = new Map<string, string>();
  private next = 0;
  pals: Palette[];
  swaps: Record<string, string>[] = [];
  readonly prefix: string;

  constructor(pal: Palette, prefix: string) {
    this.pals = [pal];
    this.prefix = prefix;
  }

  id(): string {
    return `${this.prefix}${this.next++}`;
  }

  /** Shared def (filters): one per distinct body. */
  def(key: string, make: (id: string) => string): string {
    let id = this.seen.get(key);
    if (!id) {
      id = this.id();
      this.seen.set(key, id);
      this.defs.push(make(id));
    }
    return id;
  }

  color(c: string): string {
    let k = c;
    for (let i = this.swaps.length - 1; i >= 0; i--) k = this.swaps[i][k] ?? k;
    for (let i = this.pals.length - 1; i > 0; i--) if (this.pals[i].has(k)) return this.pals[i].resolve(k);
    return this.pals[0].resolve(k);
  }
}

/** Fill/stroke attributes for a paint; 8-digit hex splits into color + opacity for portability. */
function paint(ctx: Ctx, attr: "fill" | "stroke", p: Paint): string {
  if (isGrad(p)) return ` ${attr}="url(#${gradient(ctx, p)})"`;
  const c = ctx.color(p);
  if (c.length === 9) return ` ${attr}="${c.slice(0, 7)}" ${attr}-opacity="${n(parseInt(c.slice(7), 16) / 255)}"`;
  return ` ${attr}="${c}"`;
}

function gradient(ctx: Ctx, g: Grad): string {
  const id = ctx.id();
  const stops = g.stops.map(([c, o]) => {
    const col = ctx.color(c);
    const op = col.length === 9 ? ` stop-opacity="${n(parseInt(col.slice(7), 16) / 255)}"` : "";
    return `<stop offset="${n(o)}" stop-color="${col === "none" ? "#000" : col.slice(0, 7)}"${col === "none" ? ' stop-opacity="0"' : op}/>`;
  }).join("");
  if (g.__grad === "lin") {
    const a = ((g.angle ?? 90) * Math.PI) / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    ctx.defs.push(`<linearGradient id="${id}" x1="${n(0.5 - dx)}" y1="${n(0.5 - dy)}" x2="${n(0.5 + dx)}" y2="${n(0.5 + dy)}">${stops}</linearGradient>`);
  } else {
    ctx.defs.push(`<radialGradient id="${id}" cx="${n(g.cx ?? 0.5)}" cy="${n(g.cy ?? 0.5)}" r="${n(g.r ?? 0.5)}">${stops}</radialGradient>`);
  }
  return id;
}

function filters(ctx: Ctx, s: Style): string {
  const parts: string[] = [];
  if (s.grain) {
    // Grey noise with full alpha, contrast-stretched, kept inside the shape's own alpha.
    const g = s.grain;
    const body = `<feTurbulence type="fractalNoise" baseFrequency="${n(g.freq ?? 1)}" numOctaves="${Math.max(1, Math.min(6, Math.round(g.octaves ?? 2)))}" seed="${Math.round(g.seed ?? 0)}" stitchTiles="stitch"/>` +
      `<feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1"/>` +
      `<feComponentTransfer><feFuncR type="linear" slope="2" intercept="-0.5"/><feFuncG type="linear" slope="2" intercept="-0.5"/><feFuncB type="linear" slope="2" intercept="-0.5"/></feComponentTransfer>` +
      `<feComposite in2="SourceGraphic" operator="in"/>`;
    const id = ctx.def(body, (id) => `<filter id="${id}" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox">${body}</filter>`);
    return ` filter="url(#${id})"`;
  }
  if (s.blur) parts.push(`<feGaussianBlur in="SourceGraphic" stdDeviation="${n(s.blur)}"/>`);
  let halo = "";
  if (s.glow) {
    const g: GlowOpts = typeof s.glow === "number" ? { r: s.glow } : s.glow;
    const src = s.blur ? "b0" : "SourceGraphic";
    if (s.blur) parts[0] = parts[0].replace("/>", ' result="b0"/>');
    const tint = g.color ? `<feFlood flood-color="${ctx.color(g.color).slice(0, 7)}"/><feComposite operator="in" in2="gl" result="gl"/>` : "";
    parts.push(`<feGaussianBlur in="${src}" stdDeviation="${n(g.r / 2)}" result="gl"/>${tint}`);
    const times = Math.max(1, Math.min(4, Math.round(g.strength ?? 1)));
    halo = `<feMerge>${'<feMergeNode in="gl"/>'.repeat(times)}<feMergeNode in="${src}"/></feMerge>`;
  }
  if (!parts.length) return "";
  const body = parts.join("") + halo;
  const id = ctx.def(body, (id) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${body}</filter>`);
  return ` filter="url(#${id})"`;
}

function styleAttrs(ctx: Ctx, s: Style, sil?: Sil): string {
  if (sil) {
    const filled = s.fill !== undefined && !(typeof s.fill === "string" && ctx.color(s.fill) === "none");
    const stroked = s.stroke !== undefined && !(typeof s.stroke === "string" && ctx.color(s.stroke) === "none");
    const sw = (stroked ? s.sw ?? 1 : 0) + 2 * sil.ow;
    return `${filled ? paint(ctx, "fill", sil.color) : ' fill="none"'}${paint(ctx, "stroke", sil.color)} stroke-width="${n(sw)}" stroke-linejoin="round" stroke-linecap="round"`;
  }
  let a = s.fill !== undefined ? paint(ctx, "fill", s.fill) : ' fill="none"';
  if (s.stroke !== undefined) {
    a += paint(ctx, "stroke", s.stroke) + ` stroke-width="${n(s.sw ?? 1)}"`;
    a += ` stroke-linecap="${s.cap ?? "round"}" stroke-linejoin="${s.join ?? "round"}"`;
    if (s.dash?.length) a += ` stroke-dasharray="${s.dash.map(n).join(" ")}"`;
  }
  if (s.opacity !== undefined && s.opacity < 1) a += ` opacity="${n(s.opacity)}"`;
  if (s.blend && s.blend !== "normal") a += ` style="mix-blend-mode:${s.blend}"`;
  return a + filters(ctx, s);
}

function shape(ctx: Ctx, s: ShapeNode, sil?: Sil): string {
  if (sil && s.style.fill === undefined && s.style.stroke === undefined) return "";
  const attrs = Object.entries(s.attrs).map(([k, v]) => ` ${k}="${typeof v === "number" ? n(v) : esc(v)}"`).join("");
  const st = styleAttrs(ctx, s.style, sil);
  if (s.tag === "text") return `<text${attrs}${st}>${esc(s.text ?? "")}</text>`;
  return `<${s.tag}${attrs}${st}/>`;
}

function node(ctx: Ctx, v: Node, sil?: Sil): string {
  if (v.k === "shape") return shape(ctx, v, sil);
  if (v.k === "clip") {
    // Clipped detail lies inside its mask, so it never grows the silhouette.
    if (sil) return "";
    const id = ctx.id();
    ctx.defs.push(`<clipPath id="${id}">${v.mask.map((m) => node(ctx, m)).join("")}</clipPath>`);
    return `<g clip-path="url(#${id})">${v.children.map((c) => node(ctx, c)).join("")}</g>`;
  }
  if (v.pal) ctx.pals.push(v.pal);
  if (v.swap) ctx.swaps.push(v.swap);
  try {
    let inner: string;
    if (v.silhouette) {
      const s: Sil = sil ? { color: sil.color, ow: sil.ow + v.silhouette.ow } : v.silhouette;
      const shadow = v.children.map((c) => node(ctx, c, s)).join("");
      inner = sil ? shadow : `<g>${shadow}</g>` + v.children.map((c) => node(ctx, c)).join("");
    } else inner = v.children.map((c) => node(ctx, c, sil)).join("");
    let a = v.tf ? ` transform="${v.tf}"` : "";
    if (v.style && !sil) {
      if (v.style.opacity !== undefined && v.style.opacity < 1) a += ` opacity="${n(v.style.opacity)}"`;
      if (v.style.blend && v.style.blend !== "normal") a += ` style="mix-blend-mode:${v.style.blend}"`;
      a += filters(ctx, v.style);
    }
    return a ? `<g${a}>${inner}</g>` : inner;
  } finally {
    if (v.swap) ctx.swaps.pop();
    if (v.pal) ctx.pals.pop();
  }
}

export interface Serialized {
  defs: string;
  /** One body per top-level node, in order. */
  bodies: string[];
}

export function serialize(nodes: Node[], pal: Palette, prefix = "v"): Serialized {
  const ctx = new Ctx(pal, prefix);
  try {
    const bodies = nodes.map((v) => node(ctx, v));
    return { defs: ctx.defs.join(""), bodies };
  } catch (e) {
    if (e instanceof VexError) throw e;
    throw new VexError(String(e));
  }
}

export function svgDoc(box: Box, defs: string, body: string, scale = 1): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(box.w * scale)}" height="${n(box.h * scale)}" viewBox="${n(box.x)} ${n(box.y)} ${n(box.w)} ${n(box.h)}">` +
    (defs ? `<defs>${defs}</defs>` : "") + body + "</svg>";
}

/** Inner markup (defs + body) of a finished document, for nesting it in another SVG. */
export function innerOf(svg: string): string {
  return svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
}
