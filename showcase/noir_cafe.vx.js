// LAST CUP — a cyberpunk noir coffee shop. Built with vex.
// 480x270 units; still exported at 4x (1920x1080), loop animated at 12 fps.

pal({
  void: "#050608", k: "#000000",
  lp0: "#2e2010", lp1: "#9c6f2c", lp2: "#ffd28c",                                              // tungsten lamp
  tg0: "#06200f", tg1: "#1f7a46", tg2: "#8affb0",                                              // phosphor green
  ct0: "#0f0d0b", ct1: "#211d18", ct2: "#352f27", ct3: "#4d4438",                              // coat
  cup: "#bdb6a6", cupD: "#6f695d", cof: "#140b07",
  mt0: "#15181b", mt1: "#2a3035", mt2: "#454e55", mt3: "#6d777e", mt4: "#a3adb3",              // worn steel
  c0: "#0b0e11", c1: "#12171b", c2: "#1a2126", c3: "#252d33", c4: "#343e45", c5: "#4c575e",   // concrete
  rs0: "#1f120d", rs1: "#3d2016", rs2: "#62321e", rs3: "#8a4a2a",                              // rust
  nr0: "#3d0a12", nr1: "#9e1428", nr2: "#ff3048", nr3: "#ff9aa6",                              // neon red
  nc0: "#04282e", nc1: "#0c6f7a", nc2: "#2ee6f2", nc3: "#c2fcff",                              // neon cyan
  fog0: "#0d1a20", fog1: "#18303a", fog2: "#2a4954",                                           // city haze
})

const W = 480, H = 270
const WIN = { x: 18, y: 34, w: 236, h: 150 }

// ------------------------------------------------------------------ wall

sprite("_wall", { w: W, h: H },
  rect(0, 0, W, H, { fill: lin(["c1", "c2", "c1"], 0) }),
  // brutalist cast-concrete panels
  [0, 120, 240, 360].map((x) => line([x, 0, x, H], { stroke: "c0", sw: 1.2 })),
  [90, 200].map((y) => line([0, y, W, y], { stroke: "c0", sw: 1.2 })),
  rect(0, 0, W, H, { fill: "#000", grain: { freq: 0.35, octaves: 4, seed: 5 }, blend: "overlay", opacity: 0.55 }),
  rect(0, 0, W, H, { fill: "#000", grain: { freq: 1.6, octaves: 2, seed: 9 }, blend: "overlay", opacity: 0.35 }))

// ------------------------------------------------------------------ outside

const TOWERS = [[4, 46, 30], [38, 22, 24], [66, 60, 34], [104, 8, 30], [140, 36, 42], [186, 18, 28], [212, 52, 30]]

sprite("_city", { w: WIN.w, h: WIN.h },
  rect(0, 0, WIN.w, WIN.h, { fill: lin(["void", "fog0", "fog1"], 90) }),
  // farthest layer: haze-flattened slabs
  [[0, 70, 60], [50, 54, 50], [96, 76, 70], [160, 60, 50], [200, 80, 40]].map(([x, top, w]) => rect(x, top, w, WIN.h, { fill: "fog1", opacity: 0.6 })),
  // brutalist towers with sparse lit windows
  TOWERS.map(([x, top, w], i) => {
    const r = rng(40 + i)
    const lit = []
    for (let y = top + 6; y < WIN.h - 10; y += 6)
      for (let wx = x + 3; wx < x + w - 4; wx += 5)
        if (r() < 0.12) lit.push(rect(wx, y, 2.4, 1.6, { fill: r() < 0.7 ? "#c9a86a" : "nc2", opacity: 0.35 + r() * 0.4 }))
    return [rect(x, top, w, WIN.h - top, { fill: lin(["c1", "c0"], 90) }), rect(x + w - 3, top, 3, WIN.h - top, { fill: "c3", opacity: 0.35 }), lit]
  }),
  // neon out there, softened by rain and dirty glass
  rect(150, 70, 9, 46, { fill: "nr1", glow: { r: 10, color: "nr2", strength: 2 }, blur: 1.2 }),
  [76, 84, 92, 100, 108].map((y) => rect(152, y, 5, 3, { fill: "nr3", opacity: 0.7, blur: 0.8 })),
  rect(40, 96, 46, 14, { fill: "nc1", glow: { r: 12, color: "nc2", strength: 2 }, blur: 1.6 }),
  rect(196, 104, 30, 6, { fill: "nr1", glow: { r: 8, color: "nr1" }, blur: 1.4 }),
  // fog rolling at street level
  rect(0, 0, WIN.w, WIN.h, { fill: lin(["#00000000", "#00000000", "fog2"], 90), opacity: 0.55 }))

// Rusted steel frame: 6 panes, flaking paint.
sprite("_frame", { w: WIN.w + 12, h: WIN.h + 12 },
  path(`M0 0H${WIN.w + 12}V${WIN.h + 12}H0Z M6 6V${WIN.h + 6}H${WIN.w + 6}V6Z`, { fill: lin(["rs1", "rs0"], 90) }),
  [WIN.w / 3 + 6, (2 * WIN.w) / 3 + 6].map((x) => rect(x - 2, 6, 4, WIN.h, "rs1")),
  rect(6, WIN.h * 0.55 + 4, WIN.w, 4, "rs1"),
  // rust bleeding down from the joints
  [[WIN.w / 3 + 6, 10], [(2 * WIN.w) / 3 + 6, 22], [40, WIN.h * 0.55 + 8], [200, WIN.h * 0.55 + 8]].map(([x, len]) =>
    ellipse(x, WIN.h * 0.55 + 8 + len, 1.6, len, { fill: "rs2", opacity: 0.5, blur: 0.8 })),
  rect(0, WIN.h + 8, WIN.w + 12, 4, "rs2"))

