// Spearman: a hand-drawn, hand-painted warrior built as a rig, so the core pose and every
// animation come from the same bones. Units follow the reference art (150 x 395).
pal({
  k: "#140b07",
  sk0: "#56220f", sk1: "#a0502f", sk2: "#d38959", sk3: "#f3c096",
  h0: "#150b06", h1: "#331d0e", h2: "#5c361b", h3: "#8f5d35",
  t0: "#09151a", t1: "#142c33", t2: "#23474f", t3: "#46767c",
  l0: "#1c0f09", l1: "#422314", l2: "#733f22", l3: "#b0733f",
  b0: "#0f0b09", b1: "#211a16", b2: "#3a2e26", b3: "#5e4a3a",
  s0: "#1f1f25", s1: "#4a4b53", s2: "#8f919a", s3: "#e6e7ec",
  g: "#d4a865", c1: "#225e72", c2: "#56a0b5", w: "#e2cfbb",
  ru: "#7b3a17", ru2: "#b3622a",
})
ramps("sk0 sk1 sk2 sk3", "h0 h1 h2 h3", "t0 t1 t2 t3", "l0 l1 l2 l3", "b0 b1 b2 b3", "s0 s1 s2 s3", "k c1 c2")

const LIGHT = 315
const ink = (w = 1.6, extra = {}) => ({ c: "k", w: w * 0.85, light: LIGHT, wobble: w * 0.2, ...extra })
const lit = (extra = {}) => ({ light: LIGHT, brush: 0.4, depth: 0.45, ...extra })
// painted shape: fill + ink + shading from the one light
const paint = (fill, w = 1.6, sh = {}, extra = {}) => ({ fill, ink: ink(w), shade: lit(sh), ...extra })
const stroke = (w, extra = {}) => ({ ink: ink(w, { taper: 0.5, ...extra }) })
const crease = (pts, c = "sk1", w = 0.7) => curve(pts, stroke(w, { c }))
// a soft painted glaze: light or shadow laid over a form, blurred like wet paint
const glaze = (pts, fill, opacity = 0.5, blur = 1.2) => blob(pts, { fill, opacity, blur })
const strand = (pts, c, w = 0.6) => curve(pts, stroke(w, { c, wobble: 0.15 }))
const stitch = (pts, c = "l3") => line(pts, { stroke: c, sw: 0.45, dash: [1, 1.2], opacity: 0.7 })

// The body is drawn for the viewer-left side; the other side mirrors it about AX.
const AX = 74.5
const M = (s, pts) => (s > 0 ? pts : pts.map((v, i) => (i % 2 ? v : 2 * AX - v)))
const X = (s, x) => (s > 0 ? x : 2 * AX - x)
const rivet = (x, y, r = 1.1) => circle(x, y, r, { fill: "g", shade: lit({ hi: "#fff3d0", brush: 0 }), ink: ink(0.5, { wobble: 0 }) })
// rust bleeding out of a rivet or a seam
const rust = (x, y, r = 2, seed = 1) => {
  const q = rng(seed)
  return [ellipse(x + (q() - 0.5) * r, y + r * 0.4, r, r * 0.7, { fill: "ru", opacity: 0.45, blur: r * 0.35 }),
    ellipse(x + (q() - 0.5) * r, y + r * 0.2, r * 0.45, r * 0.35, { fill: "ru2", opacity: 0.5, blur: 0.3 })]
}
// grime and wear: seeded specks, scuffs and scratches clipped to a surface (given as point lists)
const grit = (polys, amount = 1, seed = 1, smooth = 1, scratch = 0.22, len = 6) => {
  const xs = polys.flatMap((p) => p.filter((_, i) => i % 2 === 0)), ys = polys.flatMap((p) => p.filter((_, i) => i % 2))
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const r = rng(seed), marks = []
  for (let i = Math.round((x1 - x0) * (y1 - y0) * 0.1 * amount); i > 0; i--) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), light = r() < 0.3
    const c = light ? "#fff4e0" : "k", o = (light ? 0.22 : 0.3) * (0.4 + r() * 0.6)
    if (r() < scratch) marks.push(line([x, y, x + (r() - 0.5) * len, y + (r() - 0.5) * len * 0.4], { stroke: c, sw: 0.25 + r() * 0.3, opacity: o * 1.3 }))
    else { const d = 0.25 + r() ** 2 * 1.2; marks.push(ellipse(x, y, d, d * (0.5 + r() * 0.5), { fill: c, opacity: o })) }
  }
  return clip(polys.map((p) => blob(p, { fill: "#000", smooth })), marks)
}
// a steel plate: dark body, light top edge, a dent or two, grime
const PLATE = 0.3
const plate = (pts, seed, fill = "s1") => [
  blob(pts, paint(fill, 1.4, { hi: "s3", rim: "s2", depth: 0.42, brush: 0.55 }, { smooth: PLATE })),
  clip(blob(pts, { fill: "#000", smooth: PLATE }),
    curve(pts.slice(0, 6).map((v, i) => (i % 2 ? v + 1.1 : v)), { stroke: "s3", sw: 0.9, opacity: 0.85 }),
    grit([pts], 0.7, seed, PLATE, 0.8, 9)),
]

// ---------- parts ----------

