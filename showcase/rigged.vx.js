// Skeletal animation: the Forest Kit hero, side view, rigged with bones and keyframed clips.
pal({
  k: "#1d1626", w: "#fff8ec",
  sk0: "#b5654f", sk1: "#f0a882", hr0: "#5a2a1c", hr1: "#a3512b", hr2: "#e08a45",
  tn0: "#22356a", tn1: "#3b67c0", tn2: "#79acf5", lt0: "#3b2622", lt1: "#6e4535", lt2: "#9c6a4d",
  rd1: "#d8374c", mt1: "#8790ad", mt2: "#d9dff2", gd1: "#f2a72f",
})
const OL = { outline: "k", ow: 1.5 }

// Joints (rest pose, character faces right). Every bone rotates about its pivot.
const J = { hip: [24, 40], neck: [24, 25], shoulder: [24, 28], elbow: [24, 35], knee: [24, 49] }

const limb = (x0, y0, x1, y1, w, c) => line([x0, y0, x1, y1], { stroke: c, sw: w, cap: "round" })
const leg = (dark) => [limb(24, 40, 24, 49, 5.2, dark ? "tn0" : "tn1")]
const shin = (dark) => [limb(24, 49, 24, 57, 4.6, dark ? "tn0" : "tn1"),
  path("M21 56H27.5C29.5 56 30.5 57.5 30.5 59.5V61H21Z", dark ? "lt0" : "lt1")]
const arm = (dark) => [limb(24, 28, 24, 35, 4, dark ? "tn0" : "tn1")]
const forearm = (dark) => [limb(24, 35, 24, 41, 3.6, dark ? "sk0" : "sk1"), circle(24, 42, 2.3, dark ? "sk0" : "sk1")]

const HERO = rig({
  hips:     { pivot: J.hip, z: 5, items: [rect(19.5, 37, 9, 5, { fill: "lt1", r: 1.5 }), rect(23, 37.6, 2.6, 3, { fill: "gd1", r: 0.5 })] },
  legB:     { parent: "hips", pivot: J.hip, z: 1, items: leg(true) },
  shinB:    { parent: "legB", pivot: J.knee, z: 1, items: shin(true) },
  legF:     { parent: "hips", pivot: J.hip, z: 6, items: leg(false) },
  shinF:    { parent: "legF", pivot: J.knee, z: 6, items: shin(false) },
  torso:    { parent: "hips", pivot: J.hip, z: 4, items: [
    rect(19, 24, 10, 16, { fill: "tn1", r: 3.5 }), rect(20.4, 26, 2, 11, { fill: "tn2", r: 1, opacity: 0.8 }),
    rect(18.5, 23, 11, 3.6, { fill: "rd1", r: 1.8 }), blob([19, 24, 13, 26, 12, 30, 17, 27], "rd1")] },   // scarf tail flies back
  head:     { parent: "torso", pivot: J.neck, z: 7, items: [
    circle(24, 16, 8.5, "hr0"),
    circle(25.5, 17, 7.2, "sk1"),
    ellipse(29.3, 16, 1.2, 1.9, "k"), circle(29.6, 15.2, 0.5, "w"),
    ellipse(28.5, 20.2, 1.5, 0.9, { fill: "rd1", opacity: 0.45 }),
    blob([16, 17, 17, 10, 23, 7, 30, 8.5, 33, 13, 31, 12, 27, 11.5, 24.5, 13.5, 21, 13, 19, 17], { fill: "hr1", smooth: 0.8 }),
    curve([19.5, 10.5, 23, 8.5, 27, 8.6], { stroke: "hr2", sw: 1.1, opacity: 0.8 })] },
  armB:     { parent: "torso", pivot: J.shoulder, z: 0, items: arm(true) },
  forearmB: { parent: "armB", pivot: J.elbow, z: 0, items: forearm(true) },
  armF:     { parent: "torso", pivot: J.shoulder, z: 8, items: arm(false) },
  forearmF: { parent: "armF", pivot: J.elbow, z: 8, items: forearm(false) },
  sword:    { parent: "forearmF", pivot: [24, 42], z: 9, items: [
    poly([23, 42, 25, 42, 25.6, 58, 24, 61, 22.4, 58], { fill: lin(["mt2", "mt1"], 0) }),
    rect(20, 41, 8, 2, { fill: "gd1", r: 1 }), rect(23, 38.5, 2, 3, "lt1")] },
})