// ------------------------------------------------------------------ interior

const FLOOR = 214, COUNTER = 166

// Neon sign hung inside the window, facing the street: we read it backwards. One letter is dying.
const neonText = (str, x, y, size, color, glowColor, op = 1) =>
  text(x, y, str, { fill: "none", stroke: color, sw: 1.1, size, font: "DejaVu Sans", weight: "bold", opacity: op, glow: { r: 5, color: glowColor, strength: 2 } })
anim("_sign", { w: 96, h: 26, frames: 24, fps: 12 },
  line([12, 0, 12, 6], { stroke: "mt2", sw: 0.6 }), line([84, 0, 84, 6], { stroke: "mt2", sw: 0.6 }),
  rect(2, 6, 92, 18, { fill: "#0a0c0e", opacity: 0.7, r: 2 }),
  (f) => tf({ x: 96, flip: "x" },
    neonText("CO", 7, 21, 15, "nr2", "nr1"),
    neonText("F", 31, 21, 15, "nr2", "nr1", [3, 4, 9, 15, 16].includes(f.i) ? 0.12 : 0.95),
    neonText("FEE", 42, 21, 15, "nr2", "nr1")))

sprite("_counter", { w: W - 290, h: FLOOR - COUNTER + 2 },
  rect(0, 0, W - 290, 5, { fill: lin(["mt3", "mt1"], 90) }),
  rect(0, 5, W - 290, FLOOR - COUNTER - 3, { fill: lin(["rs1", "rs0"], 90) }),
  [26, 62, 98, 134, 170].map((x) => line([x, 6, x, FLOOR - COUNTER], { stroke: "rs0", sw: 1.4 })),
  [30, 74, 120].map((x, i) => ellipse(x + 6, 20 + i * 3, 2, 10 + i * 3, { fill: "rs2", opacity: 0.45, blur: 1 })),
  rect(0, FLOOR - COUNTER - 6, W - 290, 6, { fill: "#000", opacity: 0.4 }))

anim("_terminal", { w: 34, h: 30, frames: 24, fps: 12 },
  rect(0, 0, 34, 26, { fill: lin(["#6c6a5c", "#3b3a33"], 90), r: 2 }),
  rect(3, 3, 24, 18, { fill: "#0d0f0c", r: 3 }),
  (f) => tf({ opacity: f.i % 7 === 3 ? 0.55 : 1 },
    rect(4, 4, 22, 16, { fill: rad(["tg1", "tg0"], { r: 0.7 }), r: 3, glow: { r: 6, color: "tg1" } }),
    [7, 10, 13].map((y, i) => rect(6, y, [15, 11, 17][i], 1.1, { fill: "tg2", opacity: 0.75 })),
    rect(6, 16, f.i % 12 < 6 ? 3 : 0.01, 1.4, "tg2"),
    Array.from({ length: 8 }, (_, i) => rect(4, 4 + i * 2, 22, 0.5, { fill: "#000", opacity: 0.35 }))),
  [29, 31].map((x) => circle(x, 8, 0.9, "#22231e")), rect(28, 14, 4, 6, { fill: "#22231e", r: 0.6 }),
  rect(4, 26, 26, 4, { fill: "#2b2a25", r: 1 }))

sprite("_espresso", { w: 40, h: 34 },
  rect(2, 0, 36, 6, { fill: "mt2", r: 1.5 }),
  rect(0, 6, 40, 20, { fill: lin(["mt3", "mt1"], 0) }),
  rect(0, 26, 40, 8, { fill: "mt1" }),
  circle(10, 14, 4.2, "mt0"), circle(10, 14, 3.4, "#c9c3b2"), line([10, 14, 8, 11.6], { stroke: "nr1", sw: 0.6 }),
  [22, 32].map((x) => [rect(x - 3, 22, 6, 3, "mt0"), rect(x - 1, 25, 2, 3, "mt0")]),
  ellipse(30, 10, 3, 2, { fill: "rs2", opacity: 0.6, blur: 0.8 }))

sprite("_menu", { w: 70, h: 40 },
  rect(0, 0, 70, 40, { fill: "#0c0f10", r: 1 }), rect(0, 0, 70, 40, { stroke: "mt1", sw: 1.4 }),
  [8, 15, 22, 29].map((y, i) => [rect(6, y, [34, 28, 38, 22][i], 2, { fill: "#cfc6a8", opacity: 0.18 }), rect(52, y, 10, 2, { fill: "#cfc6a8", opacity: 0.14 })]),
  line([42, 0, 70, 22], { stroke: "#2b3236", sw: 0.6 }))

sprite("_lamp", { w: 30, h: 90 },
  line([15, 0, 15, 70], { stroke: "#090b0c", sw: 0.8 }),
  path("M6 82L9 70H21L24 82Z", { fill: lin(["mt2", "mt0"], 90) }),
  ellipse(15, 82, 9, 1.6, "lp1"),
  ellipse(15, 82.4, 4, 1.4, { fill: "lp2", glow: { r: 6, color: "lp2", strength: 3 } }))

