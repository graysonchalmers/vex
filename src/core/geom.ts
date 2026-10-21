// Path data builders for the shapes that SVG has no element for.
import { VexError } from "./errors.ts";
import { n } from "./util.ts";

type P = [number, number];

export function points(flat: unknown, what: string, min: number): P[] {
  if (!Array.isArray(flat) || flat.length % 2 || !flat.every((v) => typeof v === "number" && Number.isFinite(v)))
    throw new VexError(`${what}: points must be a flat number list [x0, y0, x1, y1, ...]`);
  const out: P[] = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  if (out.length < min) throw new VexError(`${what}: needs at least ${min} points, got ${out.length}`);
  return out;
}

export function polyD(ps: P[], closed: boolean): string {
  return "M" + ps.map((p) => `${n(p[0])} ${n(p[1])}`).join("L") + (closed ? "Z" : "");
}

/** Catmull-Rom spline through every point, as cubic Béziers. tension 0 = straight, 1 = round. */
export function smoothD(ps: P[], closed: boolean, tension = 1): string {
  const len = ps.length;
  const at = (i: number): P => (closed ? ps[((i % len) + len) % len] : ps[Math.max(0, Math.min(len - 1, i))]);
  const k = tension / 6;
  let d = `M${n(ps[0][0])} ${n(ps[0][1])}`;
  const segs = closed ? len : len - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: P = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: P = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + (closed ? "Z" : "");
}

/** Regular polygon / star. Points start straight up, then go clockwise; rot in degrees. */
export function starD(cx: number, cy: number, count: number, r1: number, r2: number, rot = 0): string {
  if (!(count >= 2)) throw new VexError("star/ngon: needs at least 2 points");
  const ps: P[] = [];
  const total = r2 === r1 ? count : count * 2;
  for (let i = 0; i < total; i++) {
    const a = ((rot - 90) * Math.PI) / 180 + (i * 2 * Math.PI) / total;
    const r = i % 2 && r2 !== r1 ? r2 : r1;
    ps.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return polyD(ps, true);
}

/** Arc from a0 to a1 degrees (0 = up, clockwise). pie: closed through the center. */
export function arcD(cx: number, cy: number, r: number, a0: number, a1: number, pie: boolean): string {
  const pt = (a: number): P => {
    const t = ((a - 90) * Math.PI) / 180;
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r];
  };
  const sweep = a1 - a0;
  if (Math.abs(sweep) >= 360) {
    // Two half arcs: a single 360° arc has coinciding endpoints and draws nothing.
    const [x0, y0] = pt(a0), [x1, y1] = pt(a0 + 180);
    return `M${n(x0)} ${n(y0)}A${n(r)} ${n(r)} 0 1 1 ${n(x1)} ${n(y1)}A${n(r)} ${n(r)} 0 1 1 ${n(x0)} ${n(y0)}Z`;
  }
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
  const large = Math.abs(sweep) > 180 ? 1 : 0, dir = sweep >= 0 ? 1 : 0;
  const arc = `A${n(r)} ${n(r)} 0 ${large} ${dir} ${n(x1)} ${n(y1)}`;
  return pie ? `M${n(cx)} ${n(cy)}L${n(x0)} ${n(y0)}${arc}Z` : `M${n(x0)} ${n(y0)}${arc}`;
}