const spear = () => [
  line([36, 44, 57, 126], { stroke: "l1", sw: 4.4 }),
  line([36, 44, 57, 126], { ink: ink(1.1, { taper: 0 }) }),
  line([35.6, 48, 55.6, 124], { stroke: "l3", sw: 0.8, opacity: 0.55 }),
  // cord wrap
  poly([33, 49, 41.5, 46.5, 47, 67, 38.5, 70], paint("c1", 1, { hi: "c2" })),
  [51, 55, 59, 63, 67].map((y) => line([33.5 + (y - 49) * 0.25, y + 1, 40.5 + (y - 49) * 0.25, y - 1], { stroke: "t0", sw: 0.6, opacity: 0.8 })),
  // socket ring and blade
  poly([31, 37, 39.5, 35.5, 41.5, 47, 33.5, 49], paint("s1", 1, { hi: "s3" })),
  rect(30, 39.5, 11, 2.2, { fill: "s3", opacity: 0.5 }),
  rust(37, 44, 1.8, 3),
  poly([30.5, 0, 35, 10, 39, 18, 43, 27, 40, 33, 36, 36, 31, 37, 27.5, 31, 26.5, 22, 27.5, 10], paint("s2", 1.3, { hi: "s3", depth: 0.5 })),
  line([30.5, 2, 34, 35], { ink: { c: "s0", w: 0.8, taper: 0.35, wobble: 0.1 } }),
  line([29.5, 6, 29.5, 30], { stroke: "s3", sw: 0.7, opacity: 0.8 }),
]

const thigh = (s) => {
  // outer contour bulges at the quads, pinches at the knee, swells again into the calf
  const leg = M(s, [30, 246, 57, 246, 59, 258, 59, 270, 55, 281, 54, 292, 26, 292, 28, 282, 31, 272, 27, 262])
  return [
    blob(leg, paint("sk2", 1.7, { rim: "sk3", depth: 0.4 }, { smooth: 0.8 })),
    clip(blob(leg, { fill: "#000" }),
      glaze(M(s, [33, 248, 46, 248, 44, 262, 35, 264]), "sk3", 0.45),
      // vastus medialis teardrop: lit, with a shadow wrapping under it
      glaze(M(s, [49, 258, 57, 260, 58, 272, 52, 276, 48, 268]), "sk3", 0.5, 1),
      glaze(M(s, [47, 274, 56, 276, 54, 284, 46, 282]), "sk0", 0.55),
      // kneecap: a lit dome with a shadow pocket beneath
      glaze(M(s, [36, 270, 43, 267, 47, 273, 44, 279, 37, 278]), "sk3", 0.5, 0.9),
      glaze(M(s, [34, 280, 46, 280, 46, 287, 34, 286]), "sk0", 0.45),
      glaze(M(s, [26, 252, 32, 252, 33, 270, 27, 268]), "sk0", 0.45),
      glaze(M(s, [28, 284, 52, 284, 52, 292, 28, 292]), "sk0", 0.5),
      grit([leg], 0.12, s > 0 ? 15 : 16, 0.8, 0)),
    crease(M(s, [32, 262, 35, 272]), "sk0", 0.7),
    crease(M(s, [36, 279, 41, 281, 46, 279]), "sk0", 0.7),
    crease(M(s, [48, 266, 50, 274, 47, 278]), "sk1", 0.6),
  ]
}

const BOOT = [20, 296, 53, 296, 51, 318, 42, 338, 37, 356, 38, 371, 12, 373, 13, 360, 17, 340, 17, 318]
// the middle of the boot at height y: the shaft leans out toward the foot
const bootMid = (y) => 35 - (y - 300) * 0.16
const boot = (s) => [
  // sole
  poly(M(s, [-1, 385, 37, 382, 38.5, 388, 0, 391]), paint("l0", 1.2)),
  // the bare foot: toes facing us, big toe on the inside
  blob(M(s, [3, 377, 10, 371, 27, 369, 36, 372, 38, 381, 30, 385, 5, 386, 0.5, 382]), paint("sk2", 1.3, { depth: 0.45 })),
  [[2.5, 3.2], [6, 3.4], [9.8, 3.6], [13.8, 4], [18.6, 5.2]].map(([x, w], i) => [
    blob(M(s, [x, 380.5 - i * 0.3, x + w, 380.5 - i * 0.3, x + w + 0.1, 385, x + w / 2, 386.2, x - 0.1, 385]), paint("sk2", 0.55, { depth: 0.5, brush: 0 })),
    ellipse(X(s, x + w / 2), 383.6, w * 0.28, 0.7, { fill: "sk3", opacity: 0.55 }),
  ]),
  // boot shaft: dark leather, narrowing at the ankle
  blob(M(s, BOOT), paint("b1", 2, { rim: "b3", depth: 0.42 }, { smooth: 0.7 })),
  clip(blob(M(s, BOOT), { fill: "#000", smooth: 0.7 }),
    // teal cloth showing between the straps
    [[324, 330], [338, 344], [352, 358]].map(([a, b]) => poly(M(s, [10, a, 60, a - 1, 60, b, 10, b + 1]), { fill: "t1", opacity: 0.7 })),
    // criss-cross straps with a stud where they cross
    [320, 334, 348, 362].map((y) => [
      poly(M(s, [12, y - 2, 60, y + 8, 60, y + 11, 12, y + 1]), paint("l1", 0.8, { hi: "l3", depth: 0.5 })),
      poly(M(s, [12, y + 8, 60, y - 2, 60, y + 1, 12, y + 11]), paint("l2", 0.8, { hi: "l3", depth: 0.5 })),
      circle(X(s, bootMid(y + 5)), y + 4.6, 1.3, { fill: "l3", ink: ink(0.4, { wobble: 0 }) }),
    ]),
    glaze(M(s, [44, 300, 58, 300, 44, 376, 34, 376]), "k", 0.5),
    grit([M(s, BOOT)], 1.2, s > 0 ? 11 : 12, 0.7)),
  // sandal straps over the foot: one across the instep, one round the toes
  poly(M(s, [4, 375, 37, 370, 38, 374, 5, 379]), paint("l1", 0.8, { hi: "l3" })),
  poly(M(s, [2, 379.5, 24, 377, 24.5, 379.6, 2.5, 382]), paint("l2", 0.7, { hi: "l3" })),
  rect(X(s, s > 0 ? 28 : 33), 370.2, 5, 4, { fill: "none", stroke: "g", sw: 0.8, r: 1 }),
  // teal cuff, folded cloth
  blob(M(s, [21, 289, 55, 289, 56, 301, 38, 303, 20, 301]), paint("t2", 1.5, { rim: "t3" }, { smooth: 0.6 })),
  [[27, 290, 25, 301], [36, 290, 35, 302], [46, 290, 48, 301]].map(([a, b, c, d]) => crease(M(s, [a, b, (a + c) / 2 + 1, (b + d) / 2, c, d]), "t0", 0.6)),
  // shin plate on a leather band
  poly(M(s, [17, 304, 52, 303, 51, 314, 17, 316]), paint("l1", 1, { rim: "l2" })),
  stitch(M(s, [39, 305.5, 50, 305]), "l3"),
  plate(M(s, [18, 302, 38, 301, 38.5, 318, 19, 319]), s > 0 ? 21 : 22, "s2"),
  rust(X(s, 22.5), 306, 1.6, 4), rust(X(s, 35), 315.5, 1.8, 5),
  rivet(X(s, 22.5), 305), rivet(X(s, 35), 305), rivet(X(s, 22.5), 315.5), rivet(X(s, 35), 315.5),
  circle(X(s, 44), 326, 2.2, { fill: "none", stroke: "g", sw: 0.9 }),
]

