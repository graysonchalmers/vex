// Named colors and light ramps. Assets keep the palette active where they were defined.
import { VexError, didYouMean } from "./errors.ts";

const BUILTIN: Record<string, string[]> = {
  sweetie16: ["1a1c2c", "5d275d", "b13e53", "ef7d57", "ffcd75", "a7f070", "38b764", "257179",
    "29366f", "3b5dc9", "41a6f6", "73eff7", "f4f4f4", "94b0c2", "566c86", "333c57"],
  pico8: ["000000", "1d2b53", "7e2553", "008751", "ab5236", "5f574f", "c2c3c7", "fff1e8",
    "ff004d", "ffa300", "ffec27", "00e436", "29adff", "83769c", "ff77a8", "ffccaa"],
};
const INDEX = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const KEY = /^[A-Za-z0-9_]+$/;

export class Palette {
  readonly colors: ReadonlyMap<string, string>;
  /** Ramps dark -> light, as key lists. */
  readonly ramps: readonly string[][];

  constructor(colors: Map<string, string>, ramps: string[][] = []) {
    this.colors = colors;
    this.ramps = ramps;
  }

  static builtin(name: string): Palette {
    const list = BUILTIN[name];
    if (!list) throw new VexError(`unknown palette '${name}'${didYouMean(name, Object.keys(BUILTIN))} (have: ${Object.keys(BUILTIN).join(", ")})`);
    return Palette.fromColors(list.map((c) => "#" + c));
  }

  static fromColors(list: (string | number)[]): Palette {
    if (list.length > INDEX.length) throw new VexError(`a palette list holds at most ${INDEX.length} colors`);
    const m = new Map<string, string>();
    list.forEach((c, i) => m.set(INDEX[i], normHex(String(c))));
    return new Palette(m);
  }

  /** Add or override keys: "#hex", a palette index, or another key. */
  extend(aliases: Record<string, string | number>): Palette {
    const m = new Map(this.colors);
    for (const [k, v] of Object.entries(aliases)) {
      if (!KEY.test(k)) throw new VexError(`palette key '${k}' must be letters, digits or _`);
      if (typeof v === "number") {
        const c = this.colors.get(INDEX[v]);
        if (!c) throw new VexError(`pal: '${k}': no color at index ${v}`);
        m.set(k, c);
      } else m.set(k, HEX.test(v) ? normHex(v) : this.lookup(v, m));
    }
    return new Palette(m, this.ramps.map((r) => r.slice()));
  }

  /** Ramps as "kGg" (one char per key) or "dark mid light" (space-separated keys) or arrays. */
  withRamps(ramps: (string | string[])[]): Palette {
    const parsed = ramps.map((r) => {
      const keys = Array.isArray(r) ? r : /\s/.test(r.trim()) ? r.trim().split(/\s+/) : [...r];
      for (const k of keys) this.lookup(k, this.colors);
      if (keys.length < 2) throw new VexError(`ramp '${keys.join(" ")}' needs at least 2 keys`);
      return keys;
    });
    return new Palette(new Map(this.colors), [...this.ramps, ...parsed]);
  }

  /** Color string -> "#rrggbb[aa]" or "none". */
  resolve(c: string): string {
    if (c === "none" || c === "transparent") return "none";
    if (HEX.test(c)) return normHex(c);
    return this.lookup(c, this.colors);
  }

  has(c: string): boolean {
    return c === "none" || c === "transparent" || HEX.test(c) || this.colors.has(c);
  }

  /** Step a key along its ramp: negative = darker, positive = lighter (clamped). */
  step(key: string, by: number): string {
    const ramp = this.ramps.find((r) => r.includes(key));
    if (!ramp) {
      if (!this.colors.has(key)) this.lookup(key, this.colors);
      throw new VexError(`'${key}' is in no ramp; declare one with ramps("…${key}…")`);
    }
    const i = Math.max(0, Math.min(ramp.length - 1, ramp.indexOf(key) + by));
    return ramp[i];
  }

  table(): Record<string, string> {
    return Object.fromEntries(this.colors);
  }

  private lookup(k: string, m: ReadonlyMap<string, string>): string {
    const c = m.get(k);
    if (c === undefined) {
      const keys = [...m.keys()];
      throw new VexError(`unknown color '${k}'${didYouMean(k, keys)} (keys: ${keys.slice(0, 24).join(" ")}${keys.length > 24 ? " …" : ""}; or use "#hex")`);
    }
    return c;
  }
}

function normHex(c: string): string {
  if (!HEX.test(c)) throw new VexError(`bad color '${c}': use "#rgb", "#rrggbb" or "#rrggbbaa"`);
  let h = c.slice(1).toLowerCase();
  if (h.length <= 4) h = [...h].map((ch) => ch + ch).join("");
  return "#" + (h.endsWith("ff") && h.length === 8 ? h.slice(0, 6) : h);
}
