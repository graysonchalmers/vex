// Hand-drawn look: ink lines with weight and wobble, painted shading from one light, hatching.
// Everything is ordinary vex shapes with three style keys: ink, shade, hatch.
pal({
  k: "#1d1410", paper: "#efe4cc", paperD: "#d8c7a4",
  m0: "#1f3a2b", m1: "#35634a", m2: "#5b9658", m3: "#a8cf7a",
  b0: "#4a2e22", b1: "#7d5036", b2: "#b98252", b3: "#ecc68c",
  e0: "#5e1820", e1: "#b8333a", e2: "#f0784a", y: "#fff0bf",
  s0: "#3b3a4f", s1: "#6c6c86", s2: "#a9a9c0", s3: "#e4e4f0",
})
ramps("m0 m1 m2 m3", "b0 b1 b2 b3", "e0 e1 e2 y", "s0 s1 s2 s3")

const LIGHT = 315 // from the top-left, for every shape
const INK = { c: "k", w: 4, light: LIGHT }
const ink = (w = 4) => ({ ...INK, w })
const lit = (extra = {}) => ({ light: LIGHT, ...extra })

// BOGMAW: a swamp toad with a lantern grown from its head
sprite("bogmaw", { w: 220, h: 200, scale: 2 },
  // shadow on the ground
  ellipse(110, 186, 82, 10, { fill: "#1d141040" }),
  // back leg and the lantern stalk sit behind the body
  blob([150, 150, 190, 140, 205, 170, 185, 188, 140, 186], { fill: "m1", shade: lit(), ink: ink(3.5) }),
  curve([96, 62, 88, 34, 104, 14, 126, 12], { ink: { ...ink(4), taper: 0.15 } }),
  // body
  blob([30, 130, 40, 82, 82, 52, 140, 54, 182, 86, 196, 136, 170, 176, 110, 186, 52, 176],
    { fill: "m2", shade: lit({ depth: 0.38, rim: "m3" }), hatch: { c: "m0", gap: 5, opacity: 0.35 }, ink: ink(5) }),
  // belly
  blob([64, 158, 88, 142, 132, 140, 160, 154, 150, 174, 110, 182, 76, 176],
    { fill: "b3", shade: lit({ depth: 0.3, brush: 0.7 }), ink: ink(2.5) }),
  // warts
  [[60, 66, 6], [176, 92, 5], [182, 130, 4], [44, 104, 4.5], [110, 58, 3.5]].map(([x, y, r]) =>
    circle(x, y, r, { fill: "m1", shade: lit({ hi: "m3", brush: 0 }), ink: ink(1.6) })),
  // mouth
  curve([50, 120, 80, 132, 120, 130, 160, 116, 176, 104], { ink: { ...ink(4.5), taper: 0.35 } }),
  // eyes
  [[76, 88], [140, 80]].map(([x, y]) => [
    blob([x - 16, y + 4, x - 12, y - 12, x + 4, y - 16, x + 16, y - 6, x + 14, y + 10, x - 2, y + 14], { fill: "y", shade: lit({ depth: 0.3, c: "e2" }), ink: ink(3) }),
    ellipse(x + 2, y + 1, 4, 9, { fill: "k" }),
    circle(x - 3, y - 6, 2.4, { fill: "#ffffff" }),
  ]),
  // front leg
  blob([30, 150, 58, 146, 76, 172, 70, 190, 30, 190, 22, 172], { fill: "m2", shade: lit(), ink: ink(4) }),
  [34, 46, 58].map((x) => curve([x, 182, x + 2, 190], { ink: { ...ink(2.2), taper: 0.6 } })),
  // the lantern
  blob([116, 6, 134, 2, 146, 14, 146, 32, 130, 40, 114, 32, 110, 16],
    { fill: "e2", shade: lit({ c: "e1", hi: "y", depth: 0.3 }), glow: { r: 14, color: "e2", strength: 2 }, ink: ink(3.5) }),
  circle(127, 20, 5, { fill: "y", glow: 6 }),
)

// A relic-style icon: rusty dagger
sprite("dagger", { w: 120, h: 120, scale: 2 },
  poly([24, 84, 84, 24, 100, 16, 94, 32, 34, 94], { fill: "s2", shade: lit({ hi: "s3", depth: 0.25 }), hatch: { c: "s0", gap: 3.5, angle: -20, opacity: 0.4 }, ink: ink(3) }),
  line([31, 87, 92, 26], { ink: { c: "s3", w: 1.5, taper: 0.5, wobble: 0.6 } }),
  poly([22, 80, 40, 98, 36, 102, 18, 84], { fill: "b2", shade: lit(), ink: ink(3) }),
  poly([10, 104, 28, 90, 32, 94, 18, 110, 10, 112], { fill: "b1", shade: lit({ c: "b0" }), ink: ink(3) }),
  circle(12, 110, 6, { fill: "e1", shade: lit({ hi: "y" }), ink: ink(2.5) }),
)

// Line boil: the same toad's lantern bobbing, ink redrawn every 3 frames
anim("bogmaw_idle", { w: 220, h: 200, frames: 12, fps: 12, boil: 3 },
  (f) => stamp("bogmaw", 110, 200, { anchor: "bottom", scale: [1 + f.sin(0.015), 1 - f.sin(0.015)] }))

scene("hand_drawn", { w: 520, h: 260, scale: 2, bg: "paper" },
  rect(0, 0, 520, 260, { fill: "#000", grain: { freq: 0.9, octaves: 3, seed: 4 }, blend: "multiply", opacity: 0.12 }),
  stamp("bogmaw", 40, 30),
  stamp("dagger", 300, 30, { scale: 1.7 }),
)