// pteruges: [top x, top y, bottom x, bottom y, width]; wide, overlapping, fanning out
const PANELS = [[38, 179, 25, 244, 15], [46, 180, 39, 251, 15], [55, 181, 51, 255, 15], [87.5, 181, 91, 255, 15], [96, 180, 101, 251, 15], [104, 179, 115, 244, 15]]
const panelPts = ([x0, y0, x1, y1, w]) => [x0, y0, x0 + w, y0, x1 + w, y1 - 7, x1 + w / 2, y1, x1, y1 - 7]
const panel = ([x0, y0, x1, y1, w], i) => [
  poly(panelPts([x0, y0, x1, y1, w]), { ...paint("l2", 1.4), shade: lit({ hi: "l3", depth: 0.25 }) }),
  poly([x0 + 2, y0, x0 + w - 2, y0, x1 + w - 2, y1 - 8, x1 + w / 2, y1 - 3.5, x1 + 2, y1 - 8], { fill: "t1", shade: lit({ rim: "t2", depth: 0.55, brush: 0.6 }) }),
  // stitching along both leather edges, worn spots where the dye has rubbed off
  stitch([x0 + 2.8, y0 + 3, x1 + 2.8, y1 - 9]), stitch([x0 + w - 2.8, y0 + 3, x1 + w - 2.8, y1 - 9]),
  glaze([x1 + 4, y1 - 22, x1 + 9, y1 - 24, x1 + 8, y1 - 16], "l2", 0.45, 0.8),
  glaze([x0 + w - 6, y0 + 12 + i * 3, x0 + w - 3, y0 + 14 + i * 3, x0 + w - 4, y0 + 22 + i * 3], "l1", 0.4, 0.8),
  rivet(x1 + w / 2, y1 - 9.5, 1.6),
]
const UNDERSKIRT = [33, 230, 77.5, 236, 122, 230, 124, 252, 117, 262, 110, 256, 104, 270, 96, 260, 88, 272, 80, 262, 70, 272, 62, 260, 54, 270, 46, 258, 38, 264, 31, 250]
const pelvis = () => [
  // dark ragged underskirt with loose threads
  blob(UNDERSKIRT, paint("t0", 1.2, { brush: 0.5 }, { smooth: 0.35 })),
  [[50, 262, 49, 268], [66, 262, 67, 270], [92, 262, 91, 268], [108, 258, 109, 263]].map(([a, b, c, d]) => line([a, b, c, d], { stroke: "t1", sw: 0.4 })),
  // outer panels first so the inner ones overlap them
  [0, 5, 1, 4, 2, 3].map((i) => panel(PANELS[i], i)),
  // long front panel
  poly([67, 180, 88, 180, 86.5, 280, 77.5, 292, 68.5, 280], paint("l2", 1.5)),
  poly([69.5, 180, 85.5, 180, 84.5, 278, 77.5, 288, 70.5, 278], { fill: "t1", shade: lit({ rim: "t3", depth: 0.45, brush: 0.6 }) }),
  stitch([70.5, 184, 71.4, 276]), stitch([84.5, 184, 83.6, 276]),
  glaze([73, 230, 78, 228, 77, 240], "l2", 0.4, 0.8),
  line([77.5, 184, 77.5, 284], { stroke: "t0", sw: 0.6, opacity: 0.6 }),
  grit([UNDERSKIRT, ...PANELS.map(panelPts), [67, 180, 88, 180, 86.5, 280, 77.5, 292, 68.5, 280]], 1, 5, 0.1),
  [204, 230, 256].map((y) => rivet(77.5, y, 1.3)),
]
// two belts: a level one with the main buckle, and a lower one slung diagonally
const belts = () => [
  poly([39, 175, 77.5, 182, 117, 190, 116.5, 200, 77.5, 192, 38.5, 185], paint("l1", 1.3, { rim: "l2" })),
  stitch([40, 177.5, 77.5, 184.6, 115, 192.4], "l2"),
  [[46, 182], [58, 185], [101, 191], [110, 193]].map(([x, y]) => rivet(x, y, 0.9)),
  poly([38, 164, 77.5, 169, 117, 165, 118, 176, 77.5, 180, 38, 176], paint("l2", 1.6, { hi: "l3" })),
  stitch([40, 166.5, 77.5, 171.4, 115, 167.5]), stitch([40, 173.8, 77.5, 177.6, 115, 173.8]),
  glaze([50, 167, 60, 168, 58, 173, 50, 172], "l3", 0.35, 0.8),
  // buckles
  rect(71, 165.5, 12, 12, { fill: "none", stroke: "s2", sw: 2.2, r: 2.2 }),
  rect(71, 165.5, 12, 12, { fill: "none", ink: ink(0.7, { wobble: 0 }), r: 2.2 }),
  line([76.5, 167, 76.5, 176], { stroke: "s3", sw: 1 }),
  rust(72, 176, 1.4, 6),
  tf({ rot: 11, origin: [95, 191] }, rect(91, 186.5, 9, 9, { fill: "none", stroke: "s2", sw: 1.6, r: 1.6 }), rect(91, 186.5, 9, 9, { fill: "none", ink: ink(0.55, { wobble: 0 }), r: 1.6 })),
  // hanging strap end
  poly([98, 194, 103, 195, 103.5, 222, 100, 226, 97.5, 221], paint("l1", 1)),
  stitch([99.2, 197, 99.6, 219]),
  rivet(100.5, 216, 1),
]

