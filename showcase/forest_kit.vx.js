// Forest Kit: a cohesive 2D platformer asset pack.
// One palette, 3 tones per material, light from the top-left, 1.5-unit dark outline.

pal({
  k: "#1d1626", w: "#fff8ec",
  sk0: "#b5654f", sk1: "#f0a882", sk2: "#ffd8bd",            // skin
  hr0: "#5a2a1c", hr1: "#a3512b", hr2: "#e08a45",            // hair
  tn0: "#22356a", tn1: "#3b67c0", tn2: "#79acf5",            // tunic
  lt0: "#3b2622", lt1: "#6e4535", lt2: "#9c6a4d",            // leather / wood
  mt0: "#474d66", mt1: "#8790ad", mt2: "#d9dff2",            // metal
  gd0: "#a9561c", gd1: "#f2a72f", gd2: "#ffe27c",            // gold
  gr0: "#255238", gr1: "#3d8c48", gr2: "#74c45a", gr3: "#bde87e", // grass / leaves
  dt0: "#40262a", dt1: "#6f4337", dt2: "#9b6449",            // dirt
  st0: "#3a3c52", st1: "#646985", st2: "#a2a7c2",            // stone
  rd0: "#741d35", rd1: "#d8374c", rd2: "#ff8a86",            // red
  pu0: "#33204d", pu1: "#653c8e", pu2: "#a678d6",            // purple
  fi0: "#d9452c", fi1: "#ff9b2f", fi2: "#ffe86e",            // fire
  sky0: "#7fc4f5", sky1: "#c9ebff", sky2: "#f4fbff",
  hz0: "#5c86b8", hz1: "#7fa8d4", hz2: "#a9c9e8",            // distant hills
})
ramps("sk0 sk1 sk2", "hr0 hr1 hr2", "tn0 tn1 tn2", "lt0 lt1 lt2", "mt0 mt1 mt2", "gd0 gd1 gd2",
  "gr0 gr1 gr2 gr3", "dt0 dt1 dt2", "st0 st1 st2", "rd0 rd1 rd2", "pu0 pu1 pu2", "fi0 fi1 fi2")

const OL = { outline: "k", ow: 1.5 }
const FONT = "Open Sans"

/** Cel shading: the shape in its dark tone, then its light tone nudged toward the light, clipped. */
const cel = (mk, light, dark, d = 1.5) => [mk(dark), clip(mk("k"), tf({ x: -d, y: -d }, mk(light)))]
const shine = (pts, sw = 1.2, op = 0.75) => curve(pts, { stroke: "w", sw, opacity: op })
const periodic = (x, terms) => terms.reduce((y, [a, per, ph]) => y + a * Math.sin(2 * Math.PI * (x / per + ph)), 0)

// ===================================================================== hero

function hero(p) {
  const leg = (x, rot) => tf({ x, y: 33, rot, origin: [2, 0] },
    rect(0, 0, 4, 6, "lt0"), rect(-0.6, 5, 5.2, 5, { fill: "lt1", r: 1.6 }), rect(-0.6, 5, 5.2, 1.4, "lt2"))
  const arm = (x, rot, dir) => tf({ x, y: 23.5, rot, origin: [2, 1] },
    rect(0, 0, 4, 8, { fill: "tn1", r: 2 }), rect(dir < 0 ? 0 : 2.4, 0.5, 1.6, 6, { fill: "tn0", opacity: 0.45 }),
    circle(2, 8.6, 2, "sk1"))
  const blink = p.blink
  return [
    leg(11.2, p.legL), leg(16.8, p.legR),
    tf({ y: p.bob },
      blob([21, 22.5, 26, 23, 28.5, 26.5, 25, 27, 22, 25.5], "rd0"),           // scarf tail
      arm(6.6, p.armR, -1),
      ...cel((s) => rect(9.5, 22.5, 13, 12, { fill: s, r: 3.5 }), "tn1", "tn0"),
      rect(11, 24.5, 2.2, 7, { fill: "tn2", r: 1.1, opacity: 0.8 }),
      rect(9.5, 29.6, 13, 2.2, "lt1"), rect(14.6, 29.1, 2.8, 3.2, { fill: "gd1", r: 0.6 }),
      rect(9, 21.5, 14, 3.6, { fill: "rd1", r: 1.8 }), rect(10, 21.8, 6, 1, { fill: "rd2", r: 0.5 }),
      arm(21.4, p.armL, 1),
      // head
      circle(16, 12.6, 11, "hr0"),                                             // back hair
      ...cel((s) => circle(16, 14.4, 9.4, s), "sk1", "sk0", 1.6),
      sym(16, ellipse(10.6, 18.6, 1.8, 1, { fill: "rd2", opacity: 0.55 })),
      blink
        ? sym(16, curve([11, 16.4, 12.3, 17.2, 13.6, 16.4], { stroke: "k", sw: 0.9 }))
        : sym(16, ellipse(12.4, 15.8, 1.45, 2.2, "k"), circle(12.85, 14.9, 0.6, "w")),
      curve([15, 19.6, 16, 20.3, 17, 19.6], { stroke: "k", sw: 0.8 }),
      ...cel((s) => blob([5.6, 13, 7, 6, 12, 2.6, 19, 2.4, 25, 6, 26.6, 12.6, 23.6, 9.6, 20.4, 11.4, 17.6, 8.4, 14.2, 11.2, 10.6, 9.2, 8.6, 12.6], { fill: s, smooth: 0.8 }), "hr1", "hr0", 1.2),
      shine([10.4, 5.6, 14, 3.8, 18, 3.6], 1.3, 0.55),
      circle(25.6, 13.4, 1.7, "hr1")),                                          // side lock
  ]
}

