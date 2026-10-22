// Bitmap fonts: glyphs rendered from a system font (optionally outlined and shadowed) into an
// atlas, written as BMFont text (.fnt) and XML (.xml, what Phaser and most engines load).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";
import { VexError } from "../core/errors.ts";
import { png as encodePng } from "../core/png.ts";
import type { FontDef, Project } from "../core/project.ts";
import { esc } from "../core/util.ts";
import { straight } from "./trace.ts";

interface Glyph {
  ch: string;
  /** Advance, cell size and pixels (straight RGBA, cell w × h). */
  adv: number;
  w: number;
  h: number;
  pixels: Uint8Array;
  /** Offsets of the cell from the pen position. */
  xoffset: number;
  yoffset: number;
}

/** Shelf-pack glyph cells (1 px apart) into a power-of-two atlas. */
function packGlyphs(glyphs: Glyph[]): { W: number; H: number; placed: (Glyph & { x: number; y: number })[] } {
  const W = 2 ** Math.ceil(Math.log2(Math.max(4, Math.sqrt(glyphs.reduce((a, g) => a + (g.w + 1) * (g.h + 1), 0)) * 1.15)));
  let x = 1, y = 1, rowH = 0;
  const placed = glyphs.map((g) => {
    if (x + g.w + 1 > W) { x = 1; y += rowH + 1; rowH = 0; }
    const at = { ...g, x, y };
    x += g.w + 1;
    rowH = Math.max(rowH, g.h);
    return at;
  });
  const H = 2 ** Math.ceil(Math.log2(Math.max(4, y + rowH + 1)));
  return { W, H, placed };
}

