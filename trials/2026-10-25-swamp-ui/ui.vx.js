// Swamp UI kit: 9-slice panel and buttons, hp/stamina bars, slot, bitmap fonts. Swamp palette from kiln's styles.kx.js.
pal({ k: "#1a2014", w: "#f4f0de", wd0: "#3e2e20", wd1: "#5e4632", wd2: "#8a6a48", wdL: "#ccad84",
  mo0: "#2a3d30", mo1: "#3f5a45", mo2: "#55745a", lf1: "#4e7a34", lf2: "#8db04e", lf0: "#3e5e2e",
  gl1: "#4a9a74", gl2: "#9fe8c8", am1: "#ffc860", am2: "#ffe2a0", am0: "#c08a3a", rd1: "#b8503a", rd2: "#e8826a" })
const OL = { outline: "k", ow: 1.5 }

// Panel: wood frame with corner pegs around a mossy inset; frame stays crisp, middle stretches.
sprite("ui_panel", { w: 48, h: 48, scale: 3, slice: [12, 12, 12, 12], ...OL },
  rect(0, 0, 48, 48, { fill: "wd1", r: 6 }), rect(1.5, 1.5, 45, 3, { fill: "wd2", r: 1.5 }),
  rect(5, 5, 38, 38, { fill: lin(["mo1", "mo0"], 90), r: 3 }), rect(5, 5, 38, 3, { fill: "k", r: 2, opacity: 0.35 }),
  [[8, 8], [40, 8], [8, 40], [40, 40]].map(([x, y]) => circle(x, y, 1.4, "wd0")))

// Buttons: lily-green normal / hover (glowing) / pressed (sunk).
const btn = (mid, bot, press, glow) => [
  rect(0, press ? 3 : 0, 40, 22 - (press ? 3 : 0), { fill: bot, r: 6 }),
  rect(0, press ? 2 : 0, 40, 18, { fill: mid, r: 6, ...(glow ? { glow: { r: 3, color: "gl2", strength: 1 } } : {}) }),
  rect(4, (press ? 2 : 0) + 2.5, 22, 2.4, { fill: "w", r: 1.2, opacity: 0.5 })]
const B = { w: 40, h: 22, scale: 3, slice: [8, 8, 8, 8], ...OL }
sprite("ui_button", B, btn("lf1", "lf0", false))
sprite("ui_button_hover", B, btn("lf2", "lf0", false, true))
sprite("ui_button_pressed", B, btn("lf0", "lf0", true))
sprite("ui_button_danger", { base: "ui_button", swap: { lf1: "rd1", lf0: "wd0" } })

// Bars: frame + two fills (glow-mint health, lantern-amber stamina).
sprite("ui_bar_frame", { w: 40, h: 12, scale: 3, slice: [6, 6, 6, 6], ...OL },
  rect(0, 0, 40, 12, { fill: "wd1", r: 4 }), rect(2, 2, 36, 8, { fill: "k", r: 3 }))
const fill = (a, b) => [rect(0, 0, 36, 8, { fill: lin([a, b], 90), r: 3 }), rect(2, 1, 32, 1.6, { fill: "w", r: 0.8, opacity: 0.5 })]
sprite("ui_bar_hp", { w: 36, h: 8, scale: 3, slice: [3, 3, 3, 3] }, fill("gl2", "gl1"))
sprite("ui_bar_stamina", { w: 36, h: 8, scale: 3, slice: [3, 3, 3, 3] }, fill("am2", "am0"))

sprite("ui_slot", { w: 24, h: 24, scale: 3, slice: [6, 6, 6, 6], ...OL },
  rect(0, 0, 24, 24, { fill: "wd1", r: 4 }), rect(2, 2, 20, 20, { fill: "mo0", r: 3 }), rect(2, 2, 20, 3, { fill: "k", opacity: 0.3, r: 2 }))

font("title", { family: "Fira Sans", weight: 800, size: 44, fill: "am2", outline: 3, outlineColor: "k", shadow: [0, 4], shadowColor: "#00000080" })
font("body", { family: "Fira Sans", weight: 600, size: 22, fill: "w", outline: 2, outlineColor: "k" })