anim("hero_idle", { w: 32, h: 44, frames: 8, fps: 8, scale: 2, ...OL },
  (f) => hero({ bob: f.sin(0.6) + 0.6, legL: 0, legR: 0, armL: f.sin(-3), armR: f.sin(3), blink: f.i === 6 }))

anim("hero_run", { w: 32, h: 44, frames: 8, fps: 14, scale: 2, ...OL },
  (f) => hero({ bob: -Math.abs(f.sin(1.6, 0, 2)) + 0.8, legL: f.sin(34), legR: -f.sin(34), armL: -f.sin(42), armR: f.sin(42), blink: false }))

sprite("hero_jump", { w: 32, h: 44, scale: 2, ...OL },
  hero({ bob: -1, legL: -28, legR: 18, armL: -150, armR: 140, blink: false }))

// ===================================================================== enemies

function slime(sq, look) {
  const body = (s) => blob([16, 4 + sq, 25, 7 + sq * 0.6, 30, 16, 30.5, 24, 16, 25.5, 1.5, 24, 2, 16, 7, 7 + sq * 0.6], { fill: s, smooth: 0.9 })
  return [
    ...cel(body, "gr2", "gr1", 2),
    clip(body("k"), ellipse(16, 27, 15, 4, { fill: "gr0", opacity: 0.6 })),
    sym(16, ellipse(11 + look, 15 + sq * 0.4, 2.6, 3.2, "w"), ellipse(11.6 + look, 15.6 + sq * 0.4, 1.4, 2, "k")),
    curve([13.5, 20.5, 16, 21.8, 18.5, 20.5], { stroke: "gr0", sw: 1 }),
    shine([7, 13, 8.5, 9.2, 12, 7.4 + sq * 0.5], 1.4, 0.7),
    circle(22.5, 9.6 + sq * 0.5, 1, { fill: "w", opacity: 0.6 }),
  ]
}

anim("slime_idle", { w: 32, h: 26, frames: 8, fps: 10, scale: 2, ...OL },
  (f) => tf({ x: 16, y: 26, scale: [1 + f.sin(0.05), 1 - f.sin(0.05)], origin: [0, 0] }, tf({ x: -16, y: -26 }, slime(f.sin(1.2), f.sin(0.6, 0.25)))))

function bat(flap) {
  const wing = [16, 11, 9, 4, 2, 6, 0, 12, 4, 11.5, 6, 16, 9.5, 13.5, 13, 17]
  return [
    sym(20, tf({ x: 2, y: 0, scale: [1, flap], origin: [14, 12] },
      ...cel((s) => blob(wing, { fill: s, smooth: 0.35 }), "pu1", "pu0", 1),
      curve([15, 12, 8, 7, 4, 8], { stroke: "pu2", sw: 0.8, opacity: 0.7 }))),
    sym(20, poly([14.5, 9, 15, 2.5, 19, 7.5], "pu1"), poly([15.4, 7.6, 15.6, 4.6, 17.4, 7], "rd2")),
    ...cel((s) => circle(20, 13, 7.2, s), "pu2", "pu1", 1.6),
    sym(20, circle(17.2, 12.2, 1.9, { fill: "fi2", glow: { r: 2, color: "fi1" } }), circle(17.5, 12.4, 0.8, "k")),
    sym(20, poly([18.4, 16.2, 19.4, 16.2, 18.9, 18.4], "w")),
    curve([17.6, 15.8, 20, 16.8, 22.4, 15.8], { stroke: "pu0", sw: 0.9 }),
  ]
}

anim("bat_fly", { w: 40, h: 22, frames: 6, fps: 12, scale: 2, ...OL },
  (f) => tf({ y: f.sin(1.2) }, bat(0.35 + 0.65 * (0.5 + 0.5 * f.cos(1)))))

// ===================================================================== collectibles

