/** Deterministic PRNG (mulberry32): rng(seed)() -> [0, 1). */
export function rng(seed = 1): () => number {
  let a = (seed >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** String hash for seeding (FNV-1a). */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function globRe(glob: string): RegExp {
  return new RegExp("^" + glob.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
}

/** Compact number for SVG output (max 3 decimals, no trailing zeros). */
export function n(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Short human-readable argument list for step labels. */
export function fmtArgs(args: unknown[]): string {
  return args.map((a) => {
    if (typeof a === "number") return n(a);
    if (typeof a === "string") return JSON.stringify(a.length > 24 ? a.slice(0, 22) + "…" : a);
    if (Array.isArray(a)) return a.length > 6 ? `[${a.slice(0, 6).map((v) => (typeof v === "number" ? n(v) : "…")).join(",")},…]` : `[${a.map((v) => (typeof v === "number" ? n(v) : "…")).join(",")}]`;
    if (typeof a === "function") return "ƒ";
    return "{…}";
  }).join(", ");
}

/** Value or [min, max] range, picked with r. */
export function pickRange(v: number | [number, number] | undefined, r: () => number, dflt: number): number {
  if (v === undefined) return dflt;
  if (typeof v === "number") return v;
  return v[0] + (v[1] - v[0]) * r();
}
