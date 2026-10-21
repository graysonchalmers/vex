---
name: vex-vector-art
description: Create 2D vector game assets (characters, enemies, items, icons, props, UI, backgrounds, scenes, animations, sprite atlases) with vex, a compact JavaScript DSL that exports SVG + PNG + atlas JSON and has a live drawing viewer. Use when asked to draw, design or iterate on vector / flat / cartoon-style game art.
---

# vex: vector game art as code

You write a small `.vx.js` file; vex exports SVG and PNG per asset, anim strips and atlases with
TexturePacker/Aseprite-style JSON, and previews you can look at. Shapes are smooth vectors in
abstract units (1 unit = 1 px at scale 1). Needs Node ≥ 22.18 and `npm install` once in this
skill's directory.

`VEX` below means `node <this skill's directory>/bin/vex.js`.

## Workflow

1. Write `art.vx.js` (start from the template below; more in `examples/`).
2. Build what you're working on: `VEX build art.vx.js --only slime,coin`
3. **Look at it**: read `out/_preview/<name>.png` (checkerboard = transparent, faint grid, rulers
   with unit coordinates on the top and left edges, so you can read positions off the image).
   Anims show every frame side by side. For exact geometry, `VEX svg art.vx.js <name>` prints the SVG.
4. Fix with small edits (move a point, change a radius) and rebuild. Repeat.
5. If the user wants to watch: start `VEX serve art.vx.js` in the background and give them the URL.
   It rebuilds on save and replays the edited asset step by step; it also writes `out/`.
6. Ship: `VEX build art.vx.js --scales 1,2` writes `name.png` and `name@2x.png` plus `.svg`.

Errors name file:line:col and the asset/op path, and suggest fixes ("did you mean 'g'?").
One broken asset doesn't stop the others from building.

## Template

```js
pal({ k: "#1b1630", g: "#7bd36a", G: "#3f8f4f", w: "#fff6e0", r: "#e2585e", R: "#a63a4c", y: "#ffd35c", o: "#f0913a" })

// blob = smooth closed curve through points. sym(axisX, ...) mirrors details. outline wraps it all.
sprite("slime", { w: 32, h: 26, outline: "k" },
  blob([16, 2, 24, 5, 29, 13, 30, 22, 16, 24, 2, 22, 3, 13, 8, 5], { fill: rad(["g", "G"], { cx: 0.4, cy: 0.3 }) }),
  sym(16, circle(11, 12, 3, "w"), circle(11.6, 12.4, 1.6, "k")),
  circle(9, 7, 1.6, { fill: "w", opacity: 0.7 }))
sprite("slime_red", { base: "slime", swap: { g: "r", G: "R" } })          // variant: 1 line

sprite("coin", { w: 20, h: 20, outline: "k", ow: 1.5 },
  circle(10, 10, 9, "o"), circle(10, 10, 7, "y"), rect(8.5, 5, 3, 10, { fill: "o", r: 1.5 }))

anim("slime_hop", { w: 36, h: 42, frames: 8, fps: 10 },
  (f) => ellipse(18, 39, 11, 2, { fill: "#1b163055" }),
  (f) => stamp("slime", 18, 38 - Math.max(0, f.sin(8)), { anchor: "bottom", scale: [1 + f.cos(0.08), 1 - f.cos(0.08)] }))

scene("meadow", { w: 160, h: 90, bg: lin(["#5ab6ff", "w"], 90) },
  circle(130, 20, 10, { fill: "y", glow: { r: 8, color: "y" } }),
  blob([0, 62, 40, 54, 90, 60, 130, 52, 160, 58, 160, 90, 0, 90], { fill: "g", smooth: 0.6 }),
  scatter("slime*", 10, 66, 140, 10, 5, { anchor: "bottom", scale: [0.6, 0.9], flip: "x" }))

sheet("items", ["slime*", "coin", "slime_hop"], { pad: 2, scale: 2 })
```

## Essentials

- **Colors**: palette keys from `pal` (any `[A-Za-z0-9_]` name), `"#rgb"`, `"#rrggbbaa"`, `"none"`.
  Default palette is sweetie16 (`0-f`); `use("pico8")` or `use([...hex])` for others.
