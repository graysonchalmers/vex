// UI kit: 9-slice panels and buttons, bars, slots, icons, and bitmap fonts for game UI.
pal({ k: "#1d1626", w: "#fff8ec",
  wd0: "#3b2622", wd1: "#6e4535", wd2: "#9c6a4d", pap: "#f6e3c4", papL: "#fff3dc",
  gr0: "#255238", gr1: "#3d8c48", gr2: "#74c45a", rd0: "#741d35", rd1: "#d8374c", rd2: "#ff8a86",
  gd0: "#a9561c", gd1: "#f2a72f", gd2: "#ffe27c", st0: "#3a3c52", st1: "#646985", st2: "#a2a7c2",
  bl1: "#3b67c0", bl2: "#79acf5" })
const OL = { outline: "k", ow: 1.5 }

// Stretchable panel: a 10-unit frame stays crisp at any size; only the middle stretches.
sprite("ui_panel", { w: 48, h: 48, scale: 3, slice: [12, 12, 12, 12], ...OL },
  rect(0, 0, 48, 48, { fill: "wd1", r: 6 }), rect(1.5, 1.5, 45, 3, { fill: "wd2", r: 1.5 }),
  rect(5, 5, 38, 38, { fill: "pap", r: 3 }), rect(5, 5, 38, 5, { fill: "papL", r: 2.5 }),
  [[8, 8], [40, 8], [8, 40], [40, 40]].map(([x, y]) => circle(x, y, 1.4, "st1")))

// Buttons: normal / hover / pressed, all 9-slice so labels of any length fit.
const button = (top, mid, bot, press) => [
  rect(0, press ? 3 : 0, 40, 22 - (press ? 3 : 0), { fill: bot, r: 6 }),
  rect(0, press ? 2 : 0, 40, 18, { fill: mid, r: 6 }),
  rect(4, (press ? 2 : 0) + 2.5, 22, 2.4, { fill: top, r: 1.2, opacity: 0.7 })]
sprite("ui_button", { w: 40, h: 22, scale: 3, slice: [8, 8, 8, 8], ...OL }, button("w", "gr2", "gr0", false))
sprite("ui_button_hover", { w: 40, h: 22, scale: 3, slice: [8, 8, 8, 8], ...OL }, button("w", "#8fdc6e", "gr0", false))
sprite("ui_button_pressed", { w: 40, h: 22, scale: 3, slice: [8, 8, 8, 8], ...OL }, button("w", "gr1", "gr0", true))
sprite("ui_button_red", { base: "ui_button", swap: { gr2: "rd1", gr0: "rd0" } })

// Progress bar: frame (9-slice) and a fill to scale horizontally.
sprite("ui_bar_frame", { w: 40, h: 12, scale: 3, slice: [6, 6, 6, 6], ...OL },
  rect(0, 0, 40, 12, { fill: "st0", r: 4 }), rect(2, 2, 36, 8, { fill: "k", r: 3 }))
sprite("ui_bar_fill", { w: 36, h: 8, scale: 3, slice: [3, 3, 3, 3] },
  rect(0, 0, 36, 8, { fill: lin(["rd2", "rd1"], 90), r: 3 }), rect(2, 1, 32, 1.6, { fill: "w", r: 0.8, opacity: 0.5 }))

sprite("ui_slot", { w: 24, h: 24, scale: 3, slice: [6, 6, 6, 6], ...OL },
  rect(0, 0, 24, 24, { fill: "st1", r: 4 }), rect(2, 2, 20, 20, { fill: "st0", r: 3 }), rect(2, 2, 20, 3, { fill: "k", opacity: 0.3, r: 2 }))

// Icons, 16 units, one style.
const ICON = { w: 16, h: 16, scale: 3, ...OL }
sprite("icon_heart", ICON, path("M8 15C2.5 10.6 0 7.6 0 4.6C0 2.2 1.9 0.4 4.2 0.4C5.8 0.4 7.2 1.3 8 2.7C8.8 1.3 10.2 0.4 11.8 0.4C14.1 0.4 16 2.2 16 4.6C16 7.6 13.5 10.6 8 15Z", "rd1"),
  ellipse(4.4, 4, 1.8, 1.2, { fill: "w", opacity: 0.85 }))
sprite("icon_coin", ICON, circle(8, 8, 7.5, "gd0"), circle(8, 8, 6.2, "gd1"), star(8, 8.2, 5, 3.4, 1.5, "gd2"))
sprite("icon_gear", ICON, star(8, 8, 8, 7.6, 5.6, { fill: "st2", rot: 22.5 }), circle(8, 8, 2.4, "st0"))
sprite("icon_sound", ICON, poly([1, 6, 4, 6, 8, 2, 8, 14, 4, 10, 1, 10], "w"),
  arc(8, 8, 3.5, 30, 150, { stroke: "w", sw: 1.4 }), arc(8, 8, 6, 35, 145, { stroke: "w", sw: 1.4 }))
sprite("icon_pause", ICON, rect(3, 2, 4, 12, { fill: "w", r: 1 }), rect(9, 2, 4, 12, { fill: "w", r: 1 }))
sprite("icon_play", ICON, poly([4, 2, 14, 8, 4, 14], "w"))

// Bitmap fonts: a chunky title font and a clean body font.
font("title", { family: "Open Sans", weight: 800, size: 48, fill: "gd2", outline: 3, outlineColor: "k", shadow: [0, 4], shadowColor: "#00000080" })
font("body", { family: "Open Sans", weight: 600, size: 22, fill: "w", outline: 2, outlineColor: "k" })

sheet("ui", ["ui_*", "icon_*"], { pad: 4, scale: 3 })