// ------------------------------------------------------------------ the robot

const TABLE_Y = 194

anim("_head", { w: 40, h: 36, frames: 24, fps: 12 },
  rect(23, -4, 2.2, 7, "mt1"), curve([24, -4, 26, -7, 25, -9, 27, -11], { stroke: "rs2", sw: 0.5 }),   // snapped antenna
  rect(2, 2, 34, 30, { fill: lin(["mt3", "mt1", "mt0"], 75), r: 7 }),
  clip(rect(2, 2, 34, 30, { fill: "k", r: 7 }),
    ellipse(16, 0, 18, 6, { fill: "lp2", opacity: 0.22, blur: 1.5 }),                                     // lamp on the crown
    rect(0, 0, 3, 36, { fill: "nr2", opacity: 0.35, blur: 1.2 })),                                       // neon rim from the window
  // face plate, cracked
  rect(0, 9, 17, 19, { fill: lin(["mt1", "mt0"], 90), r: 4 }),
  line([4, 9.5, 7, 15, 5.5, 19, 9, 27], { stroke: "#000", sw: 0.45, opacity: 0.8 }),
  // the one working eye, dim; the other socket is dead glass
  circle(7.5, 15.5, 3.6, "#050506"),
  (f) => circle(7.5, 15.5, 1.5, { fill: "nr2", opacity: [0.9, 0.85, 0.8, 0.85, 0.35, 0.9, 0.8, 0.82][f.i % 8], glow: { r: 4, color: "nr1", strength: 2 } }),
  circle(15.5, 15, 2.6, "#08090a"), line([14, 13.6, 17, 16.4], { stroke: "mt2", sw: 0.4 }),
  // jaw grille
  [21, 23.2, 25.4].map((y) => line([2.5, y, 12, y], { stroke: "#000", sw: 0.7, opacity: 0.7 })),
  // ear module + bolts
  circle(26, 17, 5.4, "mt1"), circle(26, 17, 3.6, { stroke: "mt0", sw: 0.8 }), circle(26, 17, 1, "mt3"),
  [[31, 6], [33, 28], [20, 30]].map(([x, y]) => [circle(x, y, 0.8, "mt3"), ellipse(x, y + 3, 0.7, 2.6, { fill: "rs2", opacity: 0.6, blur: 0.5 })]),
  // dents and scratches from a long life
  curve([20, 6, 24, 5.4, 28, 7], { stroke: "#000", sw: 0.4, opacity: 0.5 }),
  ellipse(30, 24, 2.6, 1.6, { fill: "mt0", opacity: 0.6 }))

// Seated, leaning forward over the table, head turned toward the window.
const coatShape = (st) => blob([16, 60, 28, 50, 50, 48, 64, 54, 70, 72, 72, 104, 70, 130, 10, 130, 6, 104, 8, 80], { fill: st, smooth: 0.85 })
anim("_robot", { w: 100, h: 130, frames: 24, fps: 12 },
  coatShape(lin(["ct2", "ct1", "ct0"], 90)),
  clip(coatShape("k"),
    ellipse(40, 48, 28, 9, { fill: "lp1", opacity: 0.4, blur: 2.5 }),                     // lamp on the shoulders
    rect(2, 50, 8, 80, { fill: "nr1", opacity: 0.5, blur: 2 }),                           // red rim from the window
    curve([28, 72, 31, 98, 28, 130], { stroke: "ct0", sw: 1.4 }),                          // folds
    curve([48, 66, 52, 96, 50, 130], { stroke: "ct0", sw: 1.2 }),
    // torn at the shoulder, wiring underneath
    blob([52, 58, 59, 56, 62, 63, 55, 66], "#070707"),
    curve([53, 59.5, 56.5, 63, 60, 60], { stroke: "#7a3f22", sw: 0.8 }),
    curve([54.5, 64.6, 57, 61, 60.5, 63.6], { stroke: "#3c5a62", sw: 0.8 })),
  // popped collar
  poly([24, 54, 30, 33, 40, 51], { fill: lin(["ct3", "ct1"], 90) }),
  poly([44, 50, 54, 31, 60, 55], { fill: lin(["ct2", "ct0"], 90) }),
  // neck: bundled cables, one hanging loose
  rect(34, 36, 13, 15, "mt0"), [37, 41, 45].map((x) => line([x, 36, x + 1, 51], { stroke: "mt2", sw: 1.3 })),
  curve([35, 44, 31, 50, 33, 56], { stroke: "#5a2c1b", sw: 0.7 }),
  stamp("_head", 41, 40, { rot: 9, anchor: [0.62, 0.96] }))

sprite("_table", { w: 150, h: 26 },
  rect(70, 6, 10, 18, { fill: lin(["mt2", "mt0"], 0) }),
  ellipse(75, 24, 26, 2.6, "mt0"),
  ellipse(75, 3, 75, 4.6, { fill: lin(["mt3", "mt2", "mt1"], 90) }),
  rect(0, 3, 150, 4, { fill: lin(["mt1", "mt0"], 90), r: 2 }),
  // decades of coffee rings and scratches
  ellipse(40, 2.6, 7, 1.4, { stroke: "#3a2a1e", sw: 0.5, opacity: 0.6 }),
  ellipse(110, 3.4, 6, 1.2, { stroke: "#3a2a1e", sw: 0.4, opacity: 0.5 }),
  line([20, 2, 34, 3.2], { stroke: "mt4", sw: 0.3, opacity: 0.4 }), line([90, 1.2, 104, 1.8], { stroke: "mt4", sw: 0.3, opacity: 0.4 }))

