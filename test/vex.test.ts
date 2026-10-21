import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Resvg } from "@resvg/resvg-js";
import { loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";

const svgOf = (src: string, name: string, frame = 0) => loadSource(src).svg(name, frame);
const throwsMsg = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e: Error) => re.test(e.message));

test("palette keys resolve to hex; outline grows the drawn box", () => {
  const src = `pal({ k: "#102030", g: "#7bd36a" })
sprite("a", { w: 10, h: 8, outline: "k", ow: 2 }, circle(5, 4, 3, "g"))`;
  const svg = svgOf(src, "a");
  assert.match(svg, /viewBox="-2 -2 14 12"/);
  assert.match(svg, /<circle cx="5" cy="4" r="3" fill="#7bd36a"\/>/);
  // silhouette copy: outline color, stroke grown by 2 * ow
  assert.match(svg, /<circle cx="5" cy="4" r="3" fill="#102030" stroke="#102030" stroke-width="4"/);
});

test("variants and placement swaps compose, innermost first", () => {
  const src = `pal({ g: "#00ff00", r: "#ff0000", b: "#0000ff" })
sprite("_dot", { w: 4, h: 4 }, circle(2, 2, 2, "g"))
sprite("red", { w: 4, h: 4 }, stamp("_dot", 0, 0, { swap: { g: "r" } }))
sprite("blue", { base: "red", swap: { r: "b" } })`;
  assert.match(svgOf(src, "red"), /fill="#ff0000"/);
  const blue = svgOf(src, "blue");
  assert.match(blue, /fill="#0000ff"/);
  assert.doesNotMatch(blue, /#ff0000|#00ff00/);
});

test("8-digit hex splits into color + opacity; gradients and glow become defs", () => {
  const src = `sprite("a", { w: 10, h: 10 },
  rect(0, 0, 10, 10, "#11223380"),
  circle(5, 5, 3, { fill: rad(["#fff", "#000"]), glow: { r: 4, color: "#ff0" } }))`;
  const svg = svgOf(src, "a");
  assert.match(svg, /fill="#112233" fill-opacity="0.502"/);
  assert.match(svg, /<radialGradient id="a_\d+"/);
  assert.match(svg, /<filter id="a_\d+"[^>]*><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="gl"\/><feFlood flood-color="#ffff00"\/>/);
});

test("variants inherit the base's export scale", () => {
  const p = loadSource(`sprite("a", { w: 4, h: 4, scale: 2 }, circle(2, 2, 2, "1"))\nsprite("b", { base: "a", swap: { "1": "2" } })`);
  assert.equal(p.build("b").scale, 2);
  assert.match(p.svg("b"), /width="8" height="8"/);
});

test("grain fills a shape with noise; blend sets the blend mode", () => {
  const svg = svgOf(`sprite("a", { w: 10, h: 10 }, rect(0, 0, 10, 10, { fill: "#000", grain: { freq: 2, seed: 3 }, blend: "overlay", opacity: 0.3 }))`, "a");
  assert.match(svg, /<feTurbulence type="fractalNoise" baseFrequency="2" numOctaves="2" seed="3"/);
  assert.match(svg, /style="mix-blend-mode:overlay"/);
  throwsMsg(() => loadSource(`sprite("a", { w: 4, h: 4 }, rect(0, 0, 4, 4, { fill: "1", blend: "screne" }))`), /did you mean 'screen'/);
});

test("sym and mx mirror about the axis", () => {
  const src = `sprite("a", { w: 20, h: 10 }, sym(10, circle(4, 5, 2, "1")))
sprite("b", { w: 20, h: 10, mx: true }, circle(4, 5, 2, "1"))`;
  assert.match(svgOf(src, "a"), /transform="matrix\(-1 0 0 1 20 0\)"/);
  assert.match(svgOf(src, "b"), /transform="matrix\(-1 0 0 1 20 0\)"/);
});

test("stamp anchors and scales about the anchor point", () => {
  const src = `sprite("t", { w: 10, h: 20 }, rect(0, 0, 10, 20, "1"))
sprite("s", { w: 50, h: 50 }, stamp("t", 25, 40, { anchor: "bottom", scale: 2 }))`;
  assert.match(svgOf(src, "s"), /transform="translate\(25 40\) scale\(2 2\) translate\(-5 -20\)"/);
});

test("anims: function items get the frame; placed anims follow it", () => {
  const src = `anim("blink", { w: 4, h: 4, frames: 2 }, (f) => circle(2, 2, f.i ? 1 : 2, "1"))
anim("host", { w: 8, h: 8, frames: 4 }, stamp("blink", 0, 0))`;
  const p = loadSource(src);
  assert.equal(p.build("blink").frames, 2);
  assert.match(p.svg("blink", 0), /r="2"/);
  assert.match(p.svg("blink", 1), /r="1"/);
  // host frame 2 of 4 -> blink frame 1 of 2
  assert.match(p.svg("host", 2), /r="1"/);
  assert.match(p.svg("host", 0), /r="2"/);
});

test("scatter is deterministic", () => {
  const src = `sprite("_p", { w: 2, h: 2 }, rect(0, 0, 2, 2, "1"))
sprite("s", { w: 50, h: 50 }, scatter("_p", 0, 0, 50, 50, 6, { rot: [0, 90], scale: [0.5, 1] }))`;
  const a = svgOf(src, "s"), b = svgOf(src, "s");
  assert.equal(a, b);
  assert.equal(a.match(/<rect /g)?.length, 6);
});

test("errors name the art-file location and suggest fixes", () => {
  throwsMsg(() => loadSource(`pal({ grass: "#0f0" })\nsprite("a", { w: 4, h: 4 },\n  circle(2, 2, 2, "gras"))`),
    /^art\.vx\.js:3:3: circle: unknown color 'gras' \(did you mean 'grass'\?\)/);
  throwsMsg(() => loadSource(`sprite("a", { w: 4, h: 4, outlin: "1" })`), /art\.vx\.js:1:1: sprite: sprite 'a': unknown option 'outlin' \(did you mean 'outline'\?\)/);
  throwsMsg(() => loadSource(`sprite("a", { w: 4, h: 4 }, circle(2, 2, "1"))`), /circle: argument 3 \(r\) must be a number/);
  const p = loadSource(`sprite("a", { w: 4, h: 4 }, stamp("slmie", 0, 0))\nsprite("slime", { w: 4, h: 4 }, circle(2, 2, 2, "1"))`);
  throwsMsg(() => p.build("a"), /sprite 'a' > stamp\("slmie", 0, 0\): unknown asset 'slmie' \(did you mean 'slime'\?\)/);
  const cyc = loadSource(`sprite("a", { w: 4, h: 4 }, stamp("b", 0, 0))\nsprite("b", { w: 4, h: 4 }, stamp("a", 0, 0))`);
  throwsMsg(() => cyc.build("a"), /reference cycle through 'a'/);
});

test("writeOutputs: SVG, PNGs at each scale, anim strip + JSON, atlas + JSON, previews", () => {
  const dir = mkdtempSync(join(tmpdir(), "vex-"));
  try {
    const src = `sprite("dot", { w: 10, h: 6, outline: "0", ow: 1 }, circle(5, 3, 3, "6"))
anim("pulse", { w: 8, h: 8, frames: 3, fps: 10 }, (f) => circle(4, 4, 2 + f.i, "4"))
sprite("bad", { w: 4, h: 4 }, stamp("missing", 0, 0))
sheet("atlas", ["dot", "pulse"], { pad: 1 })`;
    const r = writeOutputs(loadSource(src), dir, { scales: [1, 2] });
    assert.equal(r.errors.length, 1, "only the broken asset fails");
    assert.match(r.errors[0].message, /unknown asset 'missing'/);
    const size = (f: string) => { const b = readFileSync(join(dir, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
    assert.deepEqual(size("sprites/dot.png"), [12, 8]);
    assert.deepEqual(size("sprites/dot@2x.png"), [24, 16]);
    assert.match(readFileSync(join(dir, "sprites/dot.svg"), "utf8"), /^<svg /);
    assert.deepEqual(size("anims/pulse.png"), [24, 8]);
    const anim = JSON.parse(readFileSync(join(dir, "anims/pulse.json"), "utf8"));
    assert.deepEqual(Object.keys(anim.frames), ["pulse_0", "pulse_1", "pulse_2"]);
    assert.equal(anim.frames.pulse_1.duration, 100);
    const atlas = JSON.parse(readFileSync(join(dir, "atlas.json"), "utf8"));
    assert.deepEqual(Object.keys(atlas.frames), ["dot", "pulse_0", "pulse_1", "pulse_2"]);
    assert.deepEqual(atlas.meta.frameTags, [{ name: "pulse", from: 1, to: 3, direction: "forward" }]);
    assert.deepEqual(size("atlas.png"), [atlas.meta.size.w, atlas.meta.size.h]);
    // The PNG is a rendering of the SVG: center pixel of the dot is its fill color.
    const img = new Resvg(readFileSync(join(dir, "sprites/dot.svg"), "utf8")).render();
    const i = (4 * img.width + 6) * 4;
    assert.deepEqual([...img.pixels.subarray(i, i + 4)], [0x38, 0xb7, 0x64, 255]);
    for (const f of ["_preview/dot.png", "_preview/pulse.png", "_preview/atlas.png"]) assert.ok(size(f)[0] > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rig: keyframes interpolate with easing and hold outside their range", async () => {
  const { sample } = await import("../src/core/rig.ts");
  const fi = (i: number) => ({ i, n: 10, t: i / 10, sin: () => 0, cos: () => 0, rng: () => () => 0 });
  const tr: [number, number, string?][] = [[2, 0, "linear"], [6, 40], [8, 0, "step"], [9, 100]];
  assert.equal(sample(tr as never, fi(0)), 0);           // before the first key: hold
  assert.equal(sample(tr as never, fi(4)), 20);          // linear halfway
  assert.equal(sample(tr as never, fi(7)), 20);          // default inOut halfway is the midpoint
  assert.equal(sample(tr as never, fi(8.5)), 0);         // step holds until the next key
  assert.equal(sample(tr as never, fi(10)), 100);        // after the last key: hold
  assert.deepEqual(sample([[0, [0, 0]], [10, [10, -20]]] as never, fi(5)), [5, -10]);
});

test("rig: children follow their parent's pivot; z order is independent of the hierarchy", () => {
  const src = `const R = rig({
  arm: { pivot: [10, 10], z: 2, items: [rect(10, 10, 2, 10, "1")] },
  hand: { parent: "arm", pivot: [10, 20], z: 0, items: [circle(10, 22, 2, "2")] },
})
anim("a", { w: 40, h: 40, frames: 4 }, pose(R, { arm: { rot: [[0, 0], [4, 90]] }, hand: { rot: [[0, 30]] } }))`;
  const p = loadSource(src);
  const svg = p.svg("a", 2);
  // hand is drawn first (z 0) inside arm's transform (rotate 45 at frame 2 about 10,10), then its own
  assert.match(svg, /translate\(10 10\) rotate\(45\) translate\(-10 -10\)"><g transform="translate\(10 20\) rotate\(30\) translate\(-10 -20\)"><circle/);
  assert.ok(svg.indexOf("<circle") < svg.indexOf("<rect"), "hand (z 0) under arm (z 2)");
  // frame 0: no rotation on the arm, so no wrapper for it
  assert.doesNotMatch(p.svg("a", 0), /rotate\(0\)/);
});

test("rig: errors name the problem and suggest fixes", () => {
  throwsMsg(() => loadSource(`rig({ a: { pivot: [0, 0], parent: "b" }, b: { pivot: [0, 0], parent: "a" } })`), /bone cycle/);
  throwsMsg(() => loadSource(`rig({ arm: { pivot: [0, 0], parent: "torsso" }, torso: { pivot: [0, 0] } })`), /unknown parent 'torsso' \(did you mean 'torso'\?\)/);
  throwsMsg(() => loadSource(`pose(rig({ arm: { pivot: [0, 0] } }), { amr: { rot: [[0, 1]] } })`), /unknown bone 'amr' \(did you mean 'arm'\?\)/);
  throwsMsg(() => loadSource(`pose(rig({ arm: { pivot: [0, 0] } }), { arm: { rot: [[0, 1, "inOutt"], [2, 3]] } })`), /ease 'inOutt' \(did you mean 'inOut'\?\)/);
  throwsMsg(() => loadSource(`pose(rig({ arm: { pivot: [0, 0] } }), { arm: { rot: [[4, 1], [2, 3]] } })`), /key frames must increase/);
  throwsMsg(() => loadSource(`pose(rig({ arm: { pivot: [0, 0] } }), { arm: { spin: [[0, 1]] } })`), /unknown channel 'spin'/);
});

test("exported SVGs draw text as outlines; crops never touch the SVG", async () => {
  const { outlineText, pngCrop } = await import("../src/node/raster.ts");
  const p = loadSource(`sprite("t", { w: 60, h: 20 }, text(4, 15, "HI", { fill: "1", size: 12 }))
sprite("b", { w: 200, h: 100 }, circle(180, 80, 6, { fill: "1", blur: 3 }), rect(0, 0, 20, 20, "2"))`);
  const out = outlineText(p.svg("t"));
  assert.doesNotMatch(out, /<text/);
  assert.match(out, /<path/);
  // The blurred circle lies entirely outside the crop: the case that used to abort resvg.
  const png = pngCrop(p.svg("b", 0, 2), 2, { x: 0, y: 0, w: 20, h: 20 });
  assert.equal(png.readUInt32BE(16), 40);
  assert.equal(png.readUInt32BE(20), 40);
});
