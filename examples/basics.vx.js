// Basics: palette + ramps, mirrored + outlined sprites, variants, parts, gradients, glow, anims, sheets.
pal({ k: "#1b1630", g: "#7bd36a", G: "#3f8f4f", t: "#245a5a", w: "#fff6e0", r: "#e2585e", R: "#a63a4c",
  y: "#ffd35c", o: "#f0913a", b: "#5ab6ff", B: "#2f6fc0", s: "#c8c2d8", S: "#6e6888" })
ramps("tGgw", "kRry", "kBbw", "kSsw")

// blob: smooth closed curve through points. sym(16, ...) draws details plus their mirror.
// outline wraps the whole silhouette.
sprite("slime", { w: 32, h: 26, outline: "k" },
  blob([16, 2, 24, 5, 29, 13, 30, 22, 16, 24, 2, 22, 3, 13, 8, 5], { fill: rad(["g", "G"], { cx: 0.4, cy: 0.3, r: 0.8 }) }),
  sym(16,
    ellipse(10, 18, 3, 1.5, { fill: "G", opacity: 0.6 }),           // cheek shade
    circle(11, 12, 3, "w"), circle(11.6, 12.4, 1.6, "k")),          // eyes
  circle(9, 7, 1.6, { fill: "w", opacity: 0.7 }))                   // shine (one side only)

sprite("slime_red", { base: "slime", swap: { g: "r", G: "R" } })
sprite("slime_blue", { base: "slime", swap: { g: "b", G: "B" } })

sprite("_gem", { w: 10, h: 12 },
  poly([5, 0, 10, 4, 5, 12, 0, 4], { fill: lin(["b", "B"], 90) }),
  poly([5, 0, 10, 4, 5, 4], { fill: "w", opacity: 0.5 }))

sprite("coin", { w: 20, h: 20, outline: "k", ow: 1.5 },
  circle(10, 10, 9, "o"), circle(10, 10, 7, "y"),
  rect(8.5, 5, 3, 10, { fill: "o", r: 1.5 }),
  arc(10, 10, 5.5, 220, 320, { stroke: "w", sw: 1.2, opacity: 0.8 }))

sprite("sword", { w: 12, h: 40, outline: "k", ow: 1.5 },
  poly([6, 0, 9, 4, 9, 27, 3, 27, 3, 4], { fill: lin(["w", "s", "S"], 0) }),
  line([6, 3, 6, 26], { stroke: "S", sw: 0.8 }),
  rect(0, 27, 12, 3, { fill: "o", r: 1.5 }),
  rect(4.5, 30, 3, 8, { fill: "R" }),
  circle(6, 38.5, 2, "y"),
  stamp("_gem", 3.5, 26.5, { scale: 0.5 }))

sprite("orb", { w: 24, h: 24 },
  circle(12, 12, 7, { fill: rad(["w", "b", "B"], { cx: 0.35, cy: 0.35, r: 0.7 }), glow: { r: 6, color: "b", strength: 2 } }))

anim("coin_spin", { w: 20, h: 20, frames: 8, fps: 12, outline: "k", ow: 1.5 },
  (f) => {
    const sx = Math.max(0.12, Math.abs(Math.cos(f.t * Math.PI * 2)))
    return tf({ x: 10, y: 10, scale: [sx, 1] }, circle(0, 0, 9, "o"), circle(0, 0, 7, "y"), rect(-1.5, -5, 3, 10, { fill: "o", r: 1.5 }))
  })

// Function items get the frame: f.t runs 0..1 and loops; f.sin(amp) / f.cos(amp) are one cycle.
anim("slime_hop", { w: 36, h: 42, frames: 8, fps: 10 },
  (f) => ellipse(18, 39, 11 - Math.max(0, f.sin(3)), 2, { fill: "#1b163055" }),      // shadow
  (f) => stamp("slime", 18, 38 - Math.max(0, f.sin(8)), { anchor: "bottom", scale: [1 + f.cos(0.08), 1 - f.cos(0.08)] }))

scene("meadow", { w: 160, h: 90, bg: lin(["b", "w"], 90) },
  circle(130, 20, 10, { fill: "y", glow: { r: 8, color: "y" } }),
  blob([0, 62, 40, 54, 90, 60, 130, 52, 160, 58, 160, 90, 0, 90], { fill: "g", smooth: 0.6 }),
  rect(0, 72, 160, 18, "G"),
  scatter("slime*", 10, 66, 140, 10, 5, { anchor: "bottom", scale: [0.6, 0.9], flip: "x" }),
  stamp("coin", 80, 40, { anchor: "center", scale: 0.8 }),
  stamp("sword", 30, 40, { anchor: "center", rot: 35 }))

sheet("items", ["slime*", "coin", "sword", "orb", "coin_spin"], { pad: 2, scale: 2 })
