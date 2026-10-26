// Stilt hut icon from kiln's swamp kit (stilt_hut), swamp palette.
pal({ k: "#1e2018", bg: "#3f5a45", bgD: "#2a3d30", b: "#86623e", w: "#8a6a48", W: "#ccad84", d: "#5e4632",
  t: "#c8b26a", T: "#857238", y: "#ffe2a0", Y: "#ffc860", r: "#6c8a70" })

sprite("stilt_hut_icon", { w: 64, h: 64 },
  rect(2, 2, 60, 60, { fill: lin(["bg", "bgD"], 90), r: 12 }),
  ellipse(32, 52, 26, 4, { fill: "bgD" }),
  rect(14, 52, 8, 1.2, { fill: "r", r: 0.6, opacity: 0.7 }), rect(38, 55, 10, 1.2, { fill: "r", r: 0.6, opacity: 0.7 }),
  sym(32, rect(17, 36, 3.5, 17, { fill: lin(["b", "d"], 0), r: 1 })),
  rect(13, 35, 38, 3, { fill: "W", r: 1 }),
  rect(17, 22, 30, 13, { fill: lin(["w", "d"], 90) }),
  [21, 26, 31, 36, 41].map((x) => rect(x, 22, 0.8, 13, { fill: "d", opacity: 0.6 })),
  rect(20, 25, 7, 10, { fill: "d", r: 1 }),
  rect(34, 25, 8, 6, { fill: rad(["y", "Y"]), r: 1, glow: { r: 5, color: "Y", strength: 2 } }),
  path("M10 24 L32 8 L54 24 Z", { fill: lin(["t", "T"], 90) }),
  path("M10 24 L54 24 L52 26 L12 26 Z", { fill: "T" }),
  [[25, 38, 29, 54], [30, 38, 34, 54]].map(([a, b, c, e]) => path(`M${a} ${b} L${c} ${e}`, { stroke: "d", sw: 1.4 })),
  [42, 46, 50].map((y, i) => path(`M${26 + i} ${y} L${31 + i} ${y}`, { stroke: "W", sw: 1.2 })))