function coinFace(sx) {
  return tf({ x: 10, y: 10, scale: [sx, 1] },
    circle(0, 0, 9.5, "gd0"),
    ...cel((s) => circle(0, 0, 8.2, s), "gd2", "gd1", 1.2),
    circle(0, 0, 6, { stroke: "gd0", sw: 0.9, opacity: 0.5 }),
    star(0.5, 0.7, 5, 4.4, 2, "gd0"),
    star(0, 0.1, 5, 4.4, 2, "gd1"),
    star(-0.25, -0.15, 5, 2.4, 1.1, { fill: "gd2", opacity: 0.8 }))
}
sprite("coin", { w: 20, h: 20, scale: 2, ...OL }, coinFace(1), arc(10, 10, 6.8, 280, 340, { stroke: "w", sw: 1.3, opacity: 0.85 }))
anim("coin_spin", { w: 20, h: 20, frames: 8, fps: 12, scale: 2, ...OL },
  (f) => coinFace(Math.max(0.1, Math.abs(f.cos()))),
  (f) => f.i === 0 && arc(10, 10, 6.8, 280, 340, { stroke: "w", sw: 1.3, opacity: 0.85 }))

sprite("gem_red", { w: 16, h: 20, scale: 2, ...OL },
  poly([8, 0, 16, 6, 8, 20, 0, 6], "rd1"),
  poly([3.5, 0.8, 12.5, 0.8, 16, 6, 0, 6], "rd2"),
  poly([8, 20, 16, 6, 11, 6], "rd0"),
  poly([5, 6, 11, 6, 8, 20], { fill: "rd1" }),
  poly([5, 6, 8, 0.8, 11, 6], { fill: "w", opacity: 0.35 }),
  poly([2.4, 4.2, 4.2, 1.8, 5.2, 2.6, 3.4, 4.8], { fill: "w", opacity: 0.9 }))
sprite("gem_blue", { base: "gem_red", swap: { rd0: "tn0", rd1: "tn1", rd2: "tn2" } })
sprite("gem_green", { base: "gem_red", swap: { rd0: "gr0", rd1: "gr1", rd2: "gr3" } })

const HEART = "M8 15C2.5 10.6 0 7.6 0 4.6C0 2.2 1.9 0.4 4.2 0.4C5.8 0.4 7.2 1.3 8 2.7C8.8 1.3 10.2 0.4 11.8 0.4C14.1 0.4 16 2.2 16 4.6C16 7.6 13.5 10.6 8 15Z"
const heartBody = (s) => path(HEART, s)
sprite("heart", { w: 16, h: 16, scale: 2, ...OL },
  ...cel(heartBody, "rd1", "rd0", 1.4),
  ellipse(4.4, 4, 1.8, 1.2, { fill: "w", opacity: 0.85 }))

sprite("potion_red", { w: 18, h: 24, scale: 2, ...OL },
  rect(6, 0, 6, 3.5, { fill: "lt2", r: 1 }), rect(6, 2.2, 6, 1.3, "lt1"),
  rect(6.8, 3.5, 4.4, 4.5, "mt1"),
  circle(9, 15.5, 8.2, { fill: "mt2", opacity: 0.55 }),
  clip(circle(9, 15.5, 8.2, "k"),
    rect(0, 13, 18, 12, { fill: "rd1" }),
    rect(0, 20, 18, 5, { fill: "rd0", opacity: 0.6 }),
    ellipse(9, 13, 8.2, 1.4, "rd2"),
    circle(5.5, 18.5, 1.1, { fill: "w", opacity: 0.6 }), circle(11.5, 16.5, 0.7, { fill: "w", opacity: 0.6 }),
    shine([3, 15, 3.8, 11.4, 6.4, 9.2], 1.4, 0.85)))
sprite("potion_blue", { base: "potion_red", swap: { rd0: "tn0", rd1: "tn1", rd2: "tn2" } })

sprite("key", { w: 22, h: 12, scale: 2, ...OL },
  circle(5.5, 6, 4.6, "gd1"), circle(5.5, 6, 2, "k"),
  rect(9, 4.6, 12.5, 2.8, { fill: "gd1", r: 1 }),
  rect(15.5, 7, 2.2, 3.8, "gd1"), rect(19, 7, 2.4, 2.8, "gd1"),
  rect(9, 4.6, 12.5, 1, { fill: "gd2", r: 0.5 }),
  arc(5.5, 6, 3.4, 290, 350, { stroke: "gd2", sw: 1.2 }))

function chest(open) {
  return [
    ...cel((s) => rect(1, 11, 30, 15, { fill: s, r: 2 }), "lt2", "lt1"),
    rect(1, 18, 30, 1.2, { fill: "lt0", opacity: 0.6 }),
    open
      ? [rect(1, 4, 30, 7, { fill: "lt0", r: 2 }), ellipse(16, 11, 13, 2.4, { fill: "gd2", glow: { r: 6, color: "gd2", strength: 2 } }),
        sym(16, circle(10, 9.4, 2, "gd1"), circle(13.4, 8.8, 1.8, "gd2")), circle(16, 8.4, 2.2, "gd1")]
      : [...cel((s) => path("M1 12V7C1 3.6 4 1 8 1H24C28 1 31 3.6 31 7V12Z", s), "lt2", "lt1"), rect(1, 10, 30, 2, "lt0")],
    sym(16, rect(4, open ? 4 : 1.2, 3, open ? 22 : 24.8, { fill: "mt1" }), rect(4, open ? 4 : 1.2, 1, open ? 22 : 24.8, { fill: "mt2" })),
    rect(13, open ? 12 : 8.5, 6, 6.5, { fill: "gd1", r: 1.2 }), rect(15.2, open ? 14.4 : 11, 1.6, 2.6, { fill: "k", r: 0.8 }),
  ]
}
sprite("chest", { w: 32, h: 26, scale: 2, ...OL }, chest(false))
sprite("chest_open", { w: 32, h: 26, scale: 2, ...OL }, chest(true))

