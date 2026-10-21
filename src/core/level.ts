// Tile levels: an ASCII map (or a function that generates one) plus a legend that turns each
// character into a fixed tile, an autotiled terrain, or a game object.
import { VexError, didYouMean } from "./errors.ts";

export interface Neighbors {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  /** Diagonals, for rules that want inner corners. */
  upLeft: boolean;
  upRight: boolean;
  downLeft: boolean;
  downRight: boolean;
}

export type Rule = (n: Neighbors, x: number, y: number) => string;

export type LegendEntry =
  | { tile: string }
  | { terrain: Rule; group: string }
  | { object: string; type?: string; props?: Record<string, unknown> };

export interface LevelObject {
  id: number;
  name: string;
  type: string;
  /** Grid cell. */
  col: number;
  row: number;
  props: Record<string, unknown>;
}

export interface LevelGrid {
  cols: number;
  rows: number;
  /** Tile key per cell, row-major; null = empty. */
  tiles: (string | null)[];
  objects: LevelObject[];
}

/**
 * The classic platformer rule: grass where the cell above is open, dirt below it,
 * with left / right caps where the terrain ends.
 */
export const platformer = (keys: { top: string; topL: string; topR: string; fill: string; fillL: string; fillR: string }): Rule =>
  (n) => {
    const side = !n.left ? "L" : !n.right ? "R" : "";
    return n.up ? (side === "L" ? keys.fillL : side === "R" ? keys.fillR : keys.fill) : side === "L" ? keys.topL : side === "R" ? keys.topR : keys.top;
  };

export function parseMap(map: string): string[] {
  const rows = map.split("\n").map((r) => r.replace(/\s+$/, ""));
  while (rows.length && !rows[0].trim()) rows.shift();
  while (rows.length && !rows[rows.length - 1].trim()) rows.pop();
  if (!rows.length) throw new VexError("level map is empty");
  const indent = Math.min(...rows.filter((r) => r.trim()).map((r) => r.length - r.trimStart().length));
  return rows.map((r) => r.slice(indent));
}

export function buildGrid(rows: string[], legend: Map<string, LegendEntry>, tileKeys: Set<string>): LevelGrid {
  const cols = Math.max(...rows.map((r) => r.length)), nrows = rows.length;
  const at = (x: number, y: number) => (y < 0 || y >= nrows || x < 0 || x >= cols ? " " : rows[y][x] ?? " ");
  const group = (ch: string) => { const e = legend.get(ch); return e && "terrain" in e ? e.group : e && "tile" in e ? "tile:" + ch : undefined; };
  const tiles: (string | null)[] = new Array(cols * nrows).fill(null);
  const objects: LevelObject[] = [];
  for (let y = 0; y < nrows; y++)
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      if (ch === " " || ch === ".") continue;
      const e = legend.get(ch);
      if (!e) throw new VexError(`map row ${y + 1}, column ${x + 1}: '${ch}' is not in the legend${didYouMean(ch, legend.keys())} (legend: ${[...legend.keys()].join(" ")}; "." and space are empty)`);
      if ("object" in e) { objects.push({ id: objects.length + 1, name: e.object, type: e.type ?? e.object, col: x, row: y, props: e.props ?? {} }); continue; }
      let key: string;
      if ("tile" in e) key = e.tile;
      else {
        const g = e.group, same = (dx: number, dy: number) => group(at(x + dx, y + dy)) === g;
        key = e.terrain({ up: same(0, -1), down: same(0, 1), left: same(-1, 0), right: same(1, 0),
          upLeft: same(-1, -1), upRight: same(1, -1), downLeft: same(-1, 1), downRight: same(1, 1) }, x, y);
      }
      if (!tileKeys.has(key)) throw new VexError(`map row ${y + 1}, column ${x + 1}: tile '${key}' is not in the tileset${didYouMean(key, tileKeys)}`);
      tiles[y * cols + x] = key;
    }
  return { cols, rows: nrows, tiles, objects };
}