sprite("hero_rest", { w: 48, h: 64, ...OL }, pose(HERO))

// ------------------------------------------------------------------ clips
// Keys are [frame, value, ease into the next key]; frames loop, so the last key matches the first.
// Positive rotation is clockwise: for a character facing right, negative swings a limb forward.

const IDLE = {
  torso: { rot: [[0, 0], [6, 1.5], [12, 0]] },
  head: { rot: [[0, 0], [6, -2.5], [12, 0]] },
  hips: { move: [[0, [0, 0]], [6, [0, 0.6]], [12, [0, 0]]] },
  legF: { rot: [[0, -3]] }, legB: { rot: [[0, 4]] },
  armF: { rot: [[0, -10], [6, -14], [12, -10]] }, forearmF: { rot: [[0, -25], [6, -30], [12, -25]] },
  armB: { rot: [[0, 8], [6, 11], [12, 8]] }, forearmB: { rot: [[0, -12]] },
  // the sword's world angle is arm + forearm + sword: +35 makes it hang down at his side
  sword: { rot: [[0, 35], [6, 40], [12, 35]] },
}

const WALK = {
  hips: { move: [[0, [0, 0]], [2, [0, -1.4]], [4, [0, 0]], [6, [0, -1.4]], [8, [0, 0]]] },
  torso: { rot: [[0, -3]] },
  legF: { rot: [[0, -28], [4, 24], [8, -28]] }, shinF: { rot: [[0, 4], [4, 6], [6, 42], [8, 4]] },
  legB: { rot: [[0, 24], [4, -28], [8, 24]] }, shinB: { rot: [[0, 6], [2, 42], [4, 4], [8, 6]] },
  armF: { rot: [[0, 22], [4, -22], [8, 22]] }, forearmF: { rot: [[0, -20], [4, -40], [8, -20]] },
  armB: { rot: [[0, -22], [4, 22], [8, -22]] }, forearmB: { rot: [[0, -40], [4, -20], [8, -40]] },
  head: { rot: [[0, 2], [4, 0], [8, 2]] },
  sword: { rot: [[0, 40], [4, 62], [8, 40]] },
}

const RUN = {
  hips: { move: [[0, [0, 0]], [2, [0, -3]], [4, [0, 0]], [6, [0, -3]], [8, [0, 0]]] },
  torso: { rot: [[0, -14]] }, head: { rot: [[0, 10]] },
  legF: { rot: [[0, -50], [4, 38], [8, -50]] }, shinF: { rot: [[0, 20], [3, 10], [5, 85], [8, 20]] },
  legB: { rot: [[0, 38], [4, -50], [8, 38]] }, shinB: { rot: [[0, 10], [1, 85], [4, 20], [7, 10], [8, 10]] },
  armF: { rot: [[0, 45], [4, -45], [8, 45]] }, forearmF: { rot: [[0, -80]] },
  armB: { rot: [[0, -45], [4, 45], [8, -45]] }, forearmB: { rot: [[0, -80]] },
  sword: { rot: [[0, 90]] },
}

// Anticipation crouch, take-off stretch, tuck at the top, land, recover.
const JUMP = {
  hips: { move: [[0, [0, 0]], [2, [0, 4], "out"], [4, [0, -10], "out"], [7, [0, -16], "in"], [10, [0, 2], "out"], [12, [0, 0]]] },
  torso: { rot: [[0, 0], [2, -12], [4, 4], [7, 0], [10, -10], [12, 0]] },
  legF: { rot: [[0, 0], [2, -40], [4, 8], [7, -60], [10, -35], [12, 0]] }, shinF: { rot: [[0, 0], [2, 70], [4, 0], [7, 90], [10, 60], [12, 0]] },
  legB: { rot: [[0, 0], [2, -30], [4, 14], [7, -35], [10, -25], [12, 0]] }, shinB: { rot: [[0, 0], [2, 60], [4, 4], [7, 70], [10, 50], [12, 0]] },
  armF: { rot: [[0, -10], [2, 40], [4, -150], [7, -120], [10, 30], [12, -10]] }, forearmF: { rot: [[0, -25], [4, -10], [7, -40], [12, -25]] },
  armB: { rot: [[0, 8], [2, 45], [4, -140], [7, -110], [10, 35], [12, 8]] }, forearmB: { rot: [[0, -12], [4, -10], [7, -40], [12, -12]] },
  sword: { rot: [[0, 35], [4, 60], [10, 35]] },
}