// ===================================================================== props

const canopy = (cs) => (s) => cs.map(([x, y, r]) => circle(x, y, r, s))
const CANOPIES = [
  [[10, 17, 8.5], [19, 10, 10], [28, 17, 8], [19, 21, 10], [8, 23, 5.5], [30, 23, 5]],
  [[9, 15, 8], [17, 9, 9], [26, 11, 8.5], [30, 20, 6.5], [18, 20, 10.5], [7, 22, 6]],
]
CANOPIES.forEach((cs, i) => sprite("_leaves_" + i, { w: 38, h: 32 },
  ...cel(canopy(cs), "gr2", "gr1", 3),
  // lit crescent on the top-left of each upper lump
  cs.slice(0, 3).map(([x, y, r]) => clip(circle(x, y, r - 0.2, "k"), circle(x, y, r, "gr3"), circle(x + r * 0.22, y + r * 0.26, r, "gr2"))),
  clip(canopy(cs)("k"), ellipse(19, 33, 20, 6, { fill: "gr0", opacity: 0.6 }))))

sprite("tree", { w: 38, h: 50, scale: 2, ...OL },
  path("M14.5 50C16 46 16.4 38 16.2 24H21.8C21.6 38 22 46 23.5 50Z", "lt1"),
  path("M14.5 50C16 46 16.4 38 16.2 24H18.4C18.4 38 18.4 46 19 50Z", "lt2"),
  curve([20, 33, 24, 29.5, 27, 28.5], { stroke: "lt1", sw: 2 }),
  stamp("_leaves_*", 0, 0))
sprite("tree_autumn", { base: "tree", swap: { gr0: "fi0", gr1: "gd0", gr2: "fi1", gr3: "gd2" } })

sprite("pine", { w: 26, h: 48, scale: 2, ...OL },
  rect(11, 38, 4, 10, "lt1"),
  [[0, 40, 26, 22], [3, 30, 23, 13], [6, 20, 20, 4]].map(([x0, y0, x1, top]) => {
    const tri = (s) => blob([x0, y0, 13, top, x1, y0, 13, y0 + 2], { fill: s, smooth: 0.25 })
    return [...cel(tri, "gr1", "gr0", 2.2), clip(tri("k"), poly([x0, y0 + 3, 13, top, 13, y0 + 3], { fill: "gr2", opacity: 0.55 }))]
  }))

sprite("bush", { w: 30, h: 16, scale: 2, ...OL },
  ...cel((s) => [circle(8, 10, 6.5, s), circle(16, 7.4, 7.4, s), circle(23, 10.2, 6.2, s), rect(3, 10, 24, 6, s)], "gr2", "gr1", 2),
  sym(15, circle(7, 7.6, 1.8, { fill: "gr3", opacity: 0.8 })),
  circle(10, 12, 1.3, "rd1"), circle(19.5, 11, 1.3, "rd1"), circle(15, 13, 1.1, "rd1"))

sprite("rock", { w: 26, h: 16, scale: 2, ...OL },
  ...cel((s) => blob([1, 16, 2.5, 8, 8, 3, 15, 1.5, 22, 4.5, 25.5, 11, 25, 16], { fill: s, smooth: 0.5 }), "st1", "st0", 2.2),
  poly([6, 7, 10, 3.8, 15, 3, 13, 6.4], { fill: "st2", opacity: 0.85 }),
  curve([15, 10, 18, 8.6, 20, 10.6], { stroke: "st0", sw: 1 }))

sprite("mushroom", { w: 18, h: 18, scale: 2, ...OL },
  path("M6 18C6.4 14 6.4 11 6.2 9H11.8C11.6 11 11.6 14 12 18Z", "w"),
  rect(6.2, 9, 5.6, 2, { fill: "st2", opacity: 0.6 }),
  ...cel((s) => path("M0.6 10.4C0.6 4.6 4.4 0.8 9 0.8C13.6 0.8 17.4 4.6 17.4 10.4Z", s), "rd1", "rd0", 1.4),
  circle(5, 6, 1.6, "w"), circle(10.5, 3.6, 1.3, "w"), circle(13.4, 7.6, 1.5, "w"))

