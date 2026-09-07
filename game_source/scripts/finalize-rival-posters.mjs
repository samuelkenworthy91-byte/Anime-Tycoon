#!/usr/bin/env node
/**
 * Finalise the supplied 160 rival-poster atlas drop.
 *
 * The source archive contains 20 WebP contact sheets, each 4 columns x 2 rows.
 * We keep those sheets as compact runtime atlases and generate one tiny SVG crop
 * per rival poster, so every rival release gets a stable individual image URL
 * without duplicating the raster bytes 160 times.
 *
 * The audited TSV catalog is authoritative for poster -> studio/type/genre/family
 * assignment. The six original Toe-i posters remain live; together with the 160
 * supplied posters this yields 166 live visuals and two reserve slots, exactly
 * 28 slots per rival studio.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const MANIFEST = path.join(ROOT, "src", "engine", "generated", "rivalPosterManifest.json");
const CATALOG = path.join(ROOT, "src", "engine", "generated", "rivalPosterCatalog.tsv");
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

const STUDIO_META = {
  "Toe-i Animation": ["toei", "blockbuster"],
  Sunnyrise: ["sunrise", "technical"],
  Boneworks: ["bones", "experimental"],
  "Kyo-Hani": ["kyo", "prestige"],
  "Madcap House": ["madcap", "volume"],
  "Turtle Line": ["ttl", "idol"],
};

fs.mkdirSync(ATLAS_DIR, { recursive: true });
fs.mkdirSync(SHEET_DIR, { recursive: true });
fs.mkdirSync(path.dirname(MAP_OUT), { recursive: true });

for (let s = 1; s <= 20; s += 1) {
  const filename = `poster_sheet_${String(s).padStart(2, "0")}.webp`;
  const full = path.join(SHEET_DIR, filename);
  if (!fs.existsSync(full)) throw new Error(`Missing unpacked rival poster sheet: ${filename}`);
}

function parseCsvishList(value) {
  return value ? value.split(",").map((x) => x.trim()).filter(Boolean) : [];
}

function parseCatalog() {
  const lines = fs.readFileSync(CATALOG, "utf8").trim().split(/\r?\n/);
  const header = lines.shift().split("\t");
  const expected = ["n", "id", "studio", "persona", "animeTypes", "genres", "family"];
  if (header.join("|") !== expected.join("|")) throw new Error(`Unexpected rival poster catalog header: ${header.join("|")}`);
  return lines.map((line) => {
    const cols = line.split("\t");
    const row = Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ""]));
    return {
      n: Number(row.n),
      id: row.id,
      studio: row.studio,
      persona: row.persona,
      animeTypes: parseCsvishList(row.animeTypes),
      genres: parseCsvishList(row.genres),
      family: row.family || null,
    };
  });
}

const catalog = parseCatalog();
if (catalog.length !== POSTER_COUNT) throw new Error(`Expected ${POSTER_COUNT} catalog rows, got ${catalog.length}`);
if (new Set(catalog.map((r) => r.n)).size !== POSTER_COUNT || Math.min(...catalog.map((r) => r.n)) !== 1 || Math.max(...catalog.map((r) => r.n)) !== 160) {
  throw new Error("Poster catalog numbering must be unique and contiguous from 1 to 160");
}
if (new Set(catalog.map((r) => r.id)).size !== POSTER_COUNT) throw new Error("Poster catalog IDs must be unique");
for (const row of catalog) {
  if (!STUDIO_META[row.studio]) throw new Error(`Unknown rival studio in catalog: ${row.studio}`);
  if (!row.animeTypes.length) throw new Error(`Poster ${row.id} has no anime type compatibility`);
  if (!row.genres.length) throw new Error(`Poster ${row.id} has no genre tags`);
}

const oldManifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const originalLive = oldManifest.posters.filter((p) => !p.pending);
if (originalLive.length !== 6) throw new Error(`Expected six original live rival posters, found ${originalLive.length}`);
if (!originalLive.every((p) => p.studio === "Toe-i Animation")) throw new Error("Original six rival posters are expected to belong to Toe-i Animation");

const originalIds = new Set(originalLive.map((p) => p.id));
for (const row of catalog) if (originalIds.has(row.id)) throw new Error(`Catalog ID collides with original poster: ${row.id}`);

// Clear only generated SVG wrappers from a previous finalisation run.
for (const file of fs.readdirSync(ATLAS_DIR)) {
  if (file.endsWith(".svg")) fs.unlinkSync(path.join(ATLAS_DIR, file));
}

const imported = [];
const mapRows = ["poster_number,slot_id,studio,anime_types,genres,family,source_sheet,row,column,img"];

for (const meta of catalog) {
  const posterNo = meta.n;
  const sheetNo = Math.floor((posterNo - 1) / 8) + 1;
  const cell = (posterNo - 1) % 8;
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  const sheetFile = `poster_sheet_${String(sheetNo).padStart(2, "0")}.webp`;
  const imgPath = `rival-posters/atlas/${meta.id}.svg`;

  const cropW = CELL_W - INSET * 2;
  const cropH = CELL_H - INSET * 2;
  const x = -(col * CELL_W + INSET);
  const y = -(row * CELL_H + INSET);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cropW} ${cropH}" width="${cropW}" height="${cropH}" preserveAspectRatio="xMidYMid slice"><image href="/rival-posters/sheets/${sheetFile}" x="${x}" y="${y}" width="${SHEET_W}" height="${SHEET_H}" preserveAspectRatio="none"/></svg>\n`;
  fs.writeFileSync(path.join(ATLAS_DIR, `${meta.id}.svg`), svg);

  imported.push({
    id: meta.id,
    img: imgPath,
    studio: meta.studio,
    persona: meta.persona,
    animeTypes: meta.animeTypes,
    genres: meta.genres,
    family: meta.family,
  });

  const csv = [posterNo, meta.id, meta.studio, meta.animeTypes.join("|"), meta.genres.join("|"), meta.family ?? "", sheetNo, row + 1, col + 1, imgPath]
    .map((v) => `"${String(v).replaceAll('"', '""')}"`)
    .join(",");
  mapRows.push(csv);
}

const posters = [...originalLive, ...imported];
for (const [studio, [prefix, persona]] of Object.entries(STUDIO_META)) {
  const liveCount = posters.filter((p) => p.studio === studio).length;
  if (liveCount > 28) throw new Error(`${studio} has ${liveCount} live posters, over 28-slot capacity`);
  for (let i = 1; i <= 28 - liveCount; i += 1) {
    posters.push({
      id: `${prefix}_reserve_${String(i).padStart(2, "0")}`,
      img: "",
      studio,
      persona,
      animeTypes: ["shonen", "shojo"],
      genres: [],
      family: null,
      pending: true,
    });
  }
}

const manifest = {
  schema: 2,
  capacity: { perStudio: 28, studios: 6, total: 168 },
  generated: posters.filter((p) => !p.pending).length,
  pending: posters.filter((p) => !!p.pending).length,
  posters,
};

if (manifest.posters.length !== 168) throw new Error(`Expected 168 rival poster slots, got ${manifest.posters.length}`);
if (manifest.generated !== 166 || manifest.pending !== 2) throw new Error(`Expected 166 generated / 2 pending, got ${manifest.generated}/${manifest.pending}`);
for (const studio of Object.keys(STUDIO_META)) {
  const all = manifest.posters.filter((p) => p.studio === studio);
  if (all.length !== 28) throw new Error(`${studio}: expected 28 total slots, got ${all.length}`);
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(MAP_OUT, `${mapRows.join("\n")}\n`);

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
for (const studio of Object.keys(STUDIO_META)) {
  const live = manifest.posters.filter((p) => p.studio === studio && !p.pending).length;
  const pending = manifest.posters.filter((p) => p.studio === studio && p.pending).length;
  console.log(`  ${studio}: ${live} live + ${pending} reserve = 28`);
}
console.log(`Mapped ${POSTER_COUNT} supplied posters across 20 runtime atlas sheets using the audited catalog.`);
console.log("KNOWN FITS: contextual to the first selected genre.");