sprite("_mug", { w: 18, h: 16 },
  path("M1 2H14L13 14.5C13 15.4 12.4 16 11.4 16H3.6C2.6 16 2 15.4 2 14.5Z", { fill: lin(["cup", "cupD"], 0) }),
  ellipse(7.5, 2, 6.5, 1.5, "cupD"), ellipse(7.5, 2.3, 5.6, 1.1, "cof"),
  path("M14 5C18 5 18 11 13.4 11", { stroke: "cupD", sw: 1.6 }),
  poly([2.6, 2.4, 4, 2.4, 3.4, 4], "cupD"),                                              // chipped rim
  line([4, 6, 4.6, 14], { stroke: "#fff", sw: 0.6, opacity: 0.25 }))

// ------------------------------------------------------------------ the woman at the window

// Back to us, palm flat on the cold glass. Short layered dress, laced back, one steel leg.
// Backlit by the street: mostly silhouette, edged in neon red and a little lamp warmth.
const INK = "#09080b", RIM = "nr2"
const SKIN = "#3e3236"
anim("_lady", { w: 60, h: 118, frames: 24, fps: 12 },
  (f) => {
    const br = f.sin(0.35)                       // breathing
    const sway = f.sin(0.7, 0.2)                  // hair settling
    return [
      // the fog her hand leaves on the glass
      ellipse(48, 1, 7.5, 8.5, { fill: "#c8d4d8", opacity: 0.18, blur: 2.2 }),
      // raised arm: bare upper arm, black opera glove from the elbow, palm on the window
      line([41.4, 23 + br, 47, 13], { stroke: SKIN, sw: 3.4 }),
      line([47, 13, 47.6, 4], { stroke: INK, sw: 3 }),
      line([40.6, 23.4 + br, 46, 13.6], { stroke: RIM, sw: 0.5, opacity: 0.6 }),
      rect(45.2, -1.6, 5.6, 6.4, { fill: INK, r: 1.6 }),
      [[45.4, -6.2], [47, -7.4], [48.6, -7], [50.2, -5.4]].map(([x, y]) => rect(x - 0.65, y, 1.3, 6, { fill: INK, r: 0.65 })),
      line([44.6, 1.6, 43.4, -1.4], { stroke: INK, sw: 1.3 }),                          // thumb
      // hanging arm
      line([18.6, 23 + br, 16.6, 38], { stroke: SKIN, sw: 3.2 }),
      line([16.6, 38, 15.8, 53], { stroke: INK, sw: 2.8 }),
      line([18, 23.4 + br, 16, 38], { stroke: RIM, sw: 0.5, opacity: 0.6 }),
      ellipse(15.6, 54.4, 1.6, 2.4, INK),
      // human leg in a dark stocking: thigh, calf, ankle
      blob([20, 64, 28.6, 64, 28.2, 78, 27.2, 88, 26.6, 96, 25.6, 104.5, 22.6, 104.5, 21.8, 96, 21, 88, 20, 78], { fill: "#130f16", smooth: 0.5 }),
      curve([27.6, 70, 27, 84, 26.2, 96, 25.4, 103], { stroke: "#54495a", sw: 0.6, opacity: 0.7 }),
      curve([20.4, 70, 21.2, 86, 22.4, 103], { stroke: RIM, sw: 0.5, opacity: 0.55 }),
      line([20.2, 79, 28.2, 79], { stroke: "#2c2532", sw: 1.1 }),                        // stocking band
      // steel leg: socket, thigh strut + piston, knee, shin plate, ankle
      rect(31.4, 66, 9.4, 8, { fill: lin(["mt2", "mt0"], 90), r: 2 }),
      line([35.8, 73, 36.4, 88.4], { stroke: "mt2", sw: 4.6 }),
      line([38.8, 74, 39.2, 87.6], { stroke: "mt4", sw: 1.1 }),
      line([33.2, 74, 33.6, 87.6], { stroke: "mt3", sw: 0.7 }),
      curve([33.6, 73.6, 32, 80, 34.4, 87.4], { stroke: "#7a2a1e", sw: 0.6 }),          // exposed cable
      circle(36.4, 90, 3.4, "mt1"), circle(36.4, 90, 1.8, "mt3"), circle(36.4, 90, 0.7, "mt4"),
      poly([33, 93, 39.8, 93, 38.8, 104.6, 34.4, 104.6], { fill: lin(["mt3", "mt1"], 0) }),
      line([33.6, 94.4, 34.8, 104], { stroke: RIM, sw: 0.55, opacity: 0.7 }),
      line([39.3, 94.4, 38.5, 104], { stroke: "lp1", sw: 0.5, opacity: 0.5 }),
      [97, 101].map((y) => circle(36.6, y, 0.45, "mt4")),
      circle(36.6, 106, 1.7, "mt2"),
      // platform boots, buckled
      [[20.8, 26.6], [33.6, 39.4]].map(([a, b]) => [
        poly([a, 104, b, 104, b + 0.8, 111, b + 1.4, 115, a - 1.6, 115, a - 0.8, 111], "#050406"),
        rect(a - 1.6, 115, b - a + 3, 2.6, "#141216"),
        [106.4, 109].map((y) => rect(a - 0.2, y, b - a + 0.6, 0.7, { fill: "mt3", opacity: 0.8 }))]),
      // short layered skirt, tulle peeking at the hem
      blob([22, 50, 38, 50, 44, 61, 48, 70.5, 40, 69, 35, 72.5, 30, 69.5, 24.5, 72.5, 19, 69, 12.5, 70.6, 16, 61], { fill: "#1d1022", smooth: 0.35 }),
      blob([22.6, 49.4, 37.4, 49.4, 42.6, 60, 45.6, 68, 39, 66.6, 34, 69.4, 29.6, 66.8, 25, 69.6, 20, 66.6, 14.6, 68.2, 17.4, 60], { fill: INK, smooth: 0.35 }),
      curve([14.6, 68, 18, 61, 22.8, 49.8], { stroke: RIM, sw: 0.6, opacity: 0.6 }),
      // bare shoulders, then the bodice with a low laced back
      blob([17, 23.4 + br, 22, 20.6 + br, 38, 20.6 + br, 43, 23.4 + br, 42.2, 29, 17.8, 29], { fill: SKIN, smooth: 0.6 }),
      blob([18.2, 28, 30, 30.4, 41.8, 28, 41.4, 34, 38.4, 45, 37.2, 51, 22.8, 51, 21.6, 45, 18.6, 34], { fill: INK, smooth: 0.5 }),
      path("M18.4 28.4C22 29.6 26 30.4 30 30.4C34 30.4 38 29.6 41.6 28.4", { stroke: "#4a4250", sw: 0.6 }),   // lace edge
      [36, 39.5, 43, 46.5].map((y) => [line([27.4, y, 32.6, y + 3.2], { stroke: "#615a68", sw: 0.4 }), line([32.6, y, 27.4, y + 3.2], { stroke: "#615a68", sw: 0.4 })]),
      curve([17.4, 24, 18.8, 34, 21.8, 46, 22.8, 50.6], { stroke: RIM, sw: 0.6, opacity: 0.6 }),
      // neck, head turned toward her hand: a sliver of pale cheek, the rest is hair
      rect(27.6, 13, 4.8, 8, SKIN),
      rect(27.2, 15.6, 5.6, 1.4, { fill: "#141016", r: 0.7 }),                          // choker
      ellipse(25.4, 9.6, 2.6, 4.4, { fill: "#85767a" }),
      ellipse(24.7, 9.6, 1.4, 3.8, { fill: "nr3", opacity: 0.35 }),
      blob([24, 3, 30, 0.6, 36, 3, 37.4, 11, 38 + sway * 0.3, 22, 37 + sway, 33, 33, 35.6, 30, 34.4, 27, 35.6, 23 + sway, 33, 22.2, 22, 22.8, 11], { fill: "#060508", smooth: 0.85 }),
      curve([23.4, 4, 22.4, 12, 22.4, 22, 23.4 + sway, 32.6], { stroke: RIM, sw: 0.7, opacity: 0.75 }),
      curve([30.6, 1.4, 34.4, 2.6, 36.6, 7], { stroke: "#3c3540", sw: 0.6, opacity: 0.8 }),   // sheen
    ]
  })