sprite("sign", { w: 26, h: 28, scale: 2, ...OL },
  rect(11.5, 12, 3, 16, "lt1"), rect(11.5, 12, 1.2, 16, "lt2"),
  ...cel((s) => poly([1, 3, 20, 3, 25, 9, 20, 15, 1, 15], s), "lt2", "lt1", 1.2),
  line([5, 7, 13, 7], { stroke: "lt0", sw: 1.2 }), line([5, 11, 17, 11], { stroke: "lt0", sw: 1.2 }),
  circle(3.5, 5.5, 0.7, "mt1"), circle(3.5, 12.5, 0.7, "mt1"))

sprite("crate", { w: 24, h: 24, scale: 2, ...OL },
  ...cel((s) => rect(0, 0, 24, 24, { fill: s, r: 1.5 }), "lt2", "lt1", 1.4),
  rect(3, 3, 18, 18, { stroke: "lt0", sw: 1.4 }),
  line([4, 20, 20, 4], { stroke: "lt1", sw: 3.4 }), line([4.5, 19, 19, 4.5], { stroke: "lt2", sw: 1 }),
  sym(12, circle(1.9, 1.9, 0.8, "mt1"), circle(1.9, 22.1, 0.8, "mt1")))

sprite("fence", { w: 32, h: 20, scale: 2, ...OL },
  rect(0, 6, 32, 3, "lt1"), rect(0, 13, 32, 3, "lt1"), rect(0, 6, 32, 1, "lt2"),
  [4, 20].map((x) => [path(`M${x} 20V3L${x + 4} 0L${x + 8} 3V20Z`, "lt2"), rect(x + 5, 3, 3, 17, { fill: "lt1", opacity: 0.8 })]))

function flame(f) {
  const r = f.rng(f.i)
  const j = () => (r() - 0.5) * 1.6
  return tf({ glow: { r: 6, color: "fi1", strength: 2 } },
    blob([8 + j(), 0.5 + j(), 12, 8, 12.4, 13, 8, 16.5, 3.6, 13, 4, 8 + j()], { fill: "fi0", smooth: 0.8 }),
    blob([8 + j(), 4 + j(), 10.6, 9, 10.6, 13, 8, 15.6, 5.4, 13, 5.6, 9.6], { fill: "fi1", smooth: 0.8 }),
    ellipse(8, 12.6 + j() * 0.3, 1.8, 2.6, "fi2"))
}
anim("torch", { w: 16, h: 38, frames: 6, fps: 10, scale: 2, ...OL },
  rect(6.2, 18, 3.6, 20, { fill: "lt1", r: 1 }), rect(6.2, 18, 1.4, 20, "lt2"),
  path("M3 14H13L11.4 20H4.6Z", "mt1"), rect(3, 14, 10, 1.6, "mt2"),
  (f) => tf({ y: -1 }, flame(f)))

// ===================================================================== tiles (32x32, seamless)

const T = 32
const grassTop = (x) => 4.5 + periodic(x, [[0.9, 16, 0], [0.5, 8, 0.3]])
const grassBot = (x) => 11 + periodic(x, [[1.4, 16, 0.6], [0.6, 32, 0.1]])
const band = (fy, gy, x0 = -2, x1 = T + 2) => {
  const xs = Array.from({ length: (x1 - x0) * 2 + 1 }, (_, i) => x0 + i / 2)
  return [...xs.flatMap((x) => [x, fy(x)]), ...xs.reverse().flatMap((x) => [x, gy(x)])]
}
const pebbles = (seed, y0 = 14) => (f) => {
  const r = f.rng(seed)
  return Array.from({ length: 5 }, () => {
    const x = 4 + r() * 24, y = y0 + r() * (T - y0 - 4), s = 0.8 + r() * 1.2
    return [ellipse(x, y, s * 1.6, s, "dt0"), ellipse(x - 0.4, y - 0.4, s * 1.1, s * 0.6, "dt2")]
  })
}
const dirt = (seed, y0) => [rect(-1, y0, T + 2, T - y0 + 1, "dt1"), pebbles(seed, y0 + 6)]
const grass = () => [
  poly(band(grassTop, grassBot), "gr2"),
  poly(band((x) => grassBot(x) - 2, grassBot), "gr1"),
  poly(band(grassTop, (x) => grassTop(x) + 1.6), "gr3"),
  curve(Array.from({ length: 2 * (T + 4) + 1 }, (_, i) => -2 + i / 2).flatMap((x) => [x, grassTop(x)]), { stroke: "k", sw: 1.5 }),
  [5, 13, 22, 28].map((x) => poly([x - 1.4, grassTop(x) + 0.6, x, grassTop(x) - 3, x + 1.4, grassTop(x) + 0.6], "gr2")),
]
// Left/right caps: the same tile clipped to a rounded edge, with a drawn outline on the open side.
const capL = (items) => [clip(path(`M${T} 0V${T}H6V14C6 8 8 4.2 14 4.2H${T}Z`, "k"), items),
  path(`M6 ${T + 1}V14C6 8 8 4.2 14 4.2`, { stroke: "k", sw: 1.5 })]
const capR = (items) => tf({ x: T, flip: "x" }, capL(tf({ x: T, flip: "x" }, items)))

