// Same five swamp effects as pxl trials/2026-10-26-swamp-vfx, built with vex particles(). Same canvas sizes, 16 frames @ 16 fps.
// Dark swamp ground drawn into each frame so pxl can palette-quantize it to pixel art afterwards.
pal({ n: "#1e2a1e",
  y0: "#6b4a1a", y1: "#b8862a", y2: "#e8d24a", y3: "#fff6c0",
  w0: "#2a4f9a", w1: "#4f8ad8", w2: "#9ad8e8", w3: "#e0f6fa",
  s0: "#5c5e52", s1: "#8a8c7e", s2: "#a8aa9a", s3: "#c4c6b6",
  g0: "#2a7a5a", g1: "#4fc08a", g2: "#7ae8a8", g3: "#e0fff0" })
const ground = (w, h) => rect(0, 0, w, h, { fill: "n" })

anim("fx_fireflies", { w: 40, h: 32, frames: 16, fps: 16 }, ground(40, 32),
  particles({ area: [4, 4, 32, 24], rate: 0.6, life: [12, 20], speed: [0.1, 0.35], angle: [0, 360], drag: 0.02,
    size: [[2, 2.5], [2, 2.5]], color: ["y1", "y3", "y2", "y1"], opacity: [1, 1], glow: 2, blend: "screen", seed: 3 }))

anim("fx_splash", { w: 32, h: 24, frames: 16, fps: 16 }, ground(32, 24),
  particles({ at: [16, 14], burst: 1, start: 0, life: 14, speed: 0, size: [2, 9], color: ["w3", "w2", "w1"], opacity: [1, 0], shape: "ring", seed: 1 }),
  particles({ at: [16, 18], burst: 12, start: 0, life: [9, 14], speed: [0.8, 1.6], angle: [-150, -30], gravity: [0, 0.18],
    size: [1.6, 1], color: ["w3", "w2", "w1"], opacity: [1, 0.6], seed: 2 }))

anim("fx_sparkle", { w: 32, h: 32, frames: 16, fps: 16 }, ground(32, 32),
  particles({ at: [16, 16], burst: 1, start: 0, life: 4, speed: 0, size: [8, 14], color: ["y3"], opacity: [1, 0], glow: 4, seed: 1 }),
  particles({ at: [16, 16], burst: 12, start: 0, life: [10, 15], speed: [1.2, 2], angle: [0, 360], drag: 0.15, spin: [-10, 10],
    size: [[3, 4], 0.5], color: ["y3", "y2", "y1", "y0"], shape: "star", glow: 1.5, seed: 2 }))

anim("fx_smoke", { w: 24, h: 40, frames: 16, fps: 16 }, ground(24, 40),
  particles({ area: [9, 32, 6, 3], rate: 0.5, life: [14, 18], speed: [0.9, 1.4], angle: [-98, -82], drag: 0.02, gravity: [0.02, 0],
    size: [[3, 4], [9, 12]], color: ["s3", "s2", "s1", "s0"], opacity: [0.9, 0], seed: 1 }))

anim("fx_wisp", { w: 24, h: 32, frames: 16, fps: 16 }, ground(24, 32),
  circle(12, 22, 3, { fill: "g3", glow: { r: 5, color: "g1", strength: 1.5 } }),
  particles({ area: [9, 20, 6, 3], rate: 1.2, life: [8, 12], speed: [0.8, 1.3], angle: [-110, -70], drag: 0.03,
    size: [[4, 5], 0.5], color: ["g3", "g2", "g1", "g0"], opacity: [0.9, 0.3], glow: 1.5, blend: "screen", seed: 4 }))