// ------------------------------------------------------------------ storytelling

sprite("_poster", { w: 34, h: 46 },
  poly([0, 2, 34, 0, 33, 30, 26, 34, 30, 46, 2, 45], { fill: "#3a3329" }),
  rect(4, 5, 26, 18, { fill: "nr0", opacity: 0.8 }),
  circle(17, 14, 6, { fill: "#1a0a0c" }), rect(13, 12, 8, 2, { fill: "nr1", opacity: 0.7 }),
  [27, 31, 35].map((y, i) => rect(4, y, [24, 18, 21][i], 1.6, { fill: "#cbbd9c", opacity: 0.3 })),
  poly([26, 34, 33, 30, 34, 42], { fill: "#5a4f40" }),                                // peeled corner
  rect(0, 0, 34, 46, { fill: lin(["#00000000", "#000000aa"], 90) }))

sprite("_clock", { w: 22, h: 22 },
  circle(11, 11, 10, "mt1"), circle(11, 11, 8.4, "#9b9583"),
  [0, 90, 180, 270].map((a) => tf({ x: 11, y: 11, rot: a }, rect(-0.5, -8, 1, 1.8, "#2a2925"))),
  line([11, 11, 6.5, 8], { stroke: "#1b1a17", sw: 1 }), line([11, 11, 9.5, 18], { stroke: "#1b1a17", sw: 0.6 }),   // 3:47, forever
  line([4, 6, 9, 10, 8, 15], { stroke: "#2a2925", sw: 0.35 }),                           // cracked glass
  circle(11, 11, 8.4, { fill: rad(["#ffffff22", "#00000066"], { cx: 0.35, cy: 0.3 }) }))