const CHEST = [50, 100, 64, 104, 77.5, 106, 91, 104, 105, 100, 107, 118, 104, 140, 102, 161, 77.5, 165, 53, 161, 51, 140, 48, 118]
// tunic: broad chest tapering to the waist
const TUNIC = [44, 88, 77.5, 94, 111, 88, 119, 116, 115, 140, 111, 160, 110, 172, 77.5, 178, 45, 172, 44, 160, 40, 140, 36, 116]
const torso = () => [
  // tunic, with the back of the tunic showing between arm and body
  blob(TUNIC, paint("t1", 2, { rim: "t2", depth: 0.4 }, { smooth: 0.8 })),
  grit([TUNIC], 1, 3, 0.8),
  crease([42, 140, 46, 160, 44, 170], "t0", 0.9), crease([113, 140, 109, 160, 111, 170], "t0", 0.9),
  // chainmail: interlinked rings over dark gaps, each ring lit on its top-left
  clip(blob(CHEST, { fill: "#000" }),
    rect(44, 96, 68, 76, { fill: "k" }),
    () => {
      const q = rng(31), rings = []
      for (let r = 0, y = 98; y < 168; r++, y += 2.9)
        for (let x = 45 + (r % 2) * 1.9; x < 110; x += 3.8) {
          const jx = (q() - 0.5) * 0.5, jy = (q() - 0.5) * 0.5
          rings.push(ellipse(x + jx, y + jy, 1.75, 1.45, { stroke: "s1", sw: 1 }))
          rings.push(arc(x + jx, y + jy, 1.7, 280, 20, { stroke: "s3", sw: 0.55, opacity: 0.55 + q() * 0.4 }))
        }
      return rings
    },
    // pecs catching the light, shadow to the far side and below
    glaze([54, 107, 75, 108, 76, 125, 64, 130, 53, 123], "#ffffff", 0.2, 2),
    glaze([80, 109, 99, 107, 100, 123, 91, 129, 80, 125], "#ffffff", 0.1, 2),
    rect(44, 96, 68, 76, { fill: lin([["#00000000", 0.5], ["#000000b0", 1]], 0) }),
    rect(44, 96, 68, 76, { fill: lin([["#00000000", 0.5], ["#000000aa", 1]], 90) }),
    glaze([60, 136, 70, 134, 72, 150, 62, 150], "ru", 0.15, 1.5),
    crease([56, 127, 66, 132, 76, 128], "k", 1.2), crease([79, 128, 89, 132, 99, 127], "k", 1.2),
  ),
  blob(CHEST, { ink: ink(1.2) }),
  // shoulder straps and chest strap, stitched, with rivets
  poly([45, 91, 53, 89, 57, 168, 50, 168], paint("l2", 1.2, { hi: "l3" })),
  poly([110, 91, 102, 89, 98, 168, 105, 168], paint("l2", 1.2, { hi: "l3" })),
  stitch([47.5, 93, 51.6, 166]), stitch([107.5, 93, 103.4, 166]),
  poly([50, 99, 105, 99, 105, 105, 50, 105], paint("l1", 1.1, { rim: "l2" })),
  [[53.5, 114], [54.5, 134], [55.5, 154], [101.5, 114], [100.5, 134], [99.5, 154], [64, 102], [91, 102]].map(([x, y]) => rivet(x, y)),
]

