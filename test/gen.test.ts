import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Resvg } from "@resvg/resvg-js";
import { lsystem, noise2, turtle, tween } from "../src/core/gen.ts";
import { loadProject, loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { straight } from "../src/node/trace.ts";

const throwsMsg = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e: Error) => re.test(e.message));
const render = (svg: string) => { const r = new Resvg(svg, { font: { loadSystemFonts: svg.includes("<text") } }).render(); return { w: r.width, h: r.height, px: straight(r.pixels) }; };
const at = (img: { w: number; px: Uint8Array }, x: number, y: number) => [...img.px.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4)];

test("noise is smooth, seeded and bounded; tween interpolates point lists", () => {
  assert.equal(noise2(3, 7), 0, "zero on lattice points");
  let maxStep = 0;
  for (let i = 0; i < 400; i++) maxStep = Math.max(maxStep, Math.abs(noise2(i * 0.01, 0.5) - noise2((i + 1) * 0.01, 0.5)));
  assert.ok(maxStep < 0.05, `continuous: max step ${maxStep}`);
  let lo = 0, hi = 0;
  for (let i = 0; i < 2000; i++) { const v = noise2(i * 0.37, i * 0.11, 3); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  assert.ok(lo >= -1.01 && hi <= 1.01 && hi > 0.3 && lo < -0.3, `range ${lo}..${hi}`);
  assert.notEqual(noise2(0.3, 0.4, 1), noise2(0.3, 0.4, 2), "another seed, another field");
  assert.deepEqual(tween([0, 0, 10, 10], [10, 0, 10, 20], 0.5), [5, 0, 10, 15]);
  throwsMsg(() => tween([0, 0], [1, 2, 3], 0.5), /same length/);
});

test("lsystem rewrites, stochastic rules are seeded, the turtle draws strokes with depth", () => {
  assert.equal(lsystem({ axiom: "F", rules: { F: "F+F" }, depth: 2 }), "F+F+F+F");
  assert.equal(lsystem({ axiom: "A", rules: { A: "AB", B: "A" }, depth: 4 }), "ABAABABA");
  const a = lsystem({ axiom: "F", rules: { F: ["F+F", "F-F"] }, depth: 5, seed: 2 }), b = lsystem({ axiom: "F", rules: { F: ["F+F", "F-F"] }, depth: 5, seed: 2 });
  assert.equal(a, b);
  assert.notEqual(a, lsystem({ axiom: "F", rules: { F: ["F+F", "F-F"] }, depth: 5, seed: 3 }));
  throwsMsg(() => lsystem({ axiom: "F", rules: { FF: "F" } }), /one character/);
  throwsMsg(() => lsystem({ axiom: "F", rulez: {} }), /did you mean 'rules'/);
  const strokes = turtle("F[+F]F", { x: 0, y: 100, step: 10, angle: 90 });
  assert.equal(strokes.length, 3);
  assert.deepEqual(strokes[0], { pts: [0, 100, 0, 90], depth: 0 });
  assert.deepEqual(strokes[1].pts.map(Math.round), [0, 90, 10, 90]);
  assert.equal(strokes[1].depth, 1);
  assert.deepEqual(strokes[2].pts.map(Math.round), [0, 90, 0, 80], "] restores the trunk position");
  const shrunk = turtle("F[F]", { step: 10, shrink: 0.5, heading: 0 });
  assert.deepEqual(shrunk[1].pts.map(Math.round), [10, 0, 15, 0]);
  throwsMsg(() => turtle("F]"), /without a matching/);
  const art = loadSource(`const t = turtle(lsystem({ axiom: "F", rules: { F: "F[+F][-F]" }, depth: 3 }), { x: 32, y: 60, step: 8, angle: 25 })
sprite("tree", { w: 64, h: 64 }, t.map((s) => line(s.pts, { stroke: "1", sw: 3 - s.depth * 0.6 })))`);
  assert.ok((art.svg("tree").match(/<path /g) ?? []).length > 10);
});

test("radial repeats items around a center; patterns tile an asset as a paint", () => {
  const svg = loadSource(`sprite("m", { w: 40, h: 40 }, radial(4, 20, 20, rect(18, 2, 4, 10, "1")))`).svg("m");
  assert.equal((svg.match(/<rect /g) ?? []).length, 4);
  assert.match(svg, /rotate\(90 20 20\)/);
  assert.match(svg, /rotate\(270 20 20\)/);
  throwsMsg(() => loadSource(`sprite("m", { w: 4, h: 4 }, radial(1, 2, 2, circle(2, 2, 1, "1")))`), /whole number >= 2/);
  const p = loadSource(`pal({ r: "#ff0000", b: "#0000ff" })
sprite("_dot", { w: 4, h: 4 }, rect(0, 0, 2, 2, "r"))
sprite("tiled", { w: 8, h: 8 }, rect(0, 0, 8, 8, { fill: pat("_dot") }))
sprite("rot", { w: 8, h: 8 }, rect(0, 0, 8, 8, { fill: pat("_dot", { w: 2, h: 2, rot: 45, opacity: 0.5 }) }))
scene("bgp", { w: 8, h: 8, bg: pat("_dot") }, circle(4, 4, 1, "b"))`);
  const t = p.svg("tiled");
  assert.match(t, /<pattern id="tiled_\d+" patternUnits="userSpaceOnUse" x="0" y="0" width="4" height="4"><rect x="0" y="0" width="2" height="2" fill="#ff0000"\/><\/pattern>/);
  assert.match(t, /fill="url\(#tiled_\d+\)"/);
  const img = render(t);
  assert.deepEqual(at(img, 1, 1), [255, 0, 0, 255], "inside the first dot");
  assert.deepEqual(at(img, 5, 5), [255, 0, 0, 255], "the dot repeats 4 units over");
  assert.equal(at(img, 3, 3)[3], 0, "between dots: empty");
  assert.match(p.svg("rot"), /patternTransform="rotate\(45\)"><g opacity="0.5">/);
  assert.match(p.svg("bgp"), /<pattern /);
  throwsMsg(() => loadSource(`sprite("x", { w: 4, h: 4 }, rect(0, 0, 4, 4, { fill: pat("nope") }))`).svg("x"), /unknown asset 'nope'/);
  throwsMsg(() => loadSource(`sprite("x", { w: 4, h: 4 }, rect(0, 0, 4, 4, { fill: pat("a", { rotate: 3 }) }))`), /unknown option 'rotate'/);
});

test("image embeds a raster at its size or a scaled one; outline wraps its alpha, not its box", () => {
  const dir = mkdtempSync(join(tmpdir(), "vex-img-"));
  // a 10x10 PNG: a 6x6 green square in a transparent frame
  const png = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect x="2" y="2" width="6" height="6" fill="#00ff00"/></svg>`).render().asPng();
  writeFileSync(join(dir, "sq.png"), png);
  writeFileSync(join(dir, "a.vx.js"), `pal({ k: "#000000" })
sprite("plain", { w: 10, h: 10 }, image("sq.png", 0, 0))
sprite("half", { w: 10, h: 10 }, image("sq.png", 0, 0, { w: 5, opacity: 0.5 }))
sprite("out", { w: 10, h: 10, outline: "k", ow: 1 }, image("sq.png", 0, 0, { pixel: true }))`);
  const p = loadProject(join(dir, "a.vx.js"));
  const b = p.build("plain");
  assert.equal(b.nodes[0].k, "shape");
  assert.match(p.svg("plain"), /<image x="0" y="0" width="10" height="10" href="data:image\/png;base64,/);
  assert.deepEqual(at(render(p.svg("plain")), 4, 4), [0, 255, 0, 255]);
  assert.match(p.svg("half"), /width="5" height="5" href=.* opacity="0.5"/);
  const o = render(p.svg("out"));
  assert.equal(o.w, 12, "outline grows the box by ow on each side");
  assert.deepEqual(at(o, 5, 5), [0, 255, 0, 255], "the square itself");
  assert.deepEqual(at(o, 2, 5), [0, 0, 0, 255], "one unit outside the square: outline");
  assert.equal(at(o, 0, 5)[3], 0, "the transparent frame of the PNG gets no outline (alpha, not box)");
  assert.match(p.svg("out"), /image-rendering="optimizeSpeed"/);
  throwsMsg(() => loadSource(`sprite("x", { w: 4, h: 4 }, image("missing.png", 0, 0))`), /cannot read image/);
  throwsMsg(() => loadSource(`sprite("x", { w: 4, h: 4 }, image("${join(dir, "sq.png").replace(/\\/g, "/")}", 0, 0, { widht: 3 }))`), /unknown option 'widht'/);
});

test("text along a path becomes a textPath over a curve shifted by x, y", () => {
  const svg = loadSource(`sprite("arc", { w: 100, h: 60 }, text(10, 5, "CURVED", { along: [0, 40, 40, 10, 80, 40], size: 12, fill: "1", offset: 0.1 }))`).svg("arc");
  assert.match(svg, /<path id="arc_\d+" d="M10 45C[^"]+" fill="none"\/>/);
  assert.match(svg, /<text font-size="12" font-family="sans-serif" fill="#5d275d"><textPath href="#arc_\d+" startOffset="10%">CURVED<\/textPath><\/text>/);
  assert.doesNotMatch(svg, /<text x=/);
  const img = render(svg);
  assert.ok([...img.px].some((v, i) => i % 4 === 3 && v > 0), "something got drawn");
  throwsMsg(() => loadSource(`sprite("a", { w: 10, h: 10 }, text(0, 0, "x", { fill: "1", along: [0, 0, 5, 5], offset: 2 }))`), /offset must be 0\.\.1/);
});

test("glyph fonts: the file's own sprites become a BMFont with a shared baseline", () => {
  const dir = mkdtempSync(join(tmpdir(), "vex-gf-"));
  const p = loadSource(`pal({ k: "#000000" })
sprite("g_A", { w: 6, h: 8 }, rect(0, 0, 6, 8, "k"))
sprite("g_B", { w: 4, h: 10 }, rect(0, 0, 4, 10, "k"))
font("hand", { glyphs: (ch) => (ch === "A" ? "g_A" : ch === "B" ? "g_B" : null), chars: "AB?", scale: 2, spacing: 2, baseline: 8 })`);
  const r = writeOutputs(p, dir, { preview: false });
  assert.equal(r.errors.length, 0, r.errors.map((e) => e.message).join("; "));
  const fnt = readFileSync(join(dir, "fonts/hand.fnt"), "utf8");
  assert.match(fnt, /chars count=2/);
  // B is 10 units tall with the baseline at 8: line base 16 px, 4 px below it
  assert.match(fnt, /common lineHeight=20 base=16/);
  assert.match(fnt, /char id=65 .* width=12 height=16 xoffset=0 yoffset=0 xadvance=14/);
  assert.match(fnt, /char id=66 .* width=8 height=20 xoffset=0 yoffset=0 xadvance=10/);
  assert.match(readFileSync(join(dir, "fonts/hand.xml"), "utf8"), /<char id="65"/);
  const png = readFileSync(join(dir, "fonts/hand.png"));
  assert.equal(png.readUInt32BE(16), 32);
  const bad = loadSource(`font("f", { glyphs: (ch) => "nope", chars: "A" })`);
  assert.match(writeOutputs(bad, dir, { preview: false }).errors[0].message, /unknown asset 'nope'/);
  throwsMsg(() => loadSource(`font("f", { glyphs: "g_" })`), /glyphs must be a function/);
});