sprite("tile_top", { w: T, h: T, scale: 2 }, dirt(1, 8), grass())
sprite("tile_top_l", { w: T, h: T, scale: 2 }, capL([dirt(2, 8), grass()]))
sprite("tile_top_r", { w: T, h: T, scale: 2 }, capR([dirt(3, 8), grass()]))
sprite("tile_fill", { w: T, h: T, scale: 2 }, dirt(4, -1))
sprite("tile_fill_l", { w: T, h: T, scale: 2 }, clip(rect(6, -1, T, T + 2, "k"), dirt(5, -1)), line([6, -1, 6, T + 1], { stroke: "k", sw: 1.5 }))
sprite("tile_fill_r", { w: T, h: T, scale: 2 }, tf({ x: T, flip: "x" }, clip(rect(6, -1, T, T + 2, "k"), tf({ x: T, flip: "x" }, dirt(6, -1))), line([6, -1, 6, T + 1], { stroke: "k", sw: 1.5 })))
sprite("tile_stone", { w: T, h: T, scale: 2 },
  rect(0, 0, T, T, "st0"),
  [[1, 1, 18, 14], [20, 1, 11, 14], [1, 17, 9, 14], [11, 17, 20, 14]].map(([x, y, w, h]) => [
    ...cel((s) => rect(x, y, w, h, { fill: s, r: 2 }), "st2", "st1", 1.2),
    rect(x + 1.5, y + 1.2, w * 0.45, 1.2, { fill: "w", opacity: 0.25, r: 0.6 })]))
sprite("platform", { w: T * 3, h: 14, scale: 2, ...OL },
  ...cel((s) => rect(0, 0, T * 3, 10, { fill: s, r: 2.5 }), "lt2", "lt1", 1.2),
  rect(0, 7, T * 3, 3, { fill: "lt0", opacity: 0.45 }),
  [24, 48, 72].map((x) => line([x, 1, x, 9], { stroke: "lt0", sw: 1 })),
  [12, 84].map((x) => [rect(x - 2, 9, 4, 5, "lt0"), circle(x, 4.5, 1, "mt1")]))

// ===================================================================== background layers (480x270, tile horizontally)

const W = 480, H = 270
const ridge = (base, terms, step = 4) => {
  const pts = []
  for (let x = -step; x <= W + step; x += step) pts.push(x, base + periodic(x, terms))
  return [...pts, W + step, H + 2, -step, H + 2]
}
sprite("_cloud", { w: 60, h: 24 },
  ...cel((s) => [circle(18, 14, 9, s), circle(32, 10, 10, s), circle(45, 14, 8, s), rect(10, 14, 42, 9, { fill: s, r: 4.5 })], "w", "sky1", 1.6))

scene("bg_sky", { w: W, h: H, scale: 2, bg: lin(["sky0", "sky1", "sky2"], 90) },
  circle(392, 62, 26, { fill: "gd2", opacity: 0.35, blur: 10 }),
  circle(392, 62, 17, { fill: "#fff3c4", glow: { r: 10, color: "gd2", strength: 2 } }),
  [[40, 40, 1.4], [170, 70, 1], [300, 30, 1.2], [440, 105, 0.8], [250, 120, 0.7]].map(([x, y, s]) =>
    [0, -W].map((dx) => stamp("_cloud", x + dx, y, { scale: s, opacity: 0.95 }))))

scene("bg_hills_far", { w: W, h: H, scale: 2 },
  poly(ridge(150, [[18, 240, 0], [9, 120, 0.3], [4, 60, 0.7]]), { fill: lin(["hz2", "hz1"], 90) }),
  poly(ridge(176, [[14, 160, 0.5], [7, 80, 0.2]]), { fill: lin(["hz1", "hz0"], 90) }))

const NEAR = [[12, 240, 0.2], [6, 96, 0.6]]
scene("bg_hills_near", { w: W, h: H, scale: 2 },
  [20, 70, 120, 175, 230, 290, 345, 400, 455].map((x, i) =>
    stamp(i % 3 === 1 ? "pine" : "tree", x, 204 + periodic(x, NEAR), { anchor: "bottom", scale: 0.75 + ((i * 7) % 3) * 0.1, swap: { gr1: "gr0", gr2: "gr1", gr3: "gr2" } })),
  poly(ridge(196, NEAR), "gr2"),
  poly(ridge(199, NEAR), { fill: lin(["gr1", "gr0"], 90) }),
  [60, 200, 330, 440].map((x) => stamp("bush", x, 202 + periodic(x, NEAR), { anchor: "bottom", scale: 0.9 })))

// ===================================================================== UI

sprite("ui_heart_full", { w: 16, h: 16, scale: 2, ...OL }, stamp("heart", 0, 0))
sprite("ui_heart_half", { w: 16, h: 16, scale: 2, ...OL }, path(HEART, "st0"), clip(rect(0, 0, 8, 16, "k"), stamp("heart", 0, 0)))
sprite("ui_heart_empty", { w: 16, h: 16, scale: 2, ...OL }, ...cel(heartBody, "st1", "st0", 1.4))