// the neck stays under the head, which is turned slightly to the viewer's left
const neck = () => [
  blob([66, 70, 90, 70, 96, 80, 77.5, 90, 59, 80], paint("sk2", 1.4, { depth: 0.5 })),
  glaze([67, 72, 74, 72, 76, 86, 68, 82], "sk0", 0.45),
  crease([84, 74, 86, 82], "sk1", 0.6),
  blob([52, 77, 64, 78, 77.5, 87, 91, 78, 103, 77, 108, 88, 98, 100, 77.5, 105, 57, 100, 47, 88], paint("t2", 1.7, { rim: "t3", depth: 0.5 }, { smooth: 0.7 })),
  [[56, 86, 62, 96], [97, 86, 92, 97]].map(([a, b, c, d]) => crease([a, b, (a + c) / 2 + 1, (b + d) / 2, c, d], "t0", 0.6)),
  blob([64, 78, 77.5, 87, 91, 78, 88, 86, 77.5, 96, 67, 86], paint("sk2", 0.9, { depth: 0.55 })),
  glaze([70, 84, 77, 90, 76, 94, 70, 89], "sk0", 0.35),
  crease([72, 89, 77.5, 93, 83, 89], "sk1", 0.8),
  curve([62, 85, 77.5, 99, 93, 85], { ink: ink(1.4, { taper: 0.1 }) }),
]

