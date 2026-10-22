# vex reference

Art files are plain JavaScript (or TypeScript) evaluated with the DSL as globals. Nothing is
drawn at definition time: `sprite`, `scene`, ... record definitions; everything resolves at build
time, so assets may reference each other in any order.

Coordinates are in units from the top-left; 1 unit = 1 output pixel at scale 1. Angles are
degrees, clockwise.

## Palette

| Call | Effect |
|---|---|
| `use("sweetie16")` | Built-in palette: `sweetie16` (default), `pico8`. Keys are index chars `0-9a-f`. |
| `use(["#000", "#fff", ...])` | Custom list, keys `0-9a-zA-Z` by index. |
| `pal({ k: "#1b1630", g: 6, h: "k" })` | Add/override keys (letters, digits, `_`; any length): hex, palette index, or a copy of another key. |
| `ramps("kGgw", "skin skinL skinW")` | Ramps dark → light: one char per key, or space-separated keys. |
| `dark(key, steps = 1)`, `lite(key, steps = 1)` | The key `steps` along its ramp (clamped). |
| `lin(colors, angle = 90)` | Linear gradient; 0 = left → right, 90 = top → bottom. `colors`: `["w", "g"]` or `[["w", 0], ["g", 0.7]]`. |
| `rad(colors, { cx, cy, r })` | Radial gradient; center/radius as fractions of the shape's box (default 0.5). |

Colors anywhere: a palette key, `"#rgb"`, `"#rgba"`, `"#rrggbb"`, `"#rrggbbaa"`, `"none"`.
Every asset keeps the palette active where it was defined, so included files with different
palettes can be stamped together. Swaps (`swap`) work on keys, so keep recolorable parts on keys.

## Assets

```js
sprite(name, opts, ...items)
scene(name, opts, ...items)            // like sprite; exported to out/scenes
anim(name, opts, ...items)             // opts.frames (default 8), opts.fps (default 12)
group(name, ["a", "b", "rock_*"])      // random pick per placement; repeat a name to weight it
sheet(name, ["slime*", "coin", groupName], { cols?, pad = 2, scale = 1 })
include("other.vx.js")                 // path relative to the current file
```

Names starting with `_` are **parts**: usable everywhere, never exported, not matched by sheet
globs.

| Option | Meaning |
|---|---|
| `w, h` | Size in units. Required unless `base` is set. |
| `base: "name"` | Start from the finished other asset (outline included) and its size. |
| `bg` | Background color or gradient filling the box. |
| `mx: true` / `my: true` | Mirror everything onto the other half (x = w/2 / y = h/2). For details only, use `sym`. |
| `swap: { g: "r" }` | Replace color keys (inside stamps too). |
| `flip: "x" \| "y" \| "xy"`, `rot: deg` | Transform about the center. The box does not grow; leave room. |
| `outline: "k"`, `ow: 2` | Silhouette outline of width `ow` around everything drawn; **grows the drawn box by `ow` on every side**. Clipped detail never grows it. |
| `scale` | Export pixels per unit (default 1). CLI `--scales` multiplies it. |
| `frames`, `fps` | Anims only. |
| `boil` | Anims only: redraw the ink wobble every N frames (hand-drawn line boil). |

Post-processing order: items → mirror → swap → flip/rot → outline.

## Items

Items run in order (later on top):

- **Shapes** (below).
- **`stamp`, `scatter`, `tile`, `tf`, `sym`, `clip`** (below).
- **Function** `(f) => items`: evaluated at build time for every frame. `f.i` frame index,
  `f.n` frame count (1 for still assets), `f.t = i / n` (0 up to just below 1, loops),
  `f.sin(amp = 1, phase = 0, cycles = 1)`, `f.cos(...)`, `f.rng(seed)` (deterministic).
- **Lists** of items (from `map`, `Array.from`, ...) and `null` / `false` (skipped).

## Shapes

The last argument is the style: a color (fill; stroke for `line`, `curve`, `arc`) or an object.

| Shape | Notes |
|---|---|
| `rect(x, y, w, h, style)` | `r`: corner radius. |
| `circle(cx, cy, r, style)` | |
| `ellipse(cx, cy, rx, ry, style)` | |
| `poly(points, style)` | Closed polygon; `points` = `[x0, y0, x1, y1, ...]`. |
| `blob(points, style)` | Smooth closed curve through every point; `smooth`: 0 (straight) .. 1 (round, default). |
| `line(points, style)` | Open polyline. |
| `curve(points, style)` | Smooth open curve through every point; `smooth`. |
| `path(d, style)` | Raw SVG path data. |
| `star(cx, cy, points, r1, r2, style)` | Outer radius r1, inner r2; first point up; `rot`. |
| `ngon(cx, cy, sides, r, style)` | Regular polygon; `rot`. |
| `arc(cx, cy, r, from, to, style)` | 0 = up, clockwise; `pie: true` closes through the center (fill it). |
| `text(x, y, str, style)` | `size` (8), `font` ("sans-serif"), `anchor` ("start" \| "middle" \| "end"), `weight`. Uses system fonts. |

