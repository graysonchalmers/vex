// Mangrove icon from kiln's swamp kit (mangrove_roots), swamp palette.
pal({ bg: "#3f5a45", bgD: "#2a3d30", b: "#86623e", d: "#5e4632", L: "#8db04e", f: "#4e7a34", F: "#3e5e2e", r: "#6c8a70" })

sprite("mangrove_icon", { w: 64, h: 64 },
  rect(2, 2, 60, 60, { fill: lin(["bg", "bgD"], 90), r: 12 }),
  ellipse(32, 53, 24, 3.5, { fill: "bgD" }),
  rect(12, 52, 8, 1.2, { fill: "r", r: 0.6, opacity: 0.7 }), rect(42, 55, 9, 1.2, { fill: "r", r: 0.6, opacity: 0.7 }),
  ...[[12, 22], [19, 25], [27, 28], [37, 36], [45, 39], [52, 42]].map(([ex, mx]) =>
    path(`M32 38 Q${mx} 40 ${ex} 53`, { stroke: lin(["b", "d"], 90), sw: 2.2, cap: "round" })),
  path("M30 40 L31 20 L33 20 L34 40 Z", { fill: lin(["b", "d"], 0) }),
  ...[[22, 22, 9, "F"], [42, 22, 9, "F"], [32, 17, 12, "f"], [24, 15, 7, "f"], [40, 15, 7, "f"], [28, 11, 5, "L"], [37, 12, 4, "L"]]
    .map(([x, y, r, c]) => circle(x, y, r, { fill: c })))
