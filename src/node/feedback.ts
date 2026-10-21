// Feedback from the live viewer: strokes drawn over an asset and numbered notes, in the asset's own
// units (its viewBox), written next to the build outputs so an agent can map them to coordinates.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../core/project.ts";

export class FeedbackError extends Error {}

interface Stroke { color: string; width: number; points: [number, number][] }
interface Note { x: number; y: number; text: string }

const MAX_STROKES = 2000, MAX_POINTS = 20000, MAX_NOTES = 200, MAX_TEXT = 4000;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Validate and write `<out>/_feedback/<name>.{json,annotated.png,marks.svg,current.svg}`. */
export function writeFeedback(p: Project, out: string, body: unknown): { files: string[]; summary: string } {
  if (typeof body !== "object" || body === null) throw new FeedbackError("feedback must be a JSON object");
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" && p.assets.has(b.name) ? b.name : undefined;
  if (!name) throw new FeedbackError(`unknown asset ${JSON.stringify(b.name)}`);
  const box = p.build(name).box;

  let points = 0;
  const strokes: Stroke[] = (Array.isArray(b.strokes) ? b.strokes : []).slice(0, MAX_STROKES).flatMap((s) => {
    if (!s || typeof s.color !== "string" || !/^#[0-9a-f]{6}$/i.test(s.color) || !num(s.width) || !Array.isArray(s.points)) return [];
    const pts = s.points.filter((q: unknown) => Array.isArray(q) && num(q[0]) && num(q[1])).map((q: number[]) => [q[0], q[1]] as [number, number]);
    if (!pts.length || (points += pts.length) > MAX_POINTS) return [];
    return [{ color: s.color.toLowerCase(), width: Math.max(0.01, Math.min(box.w, s.width)), points: pts }];
  });
  const notes: Note[] = (Array.isArray(b.notes) ? b.notes : []).slice(0, MAX_NOTES).flatMap((n) =>
    n && num(n.x) && num(n.y) && typeof n.text === "string" ? [{ x: n.x, y: n.y, text: n.text.slice(0, MAX_TEXT) }] : []);
  const comment = typeof b.comment === "string" ? b.comment.slice(0, MAX_TEXT) : "";

  // Palette colors mean "make it this color"; anything else points at something.
  const table = p.build(name).pal.table();
  const keyOf = new Map(Object.entries(table).map(([k, v]) => [String(v).toLowerCase(), k]));
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const strokesOut = strokes.map((s) => {
    const xs = s.points.map((q) => q[0]), ys = s.points.map((q) => q[1]), key = keyOf.get(s.color) ?? null;
    return { color: s.color, key, kind: key === null ? "markup" : "palette", width: r2(s.width),
      bbox: [r2(Math.min(...xs)), r2(Math.min(...ys)), r2(Math.max(...xs)), r2(Math.max(...ys))], points: s.points.map((q) => [r2(q[0]), r2(q[1])]) };
  });

  const dir = join(out, "_feedback");
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  const put = (file: string, data: string | Buffer) => { const path = join(dir, file); writeFileSync(path, data); files.push(path); };
  put(`${name}.current.svg`, p.svg(name, 0, 1));
  const pins = notes.map((n, i) => `<g><circle cx="${n.x}" cy="${n.y}" r="${box.w / 60}" fill="#ffb454"/><text x="${n.x}" y="${n.y}" font-size="${box.w / 45}" text-anchor="middle" dominant-baseline="central" fill="#15131c" font-family="monospace">${i + 1}</text></g>`).join("");
  put(`${name}.marks.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">` +
    strokes.map((s) => `<polyline points="${s.points.map((q) => q.join(",")).join(" ")}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`).join("") +
    pins + `</svg>\n`);
  const hasPng = typeof b.annotated === "string" && b.annotated.startsWith("data:image/png;base64,");
  if (hasPng) put(`${name}.annotated.png`, Buffer.from((b.annotated as string).slice(22), "base64"));
  put(`${name}.json`, JSON.stringify({
    asset: name, box, units: "asset units (the viewBox, same as the art file)", time: new Date().toISOString(), comment,
    notes: notes.map((n, i) => ({ n: i + 1, x: r2(n.x), y: r2(n.y), text: n.text })),
    strokes: strokesOut,
    images: { annotated: hasPng ? `${name}.annotated.png` : null, marks: `${name}.marks.svg`, current: `${name}.current.svg` },
  }, null, 1) + "\n");
  return { files, summary: `${notes.length} note${notes.length === 1 ? "" : "s"}, ${strokes.length} stroke${strokes.length === 1 ? "" : "s"}${comment ? ", a comment" : ""}` };
}
