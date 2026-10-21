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