### Style object

| Key | Meaning |
|---|---|
| `fill`, `stroke` | Color or gradient. At least one is required. |
| `sw` | Stroke width (default 1). |
| `opacity` | 0..1. |
| `cap`, `join` | Stroke caps/joins (default `"round"`). |
| `dash` | `[on, off, ...]`. |
| `glow` | `r` or `{ r, color, strength: 1..4 }`: soft halo (flames, magic, neon). |
| `blur` | Gaussian blur radius (soft shadows, light). |
| `ink`, `shade`, `hatch` | Hand-drawn look (below). |

### Hand-drawn look

Three style keys turn any shape (not `text`) into inked, painted art. They are seeded from the
shape's geometry, so every build gives the same drawing.

```js
const LIGHT = 315                                   // degrees the light comes from: 0 = above, clockwise
blob([...], { fill: "m2", ink: { c: "k", w: 5, light: LIGHT }, shade: { light: LIGHT, rim: "m3" }, hatch: "m0" })
curve([...], { ink: { c: "k", w: 4, taper: 0.35 } })   // ink alone draws a hand-inked line
```

| `ink` (a color or an object) | Meaning |
|---|---|
| `c` | Line color. |
| `w` | Widest width in units (default 2). |
| `vary` | 0..1, how much the width wanders along the line (default 0.35). |
| `taper` | 0..1, share of an open line that tapers to a point at each end (default 0.3). |
| `wobble` | Wobble amplitude in units (default `w * 0.4`; 0 = exact). The fill follows the same wobble. |
| `light`, `weight` | Closed lines get up to `weight` (default 0.5) heavier on the side away from `light` (default: `shade.light`, else 315). |
| `dry` | 0..1, dry-brush breaks in the line. |
| `seed` | Another drawing of the same shape. |

| `shade` (true or an object; needs a `fill`) | Meaning |
|---|---|
| `light` | Light direction, as above (default 315, top-left). |
| `c` | Shadow color. Default: two ramp steps darker than the fill (`ramps`), else translucent dark. |
| `depth` | How far the shadow reaches in from the far edge, as a fraction of the shape's size (default 0.35). |
| `soft` | Shadow edge softness, a fraction of the size (default 0.1). |
| `hi` | Highlight on the lit edge: a color, `true` (default: one ramp step lighter, else translucent white) or `false`. |
| `rim` | Rim light color along the shadow edge. |
| `brush` | 0..1 streaky brush texture over the fill and shading (default 0.5). |

| `hatch` (a color or an object) | Meaning |
|---|---|
| `c`, `w`, `gap` | Line color, width (default 1) and spacing (default 4). |
| `angle` | Degrees, 0 = horizontal (default 45). |
| `opacity` | Default 0.5. |
| `cross` | Cross-hatching. |

Hatching fills the shape, or only its shadow when the shape has `shade`. The asset `outline`
includes the ink. Anims take `boil: N` to redraw every ink wobble each N frames (line boil).
`grain` can't share a shape with these; a paper texture is a full-size `rect` with `grain`,
`blend: "multiply"` and a low `opacity` over a `bg` color.

## Structure

| Op | Notes |
|---|---|
| `tf({ x, y, rot, scale, flip, origin, opacity, glow, blur }, ...items)` | Group with a transform; `scale` may be `[sx, sy]`; `rot`/`scale`/`flip` pivot on `origin` (local coords, default `[0, 0]`). |
| `sym(axisX, ...items)` | Items plus their mirror image about x = axisX (eyes, ears, wings). |
| `clip(mask, ...items)` | Items clipped to the mask shape (or list of shapes). Mask style is ignored. |

## Reuse

| Op | Notes |
|---|---|
| `stamp(name, x, y, opts?)` | Place an asset. `anchor`: `[ax, ay]` fractions of its box, `"center"`, `"bottom"`, `"top"` (default `[0, 0]` = top-left). `scale` (number or `[sx, sy]`), `rot`, `flip` pivot on the anchor. `swap`, `opacity`, `seed` (reroll its random picks). Anims: `frame` freezes one frame, `delay` offsets. |
| `tile(name, x, y, cols, rows, opts?)` | Grid of copies; `dx`, `dy` spacing (default the asset size) + stamp options. |
| `scatter(name, x, y, w, h, count, opts?)` | Random copies inside the area, reproducible. Anchor defaults to `"center"`. `scale` and `rot` take `[min, max]`; `flip: "x"` flips half of them at random. Copies of anims get increasing `delay`. |