// face turned slightly to the viewer's left: nose and mouth sit left of centre, the far cheek is broad
const FACE = [68, 43, 80, 38, 93, 41, 97, 49, 97.5, 58, 95.5, 68, 90, 77, 83, 82, 77, 80, 72, 74, 69, 64, 67, 54]
const head = () => [
  // hair mass behind the face
  blob([62, 58, 60, 42, 64, 31, 76, 25, 92, 25, 99, 33, 100, 46, 98, 54, 94, 44, 70, 44], paint("h1", 1.1, { rim: "h2", depth: 0.4 })),
  // ear
  blob([62, 50, 67, 48, 69, 61, 65, 65, 61, 59], paint("sk2", 1, { depth: 0.5 })),
  crease([64, 53, 63.4, 58, 65, 62], "sk0", 0.6),
  // face, painted in planes
  blob(FACE, paint("sk2", 1.6, { depth: 0.38, rim: "sk3", brush: 0.3 })),
  clip(blob(FACE, { fill: "#000" }),
    // sockets, under the cheekbone, the shadow side of the nose
    glaze([71, 50, 79, 49, 80, 56, 72, 57], "sk0", 0.5, 1.1),
    glaze([85, 49, 93, 48.5, 93, 56, 85, 56], "sk0", 0.4, 1.1),
    glaze([68, 58, 74, 59, 75, 68, 70, 68], "sk0", 0.5, 1.4),
    glaze([90, 61, 96, 59, 96, 68, 91, 68], "sk1", 0.45, 1.2),
    glaze([77.4, 52, 80.4, 52, 80, 63, 77, 62], "sk0", 0.45, 0.7),
    // lit planes: forehead, cheekbones, nose ridge
    glaze([80, 39.5, 92, 41.5, 90, 46, 81, 46], "sk3", 0.55),
    glaze([86, 56.5, 93, 56, 93.5, 60.5, 87, 61], "sk3", 0.5, 0.9),
    glaze([73, 57, 77, 57, 76.5, 60, 73, 60], "sk3", 0.3, 0.8),
  ),
  // brows: tapered, drawn down toward the nose in a frown, a furrow between
  curve([70.5, 49.6, 74, 47.6, 79.8, 48.8], { ink: ink(1.9, { c: "h0", taper: 0.35 }) }),
  curve([84.5, 48.8, 89.5, 47.2, 95.5, 48.6], { ink: ink(1.9, { c: "h0", taper: 0.35 }) }),
  crease([81.6, 47.6, 81.8, 50.6], "sk0", 0.5),
  // eyes: small and shadowed, glancing to the viewer's left
  blob([73.4, 53.5, 75.8, 52.3, 78.6, 53.3, 76, 54.5], { fill: "#c7ad96", smooth: 0.6 }),
  circle(75.3, 53.4, 0.95, "#3d2414"), circle(75.3, 53.4, 0.45, "k"), circle(75, 53, 0.25, "#ffffff"),
  blob([86.6, 53.3, 89.3, 52.1, 92.2, 53.3, 89.4, 54.4], { fill: "#c7ad96", smooth: 0.6 }),
  circle(88.5, 53.3, 0.95, "#3d2414"), circle(88.5, 53.3, 0.45, "k"), circle(88.2, 52.9, 0.25, "#ffffff"),
  curve([73, 53.6, 75.8, 52, 79, 53.2], stroke(0.9, { c: "k", taper: 0.25 })),
  curve([86.3, 53.2, 89.3, 51.8, 92.6, 53.4], stroke(0.9, { c: "k", taper: 0.25 })),
  crease([73.8, 55.6, 76.2, 56.2, 78.4, 55.4], "sk1", 0.45),
  crease([87.2, 55.4, 89.6, 56.2, 92, 55.6], "sk1", 0.45),
  // nose: long ridge, a lit tip, nostril wings
  line([81.8, 52.5, 82, 61], { stroke: "sk3", sw: 0.8, opacity: 0.7 }),
  curve([80.6, 51.5, 80.2, 58, 79.2, 62.4], stroke(0.8, { c: "sk0", taper: 0.3 })),
  circle(81.6, 62.6, 1.1, { fill: "sk3", opacity: 0.5, blur: 0.4 }),
  crease([78.2, 62.6, 79, 64.6, 81, 65.2], "sk0", 0.75), crease([83.4, 65, 85.4, 63.6], "sk0", 0.65),
  // beard: trimmed close along the jaw, fuller and darker at the chin
  blob([68, 58, 70, 66, 75, 68.6, 80, 67.2, 86, 68, 92, 66, 96.6, 60, 96, 70, 92, 78, 86, 84, 80, 86.5, 74, 82.5, 70, 75], paint("h1", 1.4, { rim: "h2", brush: 0.7 }, { smooth: 0.8 })),
  clip(blob([68, 58, 70, 66, 75, 68.6, 80, 67.2, 86, 68, 92, 66, 96.6, 60, 96, 70, 92, 78, 86, 84, 80, 86.5, 74, 82.5, 70, 75], { fill: "#000", smooth: 0.8 }),
    // stubble fading into the cheeks
    glaze([68, 56, 72, 58, 71, 66, 68, 64], "sk1", 0.4, 1),
    glaze([93, 58, 97, 57, 96, 64, 92, 64], "sk1", 0.35, 1),
    glaze([74, 79, 88, 80, 90, 77, 85, 88, 76, 88], "h0", 0.6, 1)),
  [[69.5, 62, 70.5, 69, 72.5, 75], [72.5, 69, 73.5, 75, 76, 80.5], [76.5, 73, 77.5, 79, 79.5, 84.5], [81, 75, 81.5, 80, 81, 85.5], [85, 75, 85.5, 80, 84.5, 84.5],
    [88.5, 72, 89, 77, 87.5, 81.5], [92, 67, 93, 71, 92, 75.5], [95, 62, 95.8, 66, 95.2, 70]].map(([a, b, c, d, e, f]) => strand([a, b, c, d, e, f], "h3", 0.5)),
  [[71, 66, 72, 72], [75, 74, 76, 80], [79, 77, 79.5, 83], [86, 76, 86, 81], [90, 69, 90.4, 75]].map(([a, b, c, d]) => strand([a, b, (a + c) / 2 + 0.3, (b + d) / 2, c, d], "h0", 0.5)),
  // mustache and lower lip
  blob([74.5, 68, 80, 66, 82.5, 67, 85, 66, 90.5, 68.6, 89, 70.4, 84.5, 68.9, 82.5, 69.7, 80.5, 68.9, 76, 70.6], paint("h1", 0.8, { brush: 0.6 })),
  strand([76.5, 68.6, 79.5, 67.3, 82, 67.6], "h3", 0.45), strand([83.5, 67.6, 86.5, 67.3, 89.5, 68.6], "h3", 0.45),
  blob([78.5, 72.4, 86, 72.4, 85, 74.3, 79.5, 74.3], { fill: "#7a3a2a", smooth: 0.8 }),
  line([80.5, 72.9, 84, 72.9], { stroke: "#b8705a", sw: 0.4, opacity: 0.7 }),
  curve([78, 72.2, 82, 72.8, 87, 72.2], { ink: ink(0.9, { c: "#24090a", taper: 0.4 }) }),
  // swept-back hair: volume on top, tufts, painted locks
  blob([61, 50, 59.5, 41, 61.5, 35, 60.5, 31, 64.5, 30, 66, 26, 70, 26, 73, 22.5, 77, 24, 81, 21.5, 85, 23, 88, 20.5, 91, 23, 95, 23, 97, 26.5, 100, 28, 99.5, 32, 101.5, 36, 100.5, 39, 101, 44, 99.5, 46,
    97, 41, 92, 39.5, 86, 41.5, 80, 39.5, 74, 42, 70, 45, 67, 50, 66, 57, 62.5, 55],
    paint("h2", 1.1, { hi: "h3", rim: "h3", depth: 0.55, brush: 0.7 }, { smooth: 0.55 })),
  clip(blob([61, 50, 59.5, 41, 61.5, 35, 60.5, 31, 64.5, 30, 66, 26, 70, 26, 73, 22.5, 77, 24, 81, 21.5, 85, 23, 88, 20.5, 91, 23, 95, 23, 97, 26.5, 100, 28, 99.5, 32, 101.5, 36, 100.5, 39, 101, 44, 99.5, 46,
    97, 41, 92, 39.5, 86, 41.5, 80, 39.5, 74, 42, 70, 45, 67, 50, 66, 57, 62.5, 55], { fill: "#000", smooth: 0.55 }),
    glaze([60, 36, 66, 34, 68, 52, 61, 54], "h0", 0.55, 1.2),
    glaze([93, 34, 101, 34, 101, 46, 95, 44], "h0", 0.45, 1.2),
    glaze([72, 25, 84, 23, 86, 29, 74, 31], "h3", 0.45, 1.2)),
  [[64, 45, 66, 35, 75, 28], [67, 42, 73, 32, 86, 26], [71, 39, 80, 31, 94, 27.5], [77, 37, 87, 30, 98, 31], [85, 39, 93, 34, 100, 37], [62.5, 53, 62.5, 45, 65, 38], [90, 39, 96, 37, 99.5, 42]].map(([a, b, c, d, e, f]) =>
    strand([a, b, c, d, e, f], "h3", 0.6)),
  [[66, 48, 68, 39, 74, 33], [74, 36, 82, 30, 91, 27.5], [87, 37, 94, 33, 99, 35], [69, 44, 72, 37, 79, 33]].map(([a, b, c, d, e, f]) => strand([a, b, c, d, e, f], "h0", 0.55)),
  [[70, 28, 78, 24.5, 85, 24], [86, 24.5, 92, 25, 96, 28]].map(([a, b, c, d, e, f]) => strand([a, b, c, d, e, f], "#c48d5a", 0.5)),
  // a loose lock falling at the temple
  curve([69, 44, 67.5, 48, 68.4, 52], stroke(0.9, { c: "h1", taper: 0.6 })),
]

