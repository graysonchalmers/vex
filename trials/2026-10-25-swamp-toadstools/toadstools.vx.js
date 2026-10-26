// Glowing toadstool icon from kiln's swamp kit (glow_toadstools), swamp palette.
pal({ k: "#1e2a24", bg: "#3f5a45", bgD: "#2a3d30", g: "#6b5740", s: "#cfc8ae", S: "#857e68",
  C: "#2e4a3e", c: "#4a8064", l: "#6fbf98", e: "#9fe8c8" })

const shroom = (x, base, h, r) => [
  rect(x - r * 0.22, base - h, r * 0.44, h, { fill: lin(["s", "S"], 0), r: r * 0.15 }),
  path(`M${x - r} ${base - h} Q${x - r} ${base - h - r * 1.15} ${x} ${base - h - r * 1.15} Q${x + r} ${base - h - r * 1.15} ${x + r} ${base - h} Z`,
    { fill: rad(["l", "c"], { cx: 0.35, cy: 0.3, r: 0.8 }), glow: { r: r * 0.5, color: "e", strength: 1 } }),
  ellipse(x, base - h, r * 0.92, r * 0.14, "C"),
  ellipse(x - r * 0.35, base - h - r * 0.75, r * 0.22, r * 0.1, { fill: "e", opacity: 0.8 }),
]

const GLOW_TOADSTOOLS_ART = [
  ellipse(32, 51, 22, 5, "g"),
  shroom(46, 51, 9, 7), shroom(18, 52, 7, 7), shroom(32, 51, 16, 12), shroom(25, 53, 4, 3.5),
  circle(42, 16, 1.2, { fill: "e", glow: 2 }), circle(22, 22, 0.9, { fill: "e", glow: 2 })]
sprite("glow_toadstools_icon", { w: 64, h: 64 },
  rect(2, 2, 60, 60, { fill: rad(["bg", "bgD"], { cy: 0.4, r: 0.7 }), r: 12 }),
  circle(32, 28, 20, { fill: "e", opacity: 0.12, blur: 6 }), ...GLOW_TOADSTOOLS_ART)
// item: same art without the tile, outlined and zoomed to fill an inventory slot
sprite("glow_toadstools_item", { w: 64, h: 64, outline: "#1a2014", ow: 1.5 }, tf({ scale: 1.15, origin: [32, 6] }, ...GLOW_TOADSTOOLS_ART))
// selected-slot animation: same item art plus a small loop
anim("glow_toadstools_item_anim", { w: 64, h: 64, frames: 8, fps: 8, outline: "#1a2014", ow: 1.5 },
  (f) => tf({ scale: [1.15, 1.15 * (1 + f.sin(0.025))], origin: [32, 53] }, ...GLOW_TOADSTOOLS_ART,
    ellipse(28.5, 25, 3, 1.2, { fill: "e", opacity: 0.5 + f.sin(0.45) })))
