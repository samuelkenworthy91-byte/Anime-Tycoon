#!/usr/bin/env node
/**
 * Finalise the supplied 160 rival-poster atlas drop.
 *
 * The source archive contains 20 WebP contact sheets, each 4 columns x 2 rows.
 * We keep those sheets as compact runtime atlases and generate one tiny SVG crop
 * per rival poster slot, so every release still has a stable individual image URL
 * without duplicating the raster bytes 160 times.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const MANIFEST = path.join(ROOT, "src", "engine", "generated", "rivalPosterManifest.json");
const ATLAS_DIR = path.join(ROOT, "public", "rival-posters", "atlas");
const SHEET_DIR = path.join(ROOT, "public", "rival-posters", "sheets");
const MAP_OUT = path.join(ROOT, "docs", "rival-poster-import-map.csv");
const CREATE = path.join(ROOT, "src", "components", "Create.tsx");

const POSTER_COUNT = 160;
const COLS = 4;
const ROWS = 2;
const SHEET_W = 640;
const SHEET_H = 499;
const CELL_W = SHEET_W / COLS;
const CELL_H = SHEET_H / ROWS;
const INSET = 2;

fs.mkdirSync(ATLAS_DIR, { recursive: true });
fs.mkdirSync(SHEET_DIR, { recursive: true });
fs.mkdirSync(path.dirname(MAP_OUT), { recursive: true });

for (let s = 1; s <= 20; s += 1) {
  const filename = `poster_sheet_${String(s).padStart(2, "0")}.webp`;
  const full = path.join(SHEET_DIR, filename);
  if (!fs.existsSync(full)) throw new Error(`Missing unpacked rival poster sheet: ${filename}`);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const pending = manifest.posters.filter((p) => p.pending);
if (pending.length < POSTER_COUNT) {
  throw new Error(`Need ${POSTER_COUNT} pending poster slots, found ${pending.length}`);
}

const selected = pending.slice(0, POSTER_COUNT);
const rows = ["poster_number,slot_id,studio,source_sheet,row,column,img"];

for (let i = 0; i < selected.length; i += 1) {
  const posterNo = i + 1;
  const slot = selected[i];
  const sheetNo = Math.floor(i / 8) + 1;
  const cell = i % 8;
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  const sheetFile = `poster_sheet_${String(sheetNo).padStart(2, "0")}.webp`;
  const imgPath = `rival-posters/atlas/${slot.id}.svg`;

  const cropW = CELL_W - INSET * 2;
  const cropH = CELL_H - INSET * 2;
  const x = -(col * CELL_W + INSET);
  const y = -(row * CELL_H + INSET);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cropW} ${cropH}" width="${cropW}" height="${cropH}" preserveAspectRatio="xMidYMid slice"><image href="/rival-posters/sheets/${sheetFile}" x="${x}" y="${y}" width="${SHEET_W}" height="${SHEET_H}" preserveAspectRatio="none"/></svg>\n`;

  fs.writeFileSync(path.join(ATLAS_DIR, `${slot.id}.svg`), svg);
  slot.img = imgPath;
  delete slot.pending;

  const csv = [posterNo, slot.id, slot.studio, sheetNo, row + 1, col + 1, imgPath]
    .map((v) => `"${String(v).replaceAll('"', '""')}"`)
    .join(",");
  rows.push(csv);
}

manifest.capacity = { perStudio: 28, studios: 6, total: manifest.posters.length };
manifest.generated = manifest.posters.filter((p) => !p.pending).length;
manifest.pending = manifest.posters.filter((p) => !!p.pending).length;
if (manifest.posters.length !== 168) throw new Error(`Expected 168 rival poster slots, got ${manifest.posters.length}`);
if (manifest.generated !== 166 || manifest.pending !== 2) {
  throw new Error(`Expected 166 generated / 2 pending after import, got ${manifest.generated}/${manifest.pending}`);
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(MAP_OUT, `${rows.join("\n")}\n`);

// Make KNOWN FITS genuinely contextual: after the player picks genre #1,
// only learned pairings containing that genre are offered as one-tap genre #2.
let create = fs.readFileSync(CREATE, "utf8");
const oldBlock = `  const knownPairings = useMemo(\n    () =>\n      Object.entries(run.comboLevels)\n        .filter(([key, lv]) => lv > 0 && key.split("|").every((g) => run.genresUnlocked.includes(g as never)))\n        .sort((a, b) => b[1] - a[1])\n        .slice(0, 4)\n        .map(([key, lv]) => ({ key, genres: key.split("|") as GenreId[], lv })),\n    [run.comboLevels, run.genresUnlocked]\n  );`;
const newBlock = `  const knownPairings = useMemo(() => {\n    const firstGenre = d.genres[0];\n    if (!firstGenre || d.genres.length > 1) return [];\n    return Object.entries(run.comboLevels)\n      .filter(([key, lv]) => {\n        if (lv <= 0) return false;\n        const pair = key.split("|") as GenreId[];\n        return pair.includes(firstGenre) && pair.every((g) => run.genresUnlocked.includes(g));\n      })\n      .sort((a, b) => b[1] - a[1])\n      .slice(0, 4)\n      .map(([key, lv]) => ({ key, genres: key.split("|") as GenreId[], lv }));\n  }, [d.genres, run.comboLevels, run.genresUnlocked]);`;

if (create.includes(oldBlock)) {
  create = create.replace(oldBlock, newBlock);
  fs.writeFileSync(CREATE, create);
} else if (!create.includes("const firstGenre = d.genres[0]")) {
  throw new Error("Could not locate KNOWN FITS block in Create.tsx");
}

console.log(`Rival posters: ${manifest.generated}/${manifest.posters.length} live, ${manifest.pending} pending.`);
console.log(`Mapped ${POSTER_COUNT} supplied posters across 20 runtime atlas sheets.`);
console.log("KNOWN FITS: contextual to the first selected genre.");
