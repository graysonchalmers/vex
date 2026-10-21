// Tiled export for levels: a tileset atlas, the map as Tiled JSON (.tmj) and TMX, and a Phaser
// page that loads the .tmj the way a game would.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { esc } from "../core/util.ts";
import type { LevelDef, Project } from "../core/project.ts";
import { pack } from "./output.ts";
import { png } from "./raster.ts";

export function writeLevel(p: Project, lv: LevelDef, outDir: string): string {
  const ts = lv.tileset, S = ts.size, px = S * lv.scale;
  const dir = join(outDir, "levels");
  mkdirSync(dir, { recursive: true });

  // Tileset image: one cell per tile, in tile-id order, `px` pixels square.
  const cols = Math.min(8, ts.tiles.length);
  const cells = ts.tiles.map(([key, asset]) => {
    const b = p.build(asset), k = S / b.w;
    return { name: key, svg: p.svg(asset, 0, 1), box: { x: b.box.x, y: b.box.y, w: b.w, h: b.h }, scale: k };
  });
  const packed = pack(cells.map((c) => ({ name: c.name, svg: c.svg, box: c.box })), px / cells[0].box.w, cols, 0);
  writeFileSync(join(dir, `${ts.name}.png`), png(packed.svg));
  const gid = new Map(ts.tiles.map(([k], i) => [k, i + 1]));
  const rows = Math.ceil(ts.tiles.length / cols);

  const g = lv.grid;
  const data = g.tiles.map((k) => (k ? gid.get(k)! : 0));
  const objects = g.objects.map((o) => ({
    id: o.id, name: o.name, type: o.type, x: o.col * px, y: o.row * px, width: px, height: px, rotation: 0, visible: true,
    properties: Object.entries(o.props).map(([name, value]) => ({ name, type: typeof value === "number" ? (Number.isInteger(value) ? "int" : "float") : typeof value === "boolean" ? "bool" : "string", value })),
  }));
  const tileset = { firstgid: 1, name: ts.name, image: `${ts.name}.png`, imagewidth: cols * px, imageheight: rows * px,
    tilewidth: px, tileheight: px, tilecount: ts.tiles.length, columns: cols, margin: 0, spacing: 0,
    tiles: ts.tiles.map(([key], i) => ({ id: i, type: key, properties: [{ name: "key", type: "string", value: key }] })) };
  const tmj = {
    type: "map", version: "1.10", tiledversion: "1.10.2", orientation: "orthogonal", renderorder: "right-down", infinite: false,
    width: g.cols, height: g.rows, tilewidth: px, tileheight: px, nextlayerid: 3, nextobjectid: objects.length + 1,
    layers: [
      { id: 1, name: "ground", type: "tilelayer", width: g.cols, height: g.rows, x: 0, y: 0, opacity: 1, visible: true, data },
      { id: 2, name: "objects", type: "objectgroup", draworder: "topdown", x: 0, y: 0, opacity: 1, visible: true, objects },
    ],
    tilesets: [tileset],
  };
  writeFileSync(join(dir, `${lv.name}.tmj`), JSON.stringify(tmj, null, 1) + "\n");

  const csv = Array.from({ length: g.rows }, (_, y) => data.slice(y * g.cols, (y + 1) * g.cols).join(",")).join(",\n");
  const tmx = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.10.2" orientation="orthogonal" renderorder="right-down" width="${g.cols}" height="${g.rows}" tilewidth="${px}" tileheight="${px}" infinite="0" nextlayerid="3" nextobjectid="${objects.length + 1}">
 <tileset firstgid="1" name="${esc(ts.name)}" tilewidth="${px}" tileheight="${px}" tilecount="${ts.tiles.length}" columns="${cols}">
  <image source="${esc(ts.name)}.png" width="${cols * px}" height="${rows * px}"/>
${ts.tiles.map(([key], i) => `  <tile id="${i}" type="${esc(key)}"/>`).join("\n")}
 </tileset>
 <layer id="1" name="ground" width="${g.cols}" height="${g.rows}">
  <data encoding="csv">
${csv}
</data>
 </layer>
 <objectgroup id="2" name="objects">
${objects.map((o) => `  <object id="${o.id}" name="${esc(o.name)}" type="${esc(o.type)}" x="${o.x}" y="${o.y}" width="${px}" height="${px}"${o.properties.length ? `>\n   <properties>\n${o.properties.map((q) => `    <property name="${esc(q.name)}" type="${q.type}" value="${esc(String(q.value))}"/>`).join("\n")}\n   </properties>\n  </object>` : "/>"}`).join("\n")}
 </objectgroup>
</map>
`;
  writeFileSync(join(dir, `${lv.name}.tmx`), tmx);

  // Phaser check: load the .tmj like a game, draw the ground layer, outline objects, pan the camera.
  writeFileSync(join(dir, `${lv.name}.html`), `<!doctype html><html><head><meta charset="utf-8"><title>${lv.name} · Phaser</title>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
<style>body{margin:0;background:#111}</style></head><body><script>
new Phaser.Game({ type: Phaser.AUTO, width: 960, height: ${Math.min(640, g.rows * px)}, backgroundColor: "#7fc4f5", pixelArt: false,
  scene: { preload() { this.load.tilemapTiledJSON("map", "${lv.name}.tmj"); this.load.image("tiles", "${ts.name}.png"); },
    create() {
      const map = this.make.tilemap({ key: "map" }), tiles = map.addTilesetImage("${ts.name}", "tiles");
      const ground = map.createLayer("ground", tiles, 0, 0);
      ground.setCollisionByExclusion([-1]);
      const objs = map.getObjectLayer("objects").objects;
      for (const o of objs) {
        this.add.rectangle(o.x + o.width / 2, o.y + o.height / 2, o.width - 4, o.height - 4).setStrokeStyle(3, 0xff3048);
        this.add.text(o.x + 4, o.y + 4, o.type, { font: "bold 13px monospace", color: "#ffffff", backgroundColor: "#1d1626" });
      }
      this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      this.tweens.add({ targets: this.cameras.main, scrollX: Math.max(0, map.widthInPixels - 960), duration: 6000, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      window.__check = { tiles: ground.layer.data.flat().filter((t) => t.index > 0).length, objects: objs.length, width: map.width, height: map.height };
    } } });
</script></body></html>
`);
  const filled = data.filter((d) => d).length;
  return `level ${lv.name} ${g.cols}x${g.rows} tiles (${filled} filled, ${g.objects.length} objects), tileset ${ts.name} ${ts.tiles.length} tiles @ ${px}px`;
}
