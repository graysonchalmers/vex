// Props: cel shading with clip + ramps, tiles, groups + scatter, UI with text.
pal({ k: "#1b1630", w: "#fff6e0",
  wd0: "#4a2c2a", wd1: "#7a4a35", wd2: "#a86b45", wd3: "#d39a62",      // wood
  gl0: "#21405e", gl1: "#3d7fb8", gl2: "#8fd0ff",                      // glass
  p0: "#5d1f4a", p1: "#b13e8f", p2: "#ff7ad9",                         // potion
  l0: "#1f4d3a", l1: "#2f7d4f", l2: "#5fbf5f", l3: "#a8e07a",          // leaves
  s0: "#3b3a4a", s1: "#6b6880", s2: "#a19db5" })                       // stone
ramps("wd0 wd1 wd2 wd3", "gl0 gl1 gl2", "p0 p1 p2", "l0 l1 l2 l3", "s0 s1 s2")

// Cel shading: base shape, then darker / lighter tones clipped to it.
sprite("crate", { w: 28, h: 28, outline: "k", ow: 1.5 },
  rect(0, 0, 28, 28, { fill: "wd2", r: 2 }),
  clip(rect(0, 0, 28, 28, { fill: "k", r: 2 }),
    poly([28, 0, 28, 28, 0, 28], { fill: dark("wd2"), opacity: 0.35 }),  // shadow half
    rect(0, 0, 28, 3, lite("wd2"))),                                     // top light
  rect(3, 3, 22, 22, { stroke: "wd0", sw: 1.5 }),
  line([4, 24, 24, 4], { stroke: "wd1", sw: 4 }),
  sym(14, circle(5, 5, 1, "wd0"), circle(5, 23, 1, "wd0")))

sprite("potion", { w: 20, h: 28, outline: "k", ow: 1.5 },
  rect(7, 0, 6, 4, { fill: "wd2", r: 1 }),
  rect(8, 4, 4, 5, "gl1"),
  circle(10, 18, 9, { fill: "gl1", opacity: 0.6 }),
  clip(circle(10, 18, 9, "k"),
    rect(0, 15, 20, 14, { fill: "p1", glow: { r: 3, color: "p2" } }),
    ellipse(10, 15, 9, 1.6, "p2"),
    circle(6, 22, 1.2, { fill: "w", opacity: 0.6 }), circle(12, 19, 0.8, { fill: "w", opacity: 0.6 }),
    curve([3.5, 17, 4.5, 13, 7.5, 11], { stroke: "w", sw: 1.4, opacity: 0.8 })))   // clipped: never bulges the outline

for (const [i, pts] of [[0, 18, 4, 6, 12, 2, 20, 6, 24, 16, 18, 24, 6, 24], [2, 14, 8, 4, 18, 4, 24, 12, 22, 22, 10, 24]].entries())
  sprite("_canopy" + i, { w: 26, h: 26 },
    blob(pts, "l1"),
    clip(blob(pts, "k"), circle(8, 7, 9, "l2"), circle(7, 5, 4, "l3")))

sprite("tree", { w: 26, h: 40, outline: "k", ow: 1.5 },
  rect(10, 20, 6, 20, { fill: "wd1", r: 1 }),
  rect(10, 20, 2, 20, "wd2"),
  stamp("_canopy*", 0, 0))
sprite("tree_alt", { base: "tree", swap: { l1: "wd2", l2: "wd3", l3: "w" } })   // autumn

sprite("_stone", { w: 16, h: 16 },
  rect(0, 0, 16, 16, "s1"), rect(0.5, 0.5, 15, 15, { stroke: "s0", sw: 1 }), rect(2, 2, 6, 2, { fill: "s2", r: 1 }))
group("trees", ["tree", "tree", "tree_alt"])

scene("yard", { w: 160, h: 96, bg: lin(["#8fd0ff", "#e8f6ff"], 90) },
  tile("_stone", 0, 80, 10, 1),
  scatter("trees", 10, 78, 140, 4, 6, { anchor: "bottom", scale: [0.8, 1.1], flip: "x" }),
  stamp("crate", 60, 80, { anchor: "bottom" }), stamp("crate", 70, 52, { anchor: "bottom", scale: 0.8, rot: 8 }),
  stamp("potion", 100, 80, { anchor: "bottom" }))

sprite("hp_bar", { w: 64, h: 14, outline: "k", ow: 1 },
  rect(0, 0, 64, 14, { fill: "s0", r: 3 }),
  rect(14, 3, 47, 8, { fill: "p0", r: 2 }),
  rect(14, 3, 32, 8, { fill: lin(["p2", "p1"], 90), r: 2 }),
  star(7, 7, 5, 5, 2.2, "p2"),
  text(37.5, 10, "68/100", { fill: "w", size: 6.5, anchor: "middle", weight: "bold" }))

sprite("cooldown", { w: 24, h: 24 },
  circle(12, 12, 11, "s0"),
  arc(12, 12, 9, 0, 250, { fill: "gl1", pie: true }),
  ngon(12, 12, 6, 5, { fill: "gl2", rot: 30 }),
  circle(12, 12, 11, { stroke: "s2", sw: 1.5, dash: [2, 2] }))