sprite("ui_button", { w: 72, h: 26, scale: 2, ...OL },
  rect(0, 3, 72, 23, { fill: "gr0", r: 7 }),
  ...cel((s) => rect(0, 0, 72, 22, { fill: s, r: 7 }), "gr2", "gr1", 1.6),
  rect(6, 2.4, 40, 2.2, { fill: "w", opacity: 0.45, r: 1.1 }),
  text(36, 15.6, "PLAY", { fill: "gr0", size: 11, anchor: "middle", weight: "800", font: FONT }),
  text(36, 14.8, "PLAY", { fill: "w", size: 11, anchor: "middle", weight: "800", font: FONT }))

sprite("ui_panel", { w: 96, h: 64, scale: 2, ...OL },
  rect(0, 0, 96, 64, { fill: "lt1", r: 6 }), rect(3, 3, 90, 58, { fill: "#f6e3c4", r: 4 }),
  rect(3, 3, 90, 6, { fill: "#fff3dc", r: 3 }),
  sym(48, circle(6.5, 6.5, 1.4, "mt1"), circle(6.5, 57.5, 1.4, "mt1")))

sprite("ui_coin_counter", { w: 58, h: 22, scale: 2 },
  rect(8, 3, 48, 16, { fill: "#1d162699", r: 8 }),
  stamp("coin", 1, 1),
  text(36, 15.4, "× 128", { fill: "w", size: 10, anchor: "middle", weight: "800", font: FONT }))

// ===================================================================== atlases (game-ready)

sheet("atlas_characters", ["hero_*", "slime_idle", "bat_fly"], { pad: 2, scale: 2 })
sheet("atlas_items", ["coin", "coin_spin", "gem_*", "heart", "potion_*", "key", "chest*"], { pad: 2, scale: 2 })
sheet("atlas_props", ["tree*", "pine", "bush", "rock", "mushroom", "sign", "crate", "fence", "torch", "platform"], { pad: 2, scale: 2 })
sheet("atlas_tiles", ["tile_*"], { cols: 4, pad: 0, scale: 2 })
sheet("atlas_ui", ["ui_*"], { pad: 2, scale: 2 })

// ===================================================================== portfolio pieces

const GROUND = 214
const groundRow = (x0, n) => [stamp("tile_top_l", x0, GROUND), tile("tile_top", x0 + T, GROUND, n - 2, 1), stamp("tile_top_r", x0 + T * (n - 1), GROUND),
  stamp("tile_fill_l", x0, GROUND + T), tile("tile_fill", x0 + T, GROUND + T, n - 2, 1), stamp("tile_fill_r", x0 + T * (n - 1), GROUND + T)]
const shadow = (x, w) => ellipse(x, GROUND + 4.6, w, 2.4, { fill: "#1d162640" })

// A gameplay shot: parallax layers, tiles, props, characters, pickups, HUD. 4x export = 1920x1080.
scene("poster", { w: W, h: H, scale: 4 },
  stamp("bg_sky", 0, 0), stamp("bg_hills_far", 0, -4), stamp("bg_hills_near", 0, 6),
  groundRow(-12, 10), groundRow(338, 6),
  stamp("tile_stone", 306, GROUND + 8), stamp("tile_stone", 306, GROUND + 40),
  stamp("tree", 20, GROUND + 5, { anchor: "bottom", scale: 1.5 }), stamp("tree_autumn", 268, GROUND + 5, { anchor: "bottom", scale: 1.3 }),
  stamp("pine", 448, GROUND + 5, { anchor: "bottom", scale: 1.4 }),
  stamp("bush", 70, GROUND + 5, { anchor: "bottom" }), stamp("bush", 236, GROUND + 5, { anchor: "bottom", flip: "x" }),
  stamp("fence", 100, GROUND + 5, { anchor: [0, 1] }), stamp("fence", 132, GROUND + 5, { anchor: [0, 1] }),
  stamp("rock", 214, GROUND + 5, { anchor: "bottom" }), stamp("mushroom", 196, GROUND + 5, { anchor: "bottom" }),
  stamp("sign", 360, GROUND + 5, { anchor: "bottom" }), stamp("torch", 422, GROUND + 5, { anchor: "bottom", frame: 2 }),
  stamp("crate", 392, GROUND + 5, { anchor: "bottom" }),
  stamp("platform", 150, 140), stamp("platform", 318, 104),
  stamp("chest", 392, 105, { anchor: "bottom" }),
  [[166, 116], [186, 110], [206, 108], [226, 110], [246, 116]].map(([x, y], i) => stamp("coin_spin", x, y, { anchor: "center", frame: i })),
  stamp("gem_blue", 338, 84, { anchor: "center", rot: -8 }), stamp("potion_red", 360, 86, { anchor: "center" }),
  stamp("key", 108, 118, { anchor: "center", rot: -12 }),
  shadow(150, 12), stamp("hero_run", 150, GROUND + 5, { anchor: "bottom", frame: 2 }),
  shadow(236, 13), stamp("slime_idle", 236, GROUND + 5, { anchor: "bottom", flip: "x", frame: 3 }),
  stamp("bat_fly", 410, 132, { anchor: "center", frame: 1, flip: "x" }), stamp("bat_fly", 262, 70, { anchor: "center", frame: 4, scale: 0.75 }),
  // HUD
  [0, 1, 2].map((i) => stamp(i < 2 ? "ui_heart_full" : "ui_heart_half", 12 + i * 19, 12)),
  stamp("ui_coin_counter", 8, 34),
  text(468, 26, "FOREST KIT", { fill: "k", size: 22, anchor: "end", weight: "800", font: FONT, stroke: "w", sw: 5, join: "round" }),
  text(468, 26, "FOREST KIT", { fill: "k", size: 22, anchor: "end", weight: "800", font: FONT }),
  text(468, 40, "vector platformer asset pack · made with vex", { fill: "k", size: 7.5, anchor: "end", weight: "600", font: FONT, opacity: 0.75 }))