## Skeletal animation

```js
const HERO = rig({
  torso: { pivot: [24, 40], z: 4, items: [...] },                 // a root bone
  head:  { parent: "torso", pivot: [24, 25], z: 7, items: [...] },
  armB:  { parent: "torso", pivot: [24, 28], z: 0, items: [...] },  // behind the torso, still follows it
})
const WALK = {
  armB: { rot: [[0, -22], [4, 22], [8, -22]] },                   // [frame, value, ease into the next key]
  torso: { move: [[0, [0, 0]], [2, [0, -1.4]], [4, [0, 0]]], rot: (f) => f.sin(2) },
}
anim("hero_walk", { w: 48, h: 64, frames: 8, fps: 10 }, pose(HERO, WALK))
```

| Part | Meaning |
|---|---|
| bone `pivot` | Joint position in the asset's coordinates, in the rest pose. The bone rotates and scales about it. |
| bone `parent` | Children inherit their parent's motion (shoulder → elbow → hand). |
| bone `z` | Draw order, higher on top (default: declaration order). Independent of the hierarchy. |
| bone `items` | What the bone draws, in rest-pose coordinates. Any items, including stamps and functions. |
| channel `rot` | Degrees, clockwise. |
| channel `move` | `[dx, dy]` offset. |
| channel `scale` | Number or `[sx, sy]` about the pivot. |
| keys | `[[frame, value, ease?], ...]` with increasing frames; values hold before the first key and after the last. A function `(f) => value` works too. |
| ease | Into the next key: `inOut` (default), `linear`, `in`, `out`, `step`. |

`pose(rig)` with no clip is the rest pose. For a seamless loop, make the last key (at frame `frames`)
equal the first. Stamped anims follow their parent's progress; to keep a short cycle at its own speed
inside a longer clip, stamp it with an explicit frame: `(f) => stamp("cycle", 0, 0, { frame: f.i % 24 })`.

## UI: 9-slice and bitmap fonts

```js
sprite("ui_panel", { w: 48, h: 48, scale: 3, slice: [12, 12, 12, 12] }, ...)   // left, top, right, bottom (units)
font("title", { family: "Open Sans", weight: 800, size: 48, fill: "gd2", outline: 3, outlineColor: "k", shadow: [0, 4] })
```

`slice` writes `out/sprites/<name>.9.json` (margins in pixels, plus Godot `patch_margin_*` and Unity
`border` values) and `out/_preview/<name>.9.png`, the sprite stretched to three sizes. `font()` renders
`chars` (default: printable ASCII) into `out/fonts/<name>.png` with BMFont text (`.fnt`) and XML
(`.xml`, what Phaser, libGDX and most engines load). Options: `family`, `weight`, `size` (px), `fill`,
`outline` + `outlineColor`, `shadow` `[dx, dy]` + `shadowColor`. Glyphs are rendered from the installed
font (found with fontconfig when available), so the font must be installed when you build.

## Particles (VFX)

```js
anim("fx_fire", { w: 48, h: 64, frames: 24, fps: 16 },
  particles({ area: [19, 50, 10, 4], rate: 3, life: [10, 15], speed: [1, 1.6], angle: [-104, -76], gravity: [0, -0.05],
    size: [[5, 7], 0.5], color: ["fi3", "fi2", "fi1", "fi0"], opacity: [0.9, 0.3], glow: 1.5, blend: "screen" }))
anim("fx_boom", { w: 96, h: 96, frames: 30, fps: 24 },
  particles({ at: [48, 50], burst: 30, life: [9, 18], speed: [1.4, 3.2], angle: [0, 360], drag: 0.13, size: [[12, 18], 3], color: [...] }))
```

| Option | Meaning |
|---|---|
| `at` / `area` | Spawn point `[x, y]` or area `[x, y, w, h]`. |
| `rate` / `burst` + `start` | Particles per frame (looping: frame 0 already holds particles from the previous cycle, so loops are seamless), or a one-shot count on frame `start`. |
| `life`, `speed`, `angle` | Frames; units per frame; degrees (0 = right, -90 = up). Numbers or `[min, max]`. |
| `gravity`, `drag` | Added to velocity per frame; velocity fraction lost per frame. |
| `size` | `[start, end]` over life (each a number or range): the diameter (radius for `ring`). |
| `color`, `opacity` | Colors spread from birth to death; `[start, end]` opacity. |
| `shape` | `circle` (default), `spark` (stretched along velocity), `square`, `star`, `ring`; or `sprite: "name"`. |
| `spin`, `glow`, `blend`, `seed`, `loop` | Rotation per frame; halo; blend mode; variation; override looping. |