const PAULDRON = [
  [12, 118, 24, 111, 41, 116, 43, 126, 30, 134, 14, 132],
  [12, 105, 26, 97, 46, 103, 48, 116, 34, 122, 14, 120],
  [18, 95, 33, 87, 52, 93, 54, 105, 38, 111, 19, 108],
  [28, 89, 42, 79, 57, 80, 62, 92, 51, 99, 32, 98],
]
const upperArm = (s) => {
  const arm = M(s, [15, 130, 38, 128, 42, 143, 38, 160, 20, 163, 11, 148])
  return [
    // teal sleeve with a ragged hem, and the bicep
    blob(M(s, [16, 110, 43, 109, 45, 131, 41, 134, 37, 131, 33, 136, 28, 132, 23, 137, 17, 132]), paint("t1", 1.3, { rim: "t2" }, { smooth: 0.4 })),
    [[25, 136, 24, 140], [35, 135, 36, 139]].map(([a, b, c, d]) => line(M(s, [a, b, c, d]), { stroke: "t2", sw: 0.4 })),
    blob(arm, paint("sk2", 1.7, { rim: "sk3", depth: 0.42 })),
    clip(blob(arm, { fill: "#000" }),
      // under the sleeve, the bicep's lit dome, the triceps in shadow, the elbow
      glaze(M(s, [12, 128, 42, 128, 42, 134, 12, 134]), "sk0", 0.55, 1),
      glaze(M(s, [19, 135, 30, 133, 32, 146, 22, 150]), "sk3", 0.7),
      glaze(M(s, [32, 132, 42, 132, 42, 160, 33, 158]), "sk0", 0.7),
      glaze(M(s, [12, 140, 17, 139, 18, 152, 12, 150]), "sk1", 0.4),
      glaze(M(s, [16, 152, 26, 153, 27, 163, 16, 163]), "sk0", 0.45),
      glaze(M(s, [22, 137, 27, 136, 28, 141, 23, 143]), "#fff2df", 0.4, 0.8),
      grit([arm], 0.12, s > 0 ? 13 : 14, 1, 0)),
    // painted muscle masses: triceps turned from the light, the biceps' lit dome, the groove between
    clip(blob(arm, { fill: "#000" }),
      blob(M(s, [10, 138, 21, 133, 24, 147, 21, 162, 10, 160]), { fill: "sk2", shade: lit({ hi: false, depth: 0.65 }), ink: ink(0.6, { c: "sk0" }) }),
      blob(M(s, [22, 133, 35, 131, 39, 141, 36.5, 154, 27, 157, 22, 147]), { fill: "sk2", shade: lit({ hi: "sk3", rim: "sk1", depth: 0.4 }), ink: ink(0.7, { c: "sk0" }) }),
      glaze(M(s, [25, 135, 31, 134, 32, 143, 26, 145]), "#fff0dc", 0.55, 0.9),
      blob(M(s, [17, 155, 37, 153, 40, 165, 16, 165]), { fill: "sk0", opacity: 0.55, blur: 1.4 })),
    crease(M(s, [22.5, 136, 21.5, 147, 23, 158]), "sk0", 0.9),
    // pauldron: lamellar plates, lowest first, then rust, scratches and rivets
    PAULDRON.map((p, i) => plate(M(s, p), (s > 0 ? 40 : 50) + i, "s2")),
    [[16, 106, 34, 112], [15, 119, 30, 124], [20, 95, 36, 99]].map(([a, b, c, d]) => curve(M(s, [a, b, (a + c) / 2, d, c, d - 1]), { stroke: "s3", sw: 0.5, opacity: 0.55 })),
    [[24, 116, 28, 117], [36, 104, 39, 106], [44, 88, 48, 87]].map(([a, b, c, d]) => line(M(s, [a, b, c, d]), { stroke: "s0", sw: 0.5, opacity: 0.7 })),
    [[21, 113], [21, 102], [26, 93], [45, 84]].map(([x, y], i) => [rust(X(s, x), y, 1.7, i + (s > 0 ? 60 : 70)), rivet(X(s, x), y)]),
    rust(X(s, 30), 131.5, 2, s > 0 ? 64 : 74),
  ]
}