// Asset board: everything laid out with labels. 3x export = 1440x1380.
// Rows: [title, height, [[name, scale, advance, frame?], ...]]
const BOARD = [
  ["CHARACTERS", 82, [["hero_idle", 1.7, 64], ["hero_run", 1.7, 64, 3], ["hero_jump", 1.7, 66], ["slime_idle", 1.7, 66], ["bat_fly", 1.7, 80, 1]]],
  ["COLLECTIBLES", 40, [["coin", 1.5, 42], ["gem_red", 1.5, 36], ["gem_blue", 1.5, 36], ["gem_green", 1.5, 36], ["heart", 1.5, 36],
    ["potion_red", 1.5, 38], ["potion_blue", 1.5, 40], ["key", 1.5, 46], ["chest", 1.3, 50], ["chest_open", 1.3, 50]]],
  ["PROPS", 64, [["tree", 1.2, 52], ["tree_autumn", 1.2, 54], ["pine", 1.2, 40], ["bush", 1.2, 46], ["rock", 1.2, 40], ["mushroom", 1.3, 32],
    ["sign", 1.2, 40], ["crate", 1.2, 38], ["fence", 1.2, 48], ["torch", 1.2, 28]]],
  ["TILES & PLATFORMS", 34, [["tile_top_l", 1, 32], ["tile_top", 1, 32], ["tile_top_r", 1, 40], ["tile_stone", 1, 40], ["platform", 1, 0]]],
  ["UI", 40, [["ui_heart_full", 1.6, 34], ["ui_heart_half", 1.6, 34], ["ui_heart_empty", 1.6, 40], ["ui_button", 1.2, 96], ["ui_coin_counter", 1.4, 92], ["ui_panel", 0.6, 0]]],
]
scene("board", { w: 480, h: 460, scale: 3, bg: "#232033" },
  rect(0, 0, 480, 46, "#2c2840"),
  text(20, 29, "FOREST KIT", { fill: "w", size: 18, weight: "800", font: FONT }),
  text(146, 29, "2D vector platformer pack · SVG + PNG @1x/@2x · atlases + JSON", { fill: "sky1", size: 8, weight: "600", font: FONT, opacity: 0.8 }),
  (() => {
    let y = 54
    return BOARD.map(([title, h, items]) => {
      const top = y
      y += h + 26
      let x = 22
      return [
        text(20, top + 8, title, { fill: "gd1", size: 7, weight: "800", font: FONT }),
        rect(20, top + 12, 440, 0.6, { fill: "w", opacity: 0.12 }),
        items.map(([name, scale, adv, frame]) => {
          const it = stamp(name, x, top + 18 + h, { anchor: [0, 1], scale, frame: frame ?? 0 })
          x += adv
          return it
        }),
      ]
    })
  })(),
  text(240, 453, "tiles, platforms and parallax layers repeat seamlessly", { fill: "w", size: 6.5, anchor: "middle", font: FONT, opacity: 0.45 }))

// Showreel: every animated asset on one stage (stamped anims follow the reel's frames).
anim("showreel", { w: 300, h: 80, frames: 24, fps: 12, scale: 3, bg: "#232033" },
  rect(0, 62, 300, 18, "#2c2840"),
  stamp("hero_idle", 22, 64, { anchor: "bottom", scale: 1.1 }),
  stamp("hero_run", 64, 64, { anchor: "bottom", scale: 1.1 }),
  stamp("slime_idle", 108, 64, { anchor: "bottom", scale: 1.1 }),
  stamp("bat_fly", 158, 34, { anchor: "center", scale: 1.1 }),
  stamp("coin_spin", 202, 44, { anchor: "center", scale: 1.2 }),
  stamp("coin_spin", 232, 44, { anchor: "center", scale: 1.2, delay: 3 }),
  stamp("torch", 272, 64, { anchor: "bottom", scale: 1.1 }))
