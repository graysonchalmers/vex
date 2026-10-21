// Levels: ASCII maps + autotiling over the Forest Kit tiles, exported to Tiled (.tmj / .tmx).
include("forest_kit.vx.js")

tileset("forest", { size: 32, tiles: {
  top: "tile_top", top_l: "tile_top_l", top_r: "tile_top_r",
  fill: "tile_fill", fill_l: "tile_fill_l", fill_r: "tile_fill_r", stone: "tile_stone" } })

// Grass on top, dirt below, rounded caps where the ground ends.
const ground = platformer({ top: "top", topL: "top_l", topR: "top_r", fill: "fill", fillL: "fill_l", fillR: "fill_r" })

const LEGEND = {
  "#": ground, "=": "stone",
  "@": { object: "hero_idle", type: "player" },
  "c": { object: "coin", type: "coin", props: { value: 1 } },
  "g": { object: "gem_blue", type: "gem", props: { value: 10 } },
  "s": { object: "slime_idle", type: "enemy", props: { patrol: 3 } },
  "b": { object: "bat_fly", type: "enemy", props: { flying: true } },
  "C": { object: "chest", type: "chest" },
  "t": { object: "tree", type: "decor" }, "p": { object: "pine", type: "decor" },
  "r": { object: "rock", type: "decor" }, "m": { object: "mushroom", type: "decor" },
  "f": { object: "sign", type: "sign", props: { text: "Beware the slimes" } },
}

level("stage1", { tileset: "forest", bg: lin(["sky0", "sky1"], 90), legend: LEGEND, map: `
  .......................................................
  ......................b................................
  ....................ccc..........................b.....
  ...................####........g.......................
  ............c.c..............####.......ccc............
  ...........#####.....................#######...........
  .......................................................
  .......................................................
  ..t@....f....m..r....p......s.....t.....s..C....p......
  ###########......############....=====....#############
  ###########......############....=====....#############
  ` })

// Generated: rolling hills from a few sine waves, gaps, floating ledges, coins over every gap.
level("generated", { tileset: "forest", bg: lin(["sky0", "sky1"], 90), legend: LEGEND, seed: 7, map: (r) => {
  const W = 64, H = 12, cols = []
  let gap = 0
  for (let x = 0; x < W; x++) {
    const h = Math.round(3 + 1.6 * Math.sin(x / 6 + r() * 0.3) + 0.8 * Math.sin(x / 2.7))
    if (gap > 0) gap--; else if (x > 6 && x < W - 6 && r() < 0.06) gap = 2 + Math.floor(r() * 2)
    cols.push(gap > 0 ? 0 : h)
  }
  const rows = Array.from({ length: H }, () => Array(W).fill("."))
  cols.forEach((h, x) => {
    for (let y = H - h; y < H; y++) rows[y][x] = "#"
    if (h === 0) rows[H - 6][x] = "c"
    else if (r() < 0.12 && x > 4) rows[H - h - 1][x] = ["t", "p", "r", "m"][Math.floor(r() * 4)]
    else if (r() < 0.05 && x > 8) rows[H - h - 1][x] = "s"
  })
  for (let x = 10; x < W - 6; x += 9 + Math.floor(r() * 5)) for (let k = 0; k < 3; k++) rows[2 + Math.floor(r() * 2)][x + k] = "#"
  rows[H - cols[2] - 1][2] = "@"
  rows[H - cols[W - 3] - 1][W - 3] = "C"
  return rows.map((row) => row.join("")).join("\n")
} })