const VAMBRACE = [4, 159, 16, 156, 20, 180, 18.5, 206, 8, 207, 2, 184]
const forearm = (s) => [
  blob(M(s, [10, 156, 29, 153, 30, 174, 27, 205, 12, 208, 5, 184]), paint("sk2", 1.5, { rim: "sk3" })),
  clip(blob(M(s, [10, 156, 29, 153, 30, 174, 27, 205, 12, 208, 5, 184]), { fill: "#000" }),
    blob(M(s, [8, 154, 19, 153, 20, 168, 7, 168]), { fill: "sk2", shade: lit({ hi: "sk3", depth: 0.45 }), ink: ink(0.6, { c: "sk0" }) }),
    blob(M(s, [20, 153, 31, 152, 31, 168, 21, 168]), { fill: "sk1", opacity: 0.5, blur: 1 })),
  // vambrace: leather sleeve, steel plate on the outer side, thin straps with buckles
  blob(M(s, [6, 166, 28, 163, 28, 204, 10, 207]), paint("l1", 1.4, { rim: "l2" }, { smooth: 0.5 })),
  grit([M(s, [6, 166, 28, 163, 28, 204, 10, 207])], 1, s > 0 ? 9 : 10, 0.5),
  stitch(M(s, [26, 166, 26, 202])),
  plate(M(s, VAMBRACE), s > 0 ? 80 : 81, "s2"),
  curve(M(s, [9.5, 160, 11.5, 182, 11, 204]), { stroke: "s0", sw: 0.6, opacity: 0.6 }),
  [175, 191].map((y) => [
    poly(M(s, [2.5, y, 29, y - 1.5, 29, y + 2.4, 2.5, y + 3.6]), paint("l1", 0.7, { hi: "l3" })),
    rect(X(s, s > 0 ? 22 : 25), y - 1.2, 3, 4, { fill: "none", stroke: "g", sw: 0.6, r: 0.6 }),
  ]),
  [[10, 163], [10, 201]].map(([x, y], i) => [rust(X(s, x), y, 1.5, i + (s > 0 ? 90 : 95)), rivet(X(s, x), y)]),
]

const hand = (s) => [
  // fist: the curled fingers' middle segments face us, thumb folded across on the inner side
  [[9, 5.4], [14, 5.6], [19.2, 5.4], [24.2, 4.6]].map(([x, w], i) =>
    blob(M(s, [x, 218, x + w, 218, x + w + 0.2, 229 - i * 0.4, x + w / 2, 233.5 - i * 0.6, x - 0.2, 229 - i * 0.4]), paint("sk2", 0.9, { depth: 0.55, brush: 0.2, hi: "sk3" }, { smooth: 0.8 }))),
  [[9, 5.4], [14, 5.6], [19.2, 5.4], [24.2, 4.6]].map(([x, w], i) => [
    crease(M(s, [x + 1, 226.4 - i * 0.3, x + w / 2, 227.2 - i * 0.3, x + w - 1, 226.4 - i * 0.3]), "sk1", 0.45),
    ellipse(X(s, x + w / 2 - 0.6), 222, w * 0.22, 1.2, { fill: "sk3", opacity: 0.5 }),
  ]),
  blob(M(s, [24, 213, 31, 214, 33, 223, 29.5, 229, 25.5, 227, 25, 220]), paint("sk2", 1.1, { depth: 0.5 })),
  crease(M(s, [27, 225, 29.4, 226.4]), "sk1", 0.5),
  // fingerless glove over the back of the hand, knuckle pads, a strap at the wrist
  blob(M(s, [7, 203, 29, 201, 32, 212, 28.5, 220, 9, 221, 5, 212]), paint("t1", 1.4, { rim: "t3" }, { smooth: 0.6 })),
  grit([M(s, [7, 203, 29, 201, 32, 212, 28.5, 220, 9, 221, 5, 212])], 1.2, s > 0 ? 100 : 101, 0.6),
  [11.7, 16.9, 22.1].map((x) => line(M(s, [x, 212, x, 220]), { stroke: "t0", sw: 0.6 })),
  [[11.7, 219], [16.9, 219], [22.1, 219], [26.6, 218.4]].map(([x, y]) => ellipse(X(s, x - 2.4), y, 2, 1.3, { fill: "l2", shade: lit({ hi: "l3", brush: 0 }), ink: ink(0.4, { wobble: 0 }) })),
  poly(M(s, [6, 203.5, 29.5, 201.5, 29.8, 205, 6.2, 207]), paint("l2", 0.7, { hi: "l3" })),
]

// ---------- rig ----------

const bones = {
  pelvis: { pivot: [AX, 180], z: 4, items: [tf({ x: AX - 77.5 }, pelvis()), tf({ x: AX - 77.5, scale: [0.9, 1], origin: [77.5, 0] }, belts())] },
  torso: { parent: "pelvis", pivot: [AX, 170], z: 5, items: [tf({ x: AX - 77.5, scale: [0.9, 1], origin: [77.5, 0] }, torso()), neck()] },
  head: { parent: "torso", pivot: [79, 86], z: 6, items: [head()] },
  spear: { parent: "torso", pivot: [52, 110], z: 0, items: [spear()] },
}
for (const [s, n] of [[1, "R"], [-1, "L"]]) {
  bones["thigh" + n] = { parent: "pelvis", pivot: [X(s, 46), 200], z: 2, items: [thigh(s)] }
  // the reference stands with the far boot drawn a little closer in
  bones["shin" + n] = { parent: "thigh" + n, pivot: [X(s, 44), 284], z: 1, items: [tf({ x: s > 0 ? 0 : -3 }, boot(s))] }
  bones["arm" + n] = { parent: "torso", pivot: [X(s, 34), 104], z: 7, items: [upperArm(s)] }
  bones["fore" + n] = { parent: "arm" + n, pivot: [X(s, 24), 156], z: 8, items: [forearm(s)] }
  bones["hand" + n] = { parent: "fore" + n, pivot: [X(s, 20), 206], z: 9, items: [tf({ scale: [0.86, 1], origin: [X(s, 6), 0] }, hand(s))] }
}
const SPEARMAN = rig(bones)

sprite("spearman", { w: 150, h: 395, scale: 3 },
  ellipse(77.5, 389, 64, 5, { fill: "#140b0744", blur: 2 }),
  pose(SPEARMAN))