/** Write the atlas PNG and the BMFont text + XML files. */
function emit(fd: FontDef, outDir: string, face: string, size: number, lineH: number, base: number, W: number, H: number, placed: (Glyph & { x: number; y: number })[]): string {
  const atlas = new Uint8Array(W * H * 4);
  for (const g of placed) for (let r = 0; r < g.h; r++) atlas.set(g.pixels.subarray(r * g.w * 4, (r + 1) * g.w * 4), ((g.y + r) * W + g.x) * 4);
  const dir = join(outDir, "fonts");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${fd.name}.png`), encodePng(W, H, atlas, (b) => deflateSync(b)));
  const ch = (g: (typeof placed)[number]) => ({ id: g.ch.codePointAt(0)!, x: g.x, y: g.y, width: g.w, height: g.h, xoffset: g.xoffset, yoffset: g.yoffset, xadvance: g.adv, page: 0, chnl: 15 });
  const bold = fd.glyphs ? 0 : fd.weight >= 600 ? 1 : 0;
  const fnt = [
    `info face="${face}" size=${size} bold=${bold} italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1 outline=${fd.glyphs ? 0 : fd.outline}`,
    `common lineHeight=${lineH} base=${base} scaleW=${W} scaleH=${H} pages=1 packed=0`,
    `page id=0 file="${fd.name}.png"`,
    `chars count=${placed.length}`,
    ...placed.map((g) => Object.entries(ch(g)).map(([k, v]) => `${k}=${v}`).join(" ").replace(/^/, "char ")),
  ].join("\n") + "\n";
  writeFileSync(join(dir, `${fd.name}.fnt`), fnt);
  const xml = `<?xml version="1.0"?>
<font>
  <info face="${esc(face)}" size="${size}" bold="${bold}" italic="0" charset="" unicode="1" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="1,1" outline="${fd.glyphs ? 0 : fd.outline}"/>
  <common lineHeight="${lineH}" base="${base}" scaleW="${W}" scaleH="${H}" pages="1" packed="0"/>
  <pages><page id="0" file="${fd.name}.png"/></pages>
  <chars count="${placed.length}">
${placed.map((g) => `    <char ${Object.entries(ch(g)).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("\n")}
  </chars>
</font>
`;
  writeFileSync(join(dir, `${fd.name}.xml`), xml);
  return `font ${fd.name}: ${placed.length} glyphs, ${face} ${size}px, atlas ${W}x${H}`;
}

/** A font whose glyphs are the file's own sprites: each character's sprite rendered at `scale`, baseline at `baseline` units. */
function writeGlyphFont(p: Project, fd: FontDef, outDir: string): string {
  const scale = fd.scale, spacing = Math.round(fd.spacing);
  if (!(scale > 0)) throw new VexError("glyph font scale must be > 0");
  const cells: (Glyph & { base: number })[] = [];
  for (const ch of new Set([...fd.chars])) {
    const name = fd.glyphs!(ch);
    if (name === null || name === undefined || name === false) continue;
    if (typeof name !== "string") throw new VexError(`glyphs(${JSON.stringify(ch)}) must return a sprite name, or null to skip the character`);
    const b = p.build(name);
    const svg = p.svg(name, 0, scale);
    const img = new Resvg(svg, { font: { loadSystemFonts: svg.includes("<text") } }).render();
    // the baseline sits `baseline` units below the top of the glyph box (default: its bottom edge)
    const base = Math.round(((fd.baseline ?? b.box.y + b.box.h) - b.box.y) * scale);
    cells.push({ ch, adv: img.width + spacing, w: img.width, h: img.height, pixels: straight(img.pixels), xoffset: 0, yoffset: 0, base });
  }
  if (!cells.length) throw new VexError(`font '${fd.name}': glyphs() returned no sprites for any of its chars`);
  const lineBase = Math.max(...cells.map((c) => c.base)), below = Math.max(...cells.map((c) => c.h - c.base));
  for (const c of cells) c.yoffset = lineBase - c.base;
  const { W, H, placed } = packGlyphs(cells);
  return emit(fd, outDir, fd.name, lineBase, lineBase + below, lineBase, W, H, placed);
}

const textSvg = (fd: FontDef, s: string, w: number, h: number, x: number, y: number, layers: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${layers.replaceAll("@X", String(x)).replaceAll("@Y", String(y)).replaceAll("@S", esc(s))}</svg>`;

/** The font file for a family + weight via fontconfig, so resvg loads one file instead of scanning every system font. */
function fontFile(family: string, weight: number): string | undefined {
  const fcWeight = weight >= 800 ? "extrabold" : weight >= 700 ? "bold" : weight >= 600 ? "semibold" : weight <= 300 ? "light" : "regular";
  const r = spawnSync("fc-match", ["-f", "%{file}|%{family}", `${family}:${fcWeight}`], { encoding: "utf8" });
  if (r.error || r.status !== 0) return undefined;
  const [file, fam] = r.stdout.split("|");
  return file && fam.toLowerCase().includes(family.toLowerCase()) ? file : undefined;
}

export function writeFont(p: Project, fd: FontDef, outDir: string): string {
  if (fd.glyphs) return writeGlyphFont(p, fd, outDir);
  const file = fontFile(fd.family, fd.weight);
  const fontOpts = file ? { fontFiles: [file], loadSystemFonts: false, defaultFontFamily: fd.family } : { loadSystemFonts: true };
  const size = fd.size, pad = Math.ceil(fd.outline + Math.max(Math.abs(fd.shadow[0]), Math.abs(fd.shadow[1])) + 2);
  const base = `font-size="${size}" font-family="${esc(fd.family)}" font-weight="${fd.weight}" xml:space="preserve"`;
  const fill = p.pal.resolve(fd.fill), stroke = fd.outline > 0 ? p.pal.resolve(fd.outlineColor) : "", shadow = fd.shadow[0] || fd.shadow[1] ? p.pal.resolve(fd.shadowColor) : "";
  let layers = "";
  if (shadow) layers += `<text x="${"@X"}" y="${"@Y"}" dx="${fd.shadow[0]}" dy="${fd.shadow[1]}" ${base} fill="${shadow}"${stroke ? ` stroke="${shadow}" stroke-width="${fd.outline * 2}" stroke-linejoin="round"` : ""}>@S</text>`;
  if (stroke) layers += `<text x="@X" y="@Y" ${base} fill="${stroke}" stroke="${stroke}" stroke-width="${fd.outline * 2}" stroke-linejoin="round">@S</text>`;
  layers += `<text x="@X" y="@Y" ${base} fill="${fill}">@S</text>`;
  const plain = (s: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 6}" height="${size * 2}"><text x="${size}" y="${size * 1.4}" ${base} fill="#000">${esc(s)}</text></svg>`;
  const width = (s: string) => new Resvg(plain(s), { font: fontOpts }).getBBox()?.width ?? 0;

  const lineH = Math.ceil(size * 1.3), ascent = Math.round(size * 1.0), cellH = lineH + pad * 2;
  const bars = width("||");
  const glyphs: Glyph[] = [...new Set([...fd.chars])].map((ch) => {
    const adv = Math.max(1, Math.round(width(`|${ch}|`) - bars));
    const cw = adv + pad * 2;
    const img = new Resvg(textSvg(fd, ch, cw, cellH, pad, pad + ascent, layers), { font: fontOpts }).render();
    return { ch, adv, w: cw, h: cellH, pixels: img.pixels, xoffset: -pad, yoffset: -pad };
  });
  const { W, H, placed } = packGlyphs(glyphs);
  return emit(fd, outDir, fd.family, size, lineH, ascent, W, H, placed);
}