// The other customer: a person at the bar, hunched over, smoking.
sprite("_patron", { w: 40, h: 70 },
  rect(16, 50, 3, 20, "mt0"), rect(10, 66, 15, 2, "mt0"),                               // stool
  blob([8, 52, 6, 34, 12, 20, 24, 17, 32, 26, 34, 44, 30, 54], { fill: "#0a0b0c", smooth: 0.8 }),
  circle(15, 14, 6.4, "#0a0b0c"),                                                       // head, bowed
  path("M5 13C5 9 10 7 15 7C21 7 25 9 25 12.6L29 13.6C29 14.8 2 14.8 2 13.4Z", "#08090a"),   // hat
  blob([28, 26, 34, 18, 37, 21, 33, 30], { fill: "#0a0b0c", smooth: 0.8 }),              // arm toward the bar
  curve([30, 18, 34, 15.6, 38, 15.8], { stroke: "tg1", sw: 0.8, opacity: 0.6 }),        // rim light from the terminal
  curve([24, 18, 32, 24, 34, 40], { stroke: "tg1", sw: 0.6, opacity: 0.4 }),
  circle(10, 18.6, 0.9, { fill: "#ff7a3a", glow: { r: 3, color: "#ff5a1a", strength: 2 } }))   // cigarette ember

sprite("_ashtray", { w: 18, h: 8 },
  ellipse(9, 4.6, 8.4, 2.8, "mt1"), ellipse(9, 4, 7, 2, "#101112"),
  rect(3.6, 3.8, 3, 0.8, "#55524b"), rect(10, 4.4, 2.4, 0.7, "#55524b"),
  line([10, 3, 16.5, 1.2], { stroke: "#d8d2c4", sw: 1 }),
  circle(16.6, 1.15, 0.6, { fill: "#ff6a2a", glow: { r: 2, color: "#ff4a1a" } }))

sprite("_papercup", { w: 16, h: 8 },
  poly([0, 2, 12, 0.6, 12.6, 7, 1, 7.4], { fill: lin(["#a49c8a", "#6a6457"], 90) }),
  ellipse(13, 3.8, 1.6, 3.2, "#2d2722"),
  ellipse(-2, 7.4, 6, 1, { fill: "cof", opacity: 0.8 }))                                // the spill

// Drops beading on the outside of the glass, sliding down at their own pace.
const drops = (f) => {
  const r = f.rng(91)
  return Array.from({ length: 46 }, () => {
    const x = WIN.x + 2 + r() * (WIN.w - 4), y0 = r() * WIN.h, sp = r() < 0.3 ? 1 : 0, sz = 0.5 + r() * 0.9
    const y = WIN.y + ((y0 + f.t * WIN.h * sp) % WIN.h)
    return [line([x, y - 4 - sz * 6 * sp, x, y], { stroke: "#b9c7cc", sw: sz * 0.5, opacity: 0.15 * sp }),
      ellipse(x, y, sz, sz * 1.3, { fill: rad(["#dfe9ec", "#5a6a70"], { cx: 0.35, cy: 0.3 }), opacity: 0.45 })]
  })
}

// ------------------------------------------------------------------ atmosphere and grade

const smokeCurl = (x, y, f, len, phase, op) => {
  const pts = []
  for (let i = 0; i <= 8; i++) {
    const k = i / 8
    pts.push(x + Math.sin((k * 2.2 + f.t + phase) * Math.PI * 2) * (1 + k * 5) + k * 6, y - k * len)
  }
  return curve(pts, { stroke: "#9aa5aa", sw: 0.8 + 1.6 * op, opacity: 0.18 * op, blur: 0.9 })
}

const GRADE = [
  // smoke from the ashtray and steam off the coffee
  (f) => [0, 0.33, 0.66].map((ph) => smokeCurl(362.6, 188, f, 60, ph, 1)),
  // room haze: slow banks of smoke drifting left
  (f) => [[90, 120, 140], [300, 150, 120], [470, 110, 160], [200, 70, 100]].map(([x, y, rx], i) =>
    ellipse(((x - f.t * 40 * (i % 2 ? 1 : 0.6)) % 560) - 40, y, rx, rx * 0.35, { fill: "#6d7f88", opacity: 0.06, blur: 12 })),
  // dust turning in the lamp beam
  (f) => {
    const r = f.rng(3)
    return clip(poly([306, 82, 324, 82, 380, FLOOR, 250, FLOOR], "k"), Array.from({ length: 30 }, () => {
      const x = 250 + r() * 130, y = 90 + ((r() * 124 + f.t * 12) % 124)
      return circle(x + Math.sin((f.t + r()) * 6.28) * 1.5, y, 0.3 + r() * 0.35, { fill: "lp2", opacity: 0.25 + r() * 0.3 })
    }))
  },
  // the lamp's warm pool on the wet floor
  ellipse(314, FLOOR + 10, 70, 7, { fill: "lp1", opacity: 0.22, blur: 5 }),
  // darkness everywhere the lamp doesn't reach
  rect(0, 0, W, H, { fill: rad([["#00000000", 0], ["#000000", 1]], { cx: 0.62, cy: 0.48, r: 0.68 }), opacity: 0.85 }),
  // red bleeding in from the street, cyan/green from the bar
  rect(0, 0, W, H, { fill: rad([["nr1", 0], ["#00000000", 1]], { cx: 0.28, cy: 0.35, r: 0.55 }), blend: "screen", opacity: 0.22 }),
  rect(0, 0, W, H, { fill: rad([["nc1", 0], ["#00000000", 1]], { cx: 0.92, cy: 0.7, r: 0.45 }), blend: "screen", opacity: 0.2 }),
  // crushed, desaturated mids: a cold teal cast over everything
  rect(0, 0, W, H, { fill: "#1d2a30", blend: "color", opacity: 0.12 }),
  // the lamp falling off across the robot
  rect(0, 0, W, H, { fill: rad([["lp1", 0], ["#00000000", 1]], { cx: 0.64, cy: 0.42, r: 0.24 }), blend: "screen", opacity: 0.28 }),
  // emissive light sources read through the grade
  tf({ blend: "screen", opacity: 0.8 }, stamp("_sign", 150, 44)),
  tf({ blend: "screen", opacity: 0.55 }, ellipse(315, 82.4, 4, 1.4, { fill: "lp2", glow: { r: 7, color: "lp2", strength: 3 } })),
  tf({ blend: "screen", opacity: 0.45 }, (f) => rect(428, COUNTER - 26, 22, 16, { fill: "tg1", opacity: f.i % 7 === 3 ? 0.4 : 0.8, blur: 3 })),
  tf({ blend: "screen", opacity: 0.5 }, rect(WIN.x + 132, WIN.y + 70, 9, 46, { fill: "nr1", blur: 6 }), rect(WIN.x + 40, WIN.y + 96, 46, 14, { fill: "nc1", blur: 7 })),
  // film grain, new every frame
  (f) => rect(0, 0, W, H, { fill: "#000", grain: { freq: 1.4, octaves: 1, seed: 100 + f.i }, blend: "overlay", opacity: 0.45 }),
  // letterbox
  rect(0, 0, W, 15, "#000"), rect(0, H - 15, W, 15, "#000"),
]

