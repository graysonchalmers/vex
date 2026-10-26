// Lantern post icon from kiln's swamp kit (lantern_post), swamp palette.
pal({ bg: "#3f5a45", bgD: "#2a3d30", b: "#86623e", d: "#5e4632", i: "#646a72", I: "#43484e", y: "#ffe2a0", Y: "#ffc860", r: "#6c8a70" })

const LANTERN_POST_ART = [
  rect(14, 53, 8, 1.2, { fill: "r", r: 0.6, opacity: 0.7 }), rect(40, 55, 10, 1.2, { fill: "r", r: 0.6, opacity: 0.7 }),
  rect(19, 51, 10, 3, { fill: "d", r: 1 }),
  rect(21, 12, 6, 40, { fill: lin(["b", "d"], 0), r: 1 }),
  rect(21, 11, 24, 3, { fill: "d", r: 1 }),
  path("M27 22 L36 14", { stroke: "d", sw: 2.5, cap: "round" }),
  path("M40 14 L40 18", { stroke: "i", sw: 1.2 }),
  path("M35 21 L40 17 L45 21 Z", { fill: "I" }),
  rect(36, 21, 8, 11, { fill: rad(["y", "Y"]), r: 1, glow: { r: 7, color: "Y", strength: 2 } }),
  rect(35, 21, 1.4, 11, { fill: "i" }), rect(43.6, 21, 1.4, 11, { fill: "i" }),
  rect(34.5, 32, 11, 2, { fill: "I", r: 0.6 })]
sprite("lantern_post_icon", { w: 64, h: 64 },
  rect(2, 2, 60, 60, { fill: lin(["bg", "bgD"], 90), r: 12 }),
  circle(40, 30, 16, { fill: "Y", opacity: 0.18, blur: 6 }), ...LANTERN_POST_ART)
// item: same art without the tile, outlined and zoomed to fill an inventory slot
sprite("lantern_post_item", { w: 64, h: 64, outline: "#1a2014", ow: 1.5 }, tf({ scale: 1.15, origin: [32, 6] }, ...LANTERN_POST_ART))