// Wind-up behind the head, fast slash ("in" eases accelerate), follow-through, settle.
const ATTACK = {
  torso: { rot: [[0, 0], [3, 8], [5, -14, "out"], [7, -10], [10, 0]] },
  hips: { move: [[0, [0, 0]], [3, [-1.5, 0]], [5, [2.5, 0], "out"], [10, [0, 0]]] },
  armF: { rot: [[0, -10], [3, -165, "in"], [5, -30, "out"], [7, -15], [10, -10]] }, forearmF: { rot: [[0, -25], [3, -50], [5, 0], [10, -25]] },
  sword: { rot: [[0, 35], [3, -100], [5, -95], [10, 35]] },
  armB: { rot: [[0, 8], [3, 30], [5, -25], [10, 8]] },
  legF: { rot: [[0, -3], [3, -8], [5, -30], [10, -3]] }, shinF: { rot: [[0, 0], [5, 20], [10, 0]] },
  legB: { rot: [[0, 4], [5, 22], [10, 4]] },
  head: { rot: [[0, 0], [3, -6], [5, 6], [10, 0]] },
}

const BOX = { w: 48, h: 64, scale: 2, ...OL }
anim("hero_idle", { ...BOX, frames: 12, fps: 8 }, pose(HERO, IDLE))
anim("hero_walk", { ...BOX, frames: 8, fps: 10 }, pose(HERO, WALK))
anim("hero_run", { ...BOX, frames: 8, fps: 14 }, pose(HERO, RUN))
// The jump rises 16 units: give it 20 units of headroom so the peak stays in frame.
anim("hero_jump", { ...BOX, h: 84, frames: 12, fps: 14 }, tf({ y: 20 }, pose(HERO, JUMP)))
anim("hero_attack", { ...BOX, frames: 10, fps: 16 }, pose(HERO, ATTACK))

// Showreel: every clip at its own speed (a 24 fps reel; each clip steps at its own fps).
const CLIPS = [["hero_idle", 12, 8], ["hero_walk", 8, 10], ["hero_run", 8, 14], ["hero_jump", 12, 14], ["hero_attack", 10, 16]]
anim("rig_showreel", { w: 290, h: 96, frames: 120, fps: 24, scale: 3, bg: "#232033" },
  rect(0, 80, 290, 16, "#2c2840"),
  (f) => CLIPS.map(([name, n, fps], i) =>
    stamp(name, 8 + i * 56, 80, { anchor: [0, 1], frame: Math.floor((f.i * fps) / 24) % n })),
  CLIPS.map(([name], i) => text(30 + i * 56, 91, name.slice(5).toUpperCase(), { fill: "#9a93ab", size: 6, anchor: "middle", weight: "bold", font: "DejaVu Sans" })))

sheet("hero_rigged", ["hero_idle", "hero_walk", "hero_run", "hero_jump", "hero_attack"], { pad: 2, scale: 2 })

// Spine export: the same rig and clips as a Spine 4.1 skeleton + atlas (out/spine/).
spine("hero", HERO, { w: 48, h: 64, scale: 4, outline: "k", ow: 1.2, clips: {
  idle: { clip: IDLE, frames: 12, fps: 8 }, walk: { clip: WALK, frames: 8, fps: 10 }, run: { clip: RUN, frames: 8, fps: 14 },
  jump: { clip: JUMP, frames: 12, fps: 14 }, attack: { clip: ATTACK, frames: 10, fps: 16 } } })