- **Style**: last argument of a shape. A color string = fill (stroke for `line`/`curve`/`arc`), or
  `{ fill, stroke, sw, opacity, cap, join, dash, glow, blur }`. Fills can be gradients:
  `lin(colors, angleDeg)` and `rad(colors, { cx, cy, r })`, relative to the shape's box.
- **Shapes**: `rect circle ellipse poly blob line curve path star ngon arc text`. `blob`/`curve`
  pass smoothly through their points (`smooth: 0..1`); `path` takes raw SVG path data.
- **Structure**: `tf({ x, y, rot, scale, flip, origin, opacity, glow, blur }, ...items)` groups;
  `sym(x, ...items)` mirrors; `clip(maskShape, ...items)` keeps items inside a shape (shading,
  highlights, patterns on a body).
- **Reuse**: `stamp(name, x, y, { anchor, scale, rot, flip, swap, opacity })`, `tile`, `scatter`.
  Names can be groups or globs (`group("rocks", ["rock_a", "rock_a", "rock_b"])`, `"tree_*"`);
  each placement picks reproducibly. `_name` = part: usable, never exported.
- **Asset options**: `w, h` (required unless `base`), `outline` + `ow`, `mx`/`my` (mirror whole
  asset), `swap`, `flip`, `rot`, `bg`, `scale` (export px per unit). Order: items → mirror → swap →
  flip/rot → outline.
- **Skeletal animation**: `rig({ bone: { parent, pivot: [x, y], z, items } })` + `pose(rig, clip)` where a clip is
  `{ bone: { rot | move | scale: [[frame, value, ease?], ...] } }`. Check the anim preview strip frame by frame:
  rotations add up along the chain (a held sword's angle is arm + forearm + sword), and a jump needs headroom.
- **Particles**: `particles({ at | area, rate | burst, life, speed, angle, gravity, drag, size, color, opacity, shape, glow })`
  inside an anim. Draw smoke before fire, check the strip on a dark stage too (light colors vanish on the checkerboard).
- **Levels**: `tileset(name, { size, tiles })` + `level(name, { tileset, legend, map })`. Legend chars are tile keys,
  autotile rules (`platformer({...})` or `(n) => key`) or `{ object, type, props }`; maps can be generated `(rng) => rows`.
  Exports Tiled .tmj/.tmx; check `out/levels/<name>.html` and that objects stand on ground, not one row above it.
- **Spine**: `spine(name, rig, { w, h, scale, outline, clips: { walk: { clip, frames, fps } } })` writes a Spine 4.1
  skeleton + atlas for game runtimes; check it in `out/spine/<name>.html` (served over HTTP).
- **Animation**: `anim(name, { frames, fps }, ...)`; function items `(f) => items` get `f.i`, `f.n`,
  `f.t` (0..1, loops), `f.sin(amp, phase, cycles)`, `f.cos(...)`, `f.rng(seed)`. Stamping an anim
  inside an anim follows its frames (`delay` to desync, `frame` to freeze).
- Function items work in still assets too (f.i = 0): loops, `Array.from`, conditionals.

Full API with every option: [reference.md](reference.md).

## Habits that give better vector game art

- One silhouette, clear read at small size: big shapes first, then 2–3 detail layers. Check the
  preview at 1x too (`out/<kind>s/<name>.png`), not just the big preview.
- Use `outline` instead of stroking each shape: it draws one clean silhouette outline, and
  `clip`ped detail never bulges it.
- Cel shading: base shape, then a darker shape and a lighter highlight `clip`ped to the base, all
  from the same material ramp (`ramps("kGgw")`, `dark("g")`, `lite("g")`). 2–3 tones per material.
- Light from one direction (usually top-left) across every asset in a set; highlights and shadows
  must agree.
- Variants are `base` + `swap`; repeated details are `_parts` + `stamp`; families are a loop:
  `for (const [i, c] of ["r", "b", "y"].entries()) sprite("gem_" + i, ...)`.
- Organic shapes: `blob` with 6–10 points beats hand-written Béziers. Hard-edged things (crates,
  swords, UI): `poly`, `rect` with `r`.
- Keep a consistent unit size per set (e.g. characters 32 high) so assets scale together.
- Build with `--only` while iterating; a full build also writes every preview.