anim("cafe_base", { w: W, h: H, frames: 24, fps: 12, bg: "void" },
  stamp("_wall", 0, 0),
  // water stains under the ceiling, cracks, a leaking pipe
  [[60, 40], [190, 30], [300, 54], [420, 36], [462, 70]].map(([x, h]) => ellipse(x, 6 + h / 2, 7, h, { fill: "#05070888", blur: 4 })),
  line([268, 22, 274, 40, 270, 58, 278, 76], { stroke: "c0", sw: 0.6 }),
  line([440, 200, 448, 184, 446, 170], { stroke: "c0", sw: 0.5 }),
  rect(0, 10, W, 5, { fill: lin(["rs1", "rs0"], 90) }),
  [96, 230, 372].map((x) => rect(x - 3, 9, 6, 7, "rs2")),
  (f) => circle(372, 16 + ((f.t * 3) % 1) * 196, 0.7, { fill: "#8fa2a8", opacity: 0.6 }),
  stamp("_poster", 437, 64, { rot: 3, scale: 0.85 }),
  stamp("_clock", 268, 40),
  stamp("_city", WIN.x, WIN.y),
  // rain outside: long thin streaks falling a full loop each cycle
  clip(rect(WIN.x, WIN.y, WIN.w, WIN.h, "void"), (f) => {
    const r = f.rng(7)
    return Array.from({ length: 140 }, () => {
      const x = WIN.x + r() * WIN.w, y0 = r() * WIN.h, len = 6 + r() * 10, sp = 1 + Math.floor(r() * 2)
      const y = WIN.y + ((y0 + f.t * WIN.h * sp) % WIN.h) - 10
      return line([x, y, x - 1.6, y + len], { stroke: "#9fb3bd", sw: 0.35, opacity: 0.12 + r() * 0.18 })
    })
  }),
  drops,
  // grime on the glass
  rect(WIN.x, WIN.y, WIN.w, WIN.h, { fill: lin(["#00000000", "#2a2a22"], 90), opacity: 0.35 }),
  stamp("_frame", WIN.x - 6, WIN.y - 6),
  stamp("_sign", 150, 44),
  // sill and wall under the window
  rect(0, WIN.y + WIN.h + 6, 270, FLOOR - WIN.y - WIN.h - 6, { fill: lin(["c3", "c1"], 90) }),
  rect(8, WIN.y + WIN.h + 6, 254, 3, "c4"),
  stamp("_lady", 92, FLOOR - 117),
  tf({ blur: 1.6, opacity: 0.16 }, stamp("_lady", 92, FLOOR + 1, { anchor: [0, 1], flip: "y" })),   // her reflection in the wet floor
  // back bar
  stamp("_menu", 360, 70),
  rect(300, 118, 180, 3, "mt1"),
  [[306, 12], [314, 16], [322, 10], [334, 14], [346, 11], [452, 15], [462, 12]].map(([x, h]) =>
    rect(x, 118 - h, 5, h, { fill: "#0f1513", opacity: 0.9, r: 1.5 })),
  stamp("_espresso", 334, COUNTER - 34),
  stamp("_terminal", 424, COUNTER - 30),
  stamp("_patron", 390, COUNTER - 54),
  stamp("_counter", 290, COUNTER),
  // floor: wet cracked concrete
  rect(0, FLOOR, W, H - FLOOR, { fill: lin(["c2", "c0", "void"], 90) }),
  line([0, FLOOR, W, FLOOR], { stroke: "c4", sw: 0.8, opacity: 0.6 }),
  // reflections smeared by water
  rect(150, FLOOR + 4, 96, 40, { fill: lin(["nr1", "#00000000"], 90), opacity: 0.35, blur: 4 }),
  rect(40, FLOOR + 4, 50, 30, { fill: lin(["nc1", "#00000000"], 90), opacity: 0.25, blur: 4 }),
  rect(416, FLOOR + 4, 40, 26, { fill: lin(["tg1", "#00000000"], 90), opacity: 0.2, blur: 3 }),
  curve([60, 240, 92, 236, 118, 246, 160, 244], { stroke: "#000", sw: 0.7, opacity: 0.6 }),
  curve([330, 262, 360, 252, 372, 258, 410, 250, 440, 256], { stroke: "#000", sw: 0.7, opacity: 0.6 }),
  // the one warm light in the room
  stamp("_lamp", 300, 0),
  stamp("_robot", 264, TABLE_Y - 106),
  stamp("_table", 230, TABLE_Y),
  // far hand, resting flat and still
  rect(272, 186, 13, 6, { fill: lin(["mt3", "mt1"], 90), r: 2.5 }), [274, 277.5, 281].map((x) => rect(x, 190, 2.4, 3.4, { fill: "mt2", r: 1 })),
  stamp("_ashtray", 346, TABLE_Y - 6),
  stamp("_papercup", 248, TABLE_Y - 7, { rot: -4 }),
  poly([352, 194, 362, 193, 364, 196, 354, 197], { fill: "#bfb6a0", opacity: 0.7 }),   // crumpled receipt
  poly([306, 82, 324, 82, 380, FLOOR, 250, FLOOR], { fill: lin(["lp2", "#00000000"], 90), opacity: 0.12, blur: 3 }),
  // foreground, out of focus: someone else's abandoned table
  tf({ blur: 3, opacity: 0.85 },
    ellipse(40, 252, 74, 8, { fill: lin(["mt1", "mt0"], 90) }),
    rect(-34, 252, 148, 5, "mt0"),
    tf({ x: 52, y: 230, scale: 1.6 }, stamp("_mug", 0, 0)),
    tf({ x: 8, y: 240, scale: 1.5 }, stamp("_papercup", 0, 0)),
    rect(-40, 220, 200, 50, { fill: "#05060a", opacity: 0.55 })))