Particles are recomputed from their seed for every frame, so any frame renders on its own and
builds repeat exactly. Effects are ordinary anims: strips, atlases + JSON, GIF previews.

## Levels and tilemaps

```js
tileset("forest", { size: 32, tiles: { top: "tile_top", top_l: "tile_top_l", fill: "tile_fill", ... } })
const ground = platformer({ top: "top", topL: "top_l", topR: "top_r", fill: "fill", fillL: "fill_l", fillR: "fill_r" })
level("stage1", { tileset: "forest", bg: "sky0", legend: {
    "#": ground,                                              // autotiled terrain
    "=": "stone",                                             // a fixed tile
    "c": { object: "coin", type: "coin", props: { value: 1 } },   // a game object
  }, map: `
  ....c.c....
  ..#######..
  ###########` })
level("gen", { tileset: "forest", legend, seed: 7, map: (rng) => /* build rows */ "..." })
```

| Part | Meaning |
|---|---|
| `tileset(name, { size, tiles })` | Tile keys (in tile-id order) mapped to sprites; `size` is the tile size in level units. |
| map | Rows of characters; `.` and space are empty. A function `(rng) => string` generates one (`seed`). |
| legend: string | A fixed tile key. |
| legend: rule | `(n, x, y) => key` with `n.up/down/left/right` and diagonals = "same terrain there". `platformer({...})` is the built-in grass-top / dirt-fill / end-caps rule. `{ terrain, group }` lets several characters count as one terrain. |
| legend: object | `{ object: sprite, type, props }`: placed bottom-center on its cell in the preview, exported as a Tiled object. |
| `scale` | Export pixels per unit (default 1). |

Each level is also a scene (preview, PNG, SVG). Export: `out/levels/<name>.tmj` (Tiled JSON, which Phaser,
Godot and Defold importers read), `<name>.tmx`, the tileset image, and `<name>.html`, which loads the
`.tmj` in Phaser 3 (serve the folder over HTTP). LDtk export is not implemented.

## Spine export

```js
spine("hero", HERO, { w: 48, h: 64, scale: 4, outline: "k", clips: {
  walk: { clip: WALK, frames: 8, fps: 10 }, run: { clip: RUN, frames: 8, fps: 14 } } })
```

Writes `out/spine/hero.json` (Spine 4.1 skeleton), `hero.atlas` + `hero.png` (one trimmed image per
bone), and `hero.html`, a preview of every clip in the official Spine web player (serve the folder
over HTTP). Bones keep their pivots and parents; slots follow `z`; clips are baked to one linear key
per frame, so every easing and procedural channel comes out exactly. `outline` outlines each part
separately (cutout style). The skeleton origin is the bottom center of `w × h` (change with `origin`).

## Output

`vex build art.vx.js [--out DIR] [--only a,b] [--scales 1,2] [--no-preview] [--no-grid]`

| Path | Content |
|---|---|
| `out/sprites/<name>.svg`, `.png`, `@2x.png` | Still sprites (scenes in `out/scenes`). PNGs are resvg renderings of the SVG. |
| `out/anims/<name>.png` + `.json` | Horizontal frame strip + TexturePacker/Aseprite-style JSON (durations, frame tag). |
| `out/anims/<name>/<i>.svg` | One SVG per frame. |
| `out/<sheet>.png` + `.json` | Atlas; anims expand to `name_0, name_1, ...` with a frame tag. |
| `out/_preview/<name>.png` | Preview: checkerboard, grid, unit rulers; anims: all frames side by side. |

`vex svg art.vx.js <name> [--frame N]` prints one SVG. `vex list art.vx.js` lists assets.
`vex serve art.vx.js [--port 4322] [--no-out]` runs the live viewer.

**Annotate mode** (`✎ annotate` or `a` in the viewer): pen strokes (markup colors, or click a palette
swatch to draw "make it this color"), numbered notes, erase a stroke (or right-click), three widths,
a comment. **send to Claude** writes `<out>/_feedback/<asset>.json` (`box`, `comment`, `notes`,
`strokes` with `points`, `bbox`, `width`, `color`, `key`, `kind`; all in asset units),
`<asset>.annotated.png`, `<asset>.marks.svg` (the marks alone, in the asset's viewBox) and
`<asset>.current.svg`. Only assets in the served file are accepted.
