# vex

**2D vector game art as code.** Write a small `.vx.js` file of shapes, parts and variants;
vex exports SVG + PNG for every asset, animation strips and sprite atlases with
TexturePacker/Aseprite-style JSON, and previews with coordinate rulers that an AI agent can read.
A live viewer rebuilds on save and replays each asset step by step.

Built for AI agents (it ships as a Claude Code skill) and just as usable by hand.

> Inspired by [**claude-pxl**](https://github.com/crsolver/claude-pxl) by crsolver, a pixel-art
> DSL for agents. vex takes its architecture (sandboxed art files, lazy cached builds, located
> errors, live painting viewer) and redesigns it for vectors: smooth shapes, gradients, glow,
> silhouette outlines, transforms, procedural animation, grain and blend modes.

## Showcase

Everything below was written as code in vex. Sources are in [`showcase/`](showcase/).

### LAST CUP: a cyberpunk noir scene

![LAST CUP: a robot alone in a rainy cyberpunk coffee shop](docs/media/last_cup.gif)

1920×1080 still: [`last_cup.png`](docs/media/last_cup.png) · 10 s 1080p loop: [`last_cup.mp4`](docs/media/last_cup.mp4) ·
source: [`noir_cafe.vx.js`](showcase/noir_cafe.vx.js)

Rain on the glass, a backwards neon sign with a dying letter, flickering CRT, smoke and steam,
film grain, all procedural and looping.

### Forest Kit: a game-ready platformer pack

![Forest Kit gameplay poster](docs/media/forest_kit_poster.png)

![Forest Kit animations](docs/media/forest_kit_anims.gif)

![Forest Kit asset board](docs/media/forest_kit_board.png)

Characters, enemies, collectibles, props, seamless tiles, parallax layers and UI in one style.
Every asset is exported as SVG and PNG @1x/@2x, with atlases + JSON.
Source: [`forest_kit.vx.js`](showcase/forest_kit.vx.js)

| Character atlas | Tile atlas (seamless) |
|---|---|
| ![](docs/media/atlas_characters.png) | ![](docs/media/atlas_tiles.png) |

## Quick start

```bash
git clone https://github.com/uilianks/vex && cd vex
npm install
node bin/vex.js build examples/basics.vx.js        # -> examples/out/
node bin/vex.js serve showcase/noir_cafe.vx.js     # live viewer on http://127.0.0.1:4322
```

Requires Node ≥ 22.18 (it runs the TypeScript sources directly). PNGs are rendered with
[resvg](https://github.com/linebender/resvg), so every PNG is a faithful rendering of its SVG.

```js
pal({ k: "#1b1630", g: "#7bd36a", G: "#3f8f4f", w: "#fff6e0", r: "#e2585e", R: "#a63a4c" })

sprite("slime", { w: 32, h: 26, outline: "k" },
  blob([16, 2, 24, 5, 29, 13, 30, 22, 16, 24, 2, 22, 3, 13, 8, 5], { fill: rad(["g", "G"], { cx: 0.4, cy: 0.3 }) }),
  sym(16, circle(11, 12, 3, "w"), circle(11.6, 12.4, 1.6, "k")))
sprite("slime_red", { base: "slime", swap: { g: "r", G: "R" } })

anim("slime_hop", { w: 36, h: 42, frames: 8, fps: 10 },
  (f) => stamp("slime", 18, 38 - Math.max(0, f.sin(8)), { anchor: "bottom" }))

sheet("enemies", ["slime*", "slime_hop"], { scale: 2 })
```

## Features

- **Shapes:** `rect circle ellipse poly blob curve line path star ngon arc text`. `blob` and
  `curve` pass smoothly through their points, so organic shapes take a few numbers.
- **Paint:** palette keys and ramps, linear and radial gradients, glow, blur, procedural `grain`,
  `blend` modes.
- **Structure:** `tf` transform groups, `sym` mirroring, `clip` for cel shading and highlights,
  automatic silhouette `outline`.
- **Reuse:** parts, `base` + `swap` variants, `stamp`, `tile`, `scatter`, random groups and globs.
- **Animation:** `(f) => items` functions per frame (`f.t`, `f.sin`, `f.cos`, `f.rng`). Anims
  stamped inside anims follow their frames.
- **Output:** SVG, PNG at any scale, animation strips, atlases + JSON for Phaser, PixiJS, Godot
  and similar engines, agent-readable previews.
- **Errors** name `file:line:col` and the asset path, and suggest fixes. One broken asset never
  stops the others.

Agent workflow: [SKILL.md](SKILL.md) · Full API: [reference.md](reference.md)

## Use as a Claude Code skill

```bash
ln -s "$PWD" ~/.claude/skills/vex-vector-art
```

## Development

```bash
npm run check   # typecheck + tests
```

## License

[MIT](LICENSE). Portions adapted from [claude-pxl](https://github.com/crsolver/claude-pxl)
(MIT, © crsolver).