anim("_grade", { w: W, h: H, frames: 24, fps: 12 }, ...GRADE)

// ------------------------------------------------------------------ the arm, rigged

// Shoulder -> elbow -> hand -> cup. Bones rotate about their pivots (scene coordinates);
// the cup bone counter-rotates so the coffee stays level until he tilts it to drink.
const SHOULDER = [326, 146], ELBOW = [334, 187], HAND = [306, 187]
const beat = (f) => ({ ...f, i: f.i % 24, n: 24, t: (f.i % 24) / 24 })   // the scene's 2 s cycle inside longer clips
const ARM = rig({
  upper: { pivot: SHOULDER, z: 0, items: [
    line([326, 146, 334, 186], { stroke: "ct1", sw: 13 }),
    line([330, 150, 337, 184], { stroke: "ct0", sw: 4, opacity: 0.8 }),
    curve([322, 146, 328, 166, 331, 184], { stroke: "lp1", sw: 2.4, opacity: 0.3 })] },
  fore: { parent: "upper", pivot: ELBOW, z: 2, items: [
    line([334, 187, 312, 188], { stroke: "ct1", sw: 10 }),
    line([334, 191, 313, 192], { stroke: "ct0", sw: 2.4, opacity: 0.8 }),
    line([318, 183, 318, 193], { stroke: "ct0", sw: 1, opacity: 0.8 }),                 // cuff
    rect(304, 183, 9, 8, { fill: lin(["mt3", "mt1"], 90), r: 3 })] },
  // the fingers wrap the mug, so they live on the cup bone and stay level with it
  cup: { parent: "fore", pivot: HAND, z: 3, items: [
    stamp("_mug", 292, TABLE_Y - 14),
    [184.5, 187.4, 190.3].map((y) => rect(298, y, 8, 2.2, { fill: lin(["mt2", "mt3"], 0), r: 1.1 })),
    (f) => [0, 0.5].map((ph) => smokeCurl(299, 180, beat(f), 22, ph, 0.6))] },
})

// 10 s at 12 fps: rest, a slow lift, a long sip, lower, rest. Keys ease in and out by default.
const SIP = {
  // elbow up and forward (75°), forearm folds (27°): the hand ends just under the jaw grille
  upper: { rot: [[0, 0], [20, 0], [50, 75], [80, 75], [104, 0], [120, 0]] },
  fore: { rot: [[0, 0], [20, 0], [50, 27], [58, 31], [72, 31], [80, 27], [104, 0], [120, 0]] },
  // counter-rotate by upper + fore to stay level, then tip the rim toward his face to drink
  cup: { rot: [[0, 0], [20, 0], [50, -102], [58, -126], [72, -126], [80, -102], [104, 0], [120, 0]] },
}

anim("cafe", { w: W, h: H, frames: 24, fps: 12 }, stamp("cafe_base", 0, 0), pose(ARM), stamp("_grade", 0, 0))

// The long take: the room keeps its own 2 s rhythm (rain, flicker, grain) while he drinks.
anim("last_cup_sip", { w: W, h: H, frames: 120, fps: 12 },
  (f) => stamp("cafe_base", 0, 0, { frame: f.i % 24 }),
  pose(ARM, SIP),
  (f) => stamp("_grade", 0, 0, { frame: f.i % 24 }))

// The film still: one frame of the loop, 4x = 1920x1080.
scene("last_cup", { w: W, h: H, scale: 4 }, stamp("cafe", 0, 0, { frame: 0 }))
