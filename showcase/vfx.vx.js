// VFX: particle effects as looping or one-shot anims, ready as sprite sheets.
pal({ k: "#1d1626", w: "#fff8ec",
  fi0: "#9a2a1c", fi1: "#d9452c", fi2: "#ff9b2f", fi3: "#ffe86e", fi4: "#fffbe0",
  sm0: "#2a2833", sm1: "#4a4757", sm2: "#7a7790",
  mg0: "#3b2a8a", mg1: "#7a4dff", mg2: "#c7a6ff", mg3: "#f2eaff",
  dt1: "#9b6449", dt2: "#c9a17a" })

// Fire: an ember core, flames rising and shrinking, sparks escaping, smoke above. Loops.
anim("fx_fire", { w: 48, h: 64, frames: 24, fps: 16, scale: 2 },
  particles({ area: [18, 30, 12, 4], rate: 0.7, life: [16, 24], speed: [0.4, 0.7], angle: [-100, -80], gravity: [0.01, -0.01],
    size: [[3, 4], [8, 11]], color: ["sm1", "sm0"], opacity: [0.3, 0], seed: 3 }),
  // flames: born small and hot at the base, rising, swelling then shrinking as they cool
  particles({ area: [19, 50, 10, 4], rate: 3, life: [10, 15], speed: [1.0, 1.6], angle: [-104, -76], gravity: [0, -0.05], drag: 0.03,
    size: [[5, 7], 0.5], color: ["fi3", "fi2", "fi2", "fi1", "fi0"], opacity: [0.9, 0.3], glow: 1.5, blend: "screen", seed: 1 }),
  particles({ area: [21, 50, 6, 3], rate: 2, life: [6, 9], speed: [0.6, 1.0], angle: [-95, -85],
    size: [[4, 5], 1], color: ["fi4", "fi3"], opacity: [0.9, 0.4], seed: 7 }),
  particles({ area: [18, 46, 12, 4], rate: 0.5, life: [12, 20], speed: [1.2, 2.2], angle: [-120, -60], gravity: [0, 0.02],
    size: [1.8, 0.4], color: ["fi3", "fi2"], shape: "spark", glow: 1.5, seed: 5 }),
  ellipse(24, 55, 9, 2.2, { fill: "fi1", opacity: 0.8, glow: 3 }))

// Explosion: flash, shockwave ring, fireball, sparks, debris, then smoke. One shot.
anim("fx_explosion", { w: 96, h: 96, frames: 30, fps: 24, scale: 2 },
  // smoke first, so the fire draws over it; it starts once the fireball is fading
  particles({ at: [48, 50], burst: 16, start: 7, life: [16, 23], speed: [0.4, 1.2], angle: [0, 360], drag: 0.05, gravity: [0, -0.07],
    size: [[10, 14], [20, 26]], color: ["sm2", "sm1", "sm0"], opacity: [0.6, 0], seed: 6 }),
  particles({ at: [48, 50], burst: 1, life: 4, speed: 0, size: [30, 56], color: ["fi4"], opacity: [1, 0], glow: 8, seed: 1 }),
  particles({ at: [48, 50], burst: 1, life: 14, speed: 0, size: [6, 42], color: ["fi3", "fi2"], opacity: [0.9, 0], shape: "ring", seed: 2 }),
  particles({ at: [48, 50], burst: 30, life: [9, 18], speed: [1.4, 3.2], angle: [0, 360], drag: 0.13, gravity: [0, -0.04],
    size: [[12, 18], 3], color: ["fi4", "fi3", "fi2", "fi1", "fi0"], opacity: [1, 0], glow: 4, seed: 3 }),
  particles({ at: [48, 50], burst: 20, life: [8, 16], speed: [2.4, 3.6], angle: [0, 360], drag: 0.08, gravity: [0, 0.1],
    size: [3.4, 1], color: ["fi4", "fi3", "fi2"], shape: "spark", glow: 2, seed: 4 }),
  particles({ at: [48, 50], burst: 8, life: [16, 24], speed: [1.2, 2.2], angle: [200, 340], drag: 0.03, gravity: [0, 0.16], spin: [-14, 14],
    size: [2.6, 2], color: ["k"], opacity: [1, 1], shape: "square", seed: 5 }))

// Magic: sparkles spiralling up around a glowing core. Loops.
anim("fx_magic", { w: 48, h: 64, frames: 24, fps: 16, scale: 2 },
  circle(24, 50, 4, { fill: "mg2", opacity: 0.8, glow: { r: 5, color: "mg1", strength: 2 } }),
  particles({ area: [12, 42, 24, 10], rate: 1.2, life: [14, 22], speed: [0.9, 1.5], angle: [-100, -80], spin: [-12, 12], drag: 0.02,
    size: [[3, 5], 0], color: ["mg3", "mg2", "mg1"], shape: "star", glow: 1.5, seed: 2 }),
  particles({ area: [16, 46, 16, 6], rate: 1.6, life: [12, 18], speed: [0.6, 1.1], angle: [-115, -65],
    size: [1.4, 0], color: ["mg3", "mg2"], seed: 4 }))

// Smoke column. Loops.
anim("fx_smoke", { w: 48, h: 80, frames: 32, fps: 16, scale: 2 },
  particles({ area: [20, 70, 8, 4], rate: 0.9, life: [24, 34], speed: [0.5, 0.8], angle: [-98, -82], drag: 0.01, gravity: [0.015, -0.005],
    size: [[5, 7], [18, 24]], color: ["sm2", "sm1", "sm0"], opacity: [0.6, 0], seed: 1 }))

// Hit sparks and a dust puff: tiny one-shots for combat and landings.
anim("fx_hit", { w: 48, h: 48, frames: 10, fps: 24, scale: 2 },
  particles({ at: [24, 24], burst: 1, life: 4, speed: 0, size: [6, 18], color: ["w"], opacity: [1, 0], shape: "star", glow: 4, seed: 1 }),
  particles({ at: [24, 24], burst: 12, life: [5, 9], speed: [2.5, 4], angle: [0, 360], drag: 0.15,
    size: [1.6, 0.6], color: ["w", "fi3"], shape: "spark", glow: 2, seed: 2 }))
anim("fx_dust", { w: 64, h: 32, frames: 14, fps: 20, scale: 2 },
  particles({ at: [32, 28], burst: 14, life: [9, 13], speed: [0.8, 1.8], angle: [-175, -5], drag: 0.12, gravity: [0, -0.02],
    size: [[3, 5], [7, 10]], color: ["dt2", "dt1"], opacity: [0.8, 0], seed: 3 }))

sheet("vfx", ["fx_*"], { pad: 2, scale: 1 })

// Showreel on a dark stage: loops play continuously, one-shots replay every 1.5 s.
anim("vfx_showreel", { w: 340, h: 110, frames: 48, fps: 24, scale: 3, bg: "#161420" },
  rect(0, 92, 340, 18, "#221f2e"),
  (f) => [["fx_fire", 30, 92, 24, 16], ["fx_magic", 85, 92, 24, 16], ["fx_smoke", 140, 92, 32, 16],
    ["fx_explosion", 205, 92, 30, 24], ["fx_hit", 262, 70, 10, 24], ["fx_dust", 310, 92, 14, 20]].map(([n, x, y, frames, fps]) =>
      stamp(n, x, y, { anchor: "bottom", frame: Math.floor((f.i * fps) / 24) % frames })))
