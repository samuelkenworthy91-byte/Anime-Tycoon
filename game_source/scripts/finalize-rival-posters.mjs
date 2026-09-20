#!/usr/bin/env node
/**
 * Finalise the supplied 160 individually-cropped rival posters.
 *
 * Source files are uploaded directly as:
 *   art_src/rival/external/poster_001.png ... poster_160.png
 *
 * The audited TSV catalog is authoritative for poster -> studio/type/genre/family
 * assignment. The six original Toe-i posters remain live; together with the 160
 * supplied posters this yields the legacy 166 live visuals and two reserve
 * slots (28 per rival studio / 168 base slots). The Sep 19 shared-industry
 * original-show catalog is then appended so rerunning this finalizer cannot
 * silently discard the expanded generic/rival poster pool.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const MANIFEST = path.join(ROOT, "src", "engine", "generated", "rivalPosterManifest.json");
const CATALOG = path.join(ROOT, "src", "engine", "generated", "rivalPosterCatalog.tsv");
const SHARED_CATALOG = path.join(ROOT, "src", "engine", "generated", "sharedIndustryPosterCatalog.json");
const SOURCE_DIR = path.join(ROOT, "art_src", "rival", "external");
const IMPORTED_DIR = path.join(ROOT, "public", "rival-posters", "imported");
const MAP_OUT = path.join(ROOT, "docs", "rival-poster-import-map.csv");
const CREATE = path.join(ROOT, "src", "components", "Create.tsx");

const POSTER_COUNT = 160;
const ORIGINAL_IDS = new Set([
  "toei_titanrise",
  "toei_titanwreck",
  "toei_titannova",
  "toei_ironfist",
  "toei_grandpitch",
  "toei_steelstorm",
]);

const STUDIO_META = {
  "Toe-i Animation": ["toei", "blockbuster"],
  Sunnyrise: ["sunrise", "technical"],
  Boneworks: ["bones", "experimental"],
  "Kyo-Hani": ["kyo", "prestige"],
  "Madcap House": ["madcap", "volume"],
  "Turtle Line": ["ttl", "idol"],
};

fs.mkdirSync(path.dirname(MAP_OUT), { recursive: true });
fs.rmSync(IMPORTED_DIR, { recursive: true, force: true });
fs.mkdirSync(IMPORTED_DIR, { recursive: true });

function sourceName(n) {
  return `poster_${String(n).padStart(3, "0")}.png`;
}

for (let n = 1; n <= POSTER_COUNT; n += 1) {
  const file = sourceName(n);
  if (!fs.existsSync(path.join(SOURCE_DIR, file))) throw new Error(`Missing supplied rival poster: ${file}`);
}

const uploaded = fs.readdirSync(SOURCE_DIR).filter((f) => /^poster_\d{3}\.png$/i.test(f));
if (uploaded.length !== POSTER_COUNT) {
  throw new Error(`Expected exactly ${POSTER_COUNT} poster_###.png source files, found ${uploaded.length}`);
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
if (
  new Set(catalog.map((r) => r.n)).size !== POSTER_COUNT ||
  Math.min(...catalog.map((r) => r.n)) !== 1 ||
  Math.max(...catalog.map((r) => r.n)) !== POSTER_COUNT
) {
  throw new Error("Poster catalog numbering must be unique and contiguous from 1 to 160");
}
if (new Set(catalog.map((r) => r.id)).size !== POSTER_COUNT) throw new Error("Poster catalog IDs must be unique");
for (const row of catalog) {
  if (!STUDIO_META[row.studio]) throw new Error(`Unknown rival studio in catalog: ${row.studio}`);
  if (!row.animeTypes.length) throw new Error(`Poster ${row.id} has no anime type compatibility`);
  if (!row.genres.length) throw new Error(`Poster ${row.id} has no genre tags`);
}

const oldManifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const originalLive = oldManifest.posters.filter((p) => ORIGINAL_IDS.has(p.id) && !p.pending);
if (originalLive.length !== ORIGINAL_IDS.size) {
  throw new Error(`Expected ${ORIGINAL_IDS.size} original live rival posters, found ${originalLive.length}`);
}
if (!originalLive.every((p) => p.studio === "Toe-i Animation")) {
  throw new Error("Original six rival posters are expected to belong to Toe-i Animation");
}

for (const row of catalog) {
  if (ORIGINAL_IDS.has(row.id)) throw new Error(`Catalog ID collides with original poster: ${row.id}`);
}

const imported = [];
const mapRows = ["poster_number,source_filename,slot_id,studio,anime_types,genres,family,img"];

for (const meta of catalog) {
  const sourceFile = sourceName(meta.n);
  const runtimeFile = `${meta.id}.png`;
  const source = path.join(SOURCE_DIR, sourceFile);
  const output = path.join(IMPORTED_DIR, runtimeFile);
  const imgPath = `rival-posters/imported/${runtimeFile}`;

  fs.copyFileSync(source, output);

  imported.push({
    id: meta.id,
    img: imgPath,
    studio: meta.studio,
    persona: meta.persona,
    animeTypes: meta.animeTypes,
    genres: meta.genres,
    family: meta.family,
  });

  const csv = [
    meta.n,
    sourceFile,
    meta.id,
    meta.studio,
    meta.animeTypes.join("|"),
    meta.genres.join("|"),
    meta.family ?? "",
    imgPath,
  ]
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

const basePosters = [...posters];
if (basePosters.length !== 168) throw new Error(`Expected 168 legacy rival poster slots, got ${basePosters.length}`);

const sharedCatalog = JSON.parse(fs.readFileSync(SHARED_CATALOG, "utf8"));
const sharedRows = Array.isArray(sharedCatalog.posters) ? sharedCatalog.posters : [];
if (sharedRows.length !== 213) throw new Error(`Expected 213 shared-industry posters, got ${sharedRows.length}`);

const sharedPosters = sharedRows.map((row) => {
  const runtime = {
    id: row.id,
    img: row.img,
    studio: row.studio,
    persona: row.persona,
    animeTypes: row.animeTypes,
    genres: row.genres,
    family: row.family ?? null,
  };
  if (!STUDIO_META[runtime.studio]) throw new Error(`Unknown shared poster studio: ${runtime.studio}`);
  if (!Array.isArray(runtime.animeTypes) || !runtime.animeTypes.length) throw new Error(`Shared poster ${runtime.id} has no anime types`);
  if (!Array.isArray(runtime.genres) || !runtime.genres.length) throw new Error(`Shared poster ${runtime.id} has no genre tags`);
  const asset = path.join(ROOT, "public", runtime.img);
  if (!fs.existsSync(asset)) throw new Error(`Missing shared poster asset: ${runtime.img}`);
  return runtime;
});

const allPosters = [...basePosters, ...sharedPosters];
const ids = allPosters.map((p) => p.id);
const imgs = allPosters.filter((p) => p.img).map((p) => p.img);
if (new Set(ids).size !== ids.length) throw new Error("Poster IDs must stay globally unique");
if (new Set(imgs).size !== imgs.length) throw new Error("Poster image paths must stay globally unique");

const manifest = {
  schema: 3,
  capacity: { perStudio: 28, studios: 6, baseTotal: 168, sharedIndustry: sharedPosters.length, total: allPosters.length },
  generated: allPosters.filter((p) => !p.pending).length,
  pending: allPosters.filter((p) => !!p.pending).length,
  posters: allPosters,
};

if (manifest.posters.length !== 381) throw new Error(`Expected 381 total poster rows, got ${manifest.posters.length}`);
if (manifest.generated !== 379 || manifest.pending !== 2) {
  throw new Error(`Expected 379 generated / 2 pending, got ${manifest.generated}/${manifest.pending}`);
}
for (const studio of Object.keys(STUDIO_META)) {
  const base = basePosters.filter((p) => p.studio === studio);
  if (base.length !== 28) throw new Error(`${studio}: expected 28 legacy base slots, got ${base.length}`);
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(MAP_OUT, `${mapRows.join("\n")}\n`);

// KNOWN FITS is contextual: after genre #1 is chosen, show only learned
// pairings containing it. Tapping a chip adds the learned partner as genre #2.
let create = fs.readFileSync(CREATE, "utf8");
const oldBlock = `  const knownPairings = useMemo(\n    () =>\n      Object.entries(run.comboLevels)\n        .filter(([key, lv]) => lv > 0 && key.split("|").every((g) => run.genresUnlocked.includes(g as never)))\n        .sort((a, b) => b[1] - a[1])\n        .slice(0, 4)\n        .map(([key, lv]) => ({ key, genres: key.split("|") as GenreId[], lv })),\n    [run.comboLevels, run.genresUnlocked]\n  );`;
const newBlock = `  const knownPairings = useMemo(() => {\n    const firstGenre = d.genres[0];\n    if (!firstGenre || d.genres.length !== 1) return [];\n    return Object.entries(run.comboLevels)\n      .filter(([key, lv]) => {\n        if (lv <= 0) return false;\n        const pair = key.split("|") as GenreId[];\n        return pair.includes(firstGenre) && pair.every((g) => run.genresUnlocked.includes(g));\n      })\n      .sort((a, b) => b[1] - a[1])\n      .slice(0, 4)\n      .map(([key, lv]) => {\n        const genres = key.split("|") as GenreId[];\n        return { key, genres, partner: genres.find((g) => g !== firstGenre)!, lv };\n      });\n  }, [d.genres, run.comboLevels, run.genresUnlocked]);`;

if (create.includes(oldBlock)) {
  create = create.replace(oldBlock, newBlock);
} else if (!create.includes("const firstGenre = d.genres[0]")) {
  throw new Error("Could not locate KNOWN FITS calculation in Create.tsx");
}

const oldMap = `                    {knownPairings.map(({ key, genres, lv }) => {\n                      const active = comboKey(d.genres) === key;\n                      const tip = \`Proven pairing — combo knowledge Lv\${lv}. Tap to \${active ? "drop the second genre" : "use this pairing"}.\`;\n                      return (\n                        <button\n                          key={key}\n                          title={tip}\n                          onClick={() => set({ genres: active ? [genres[0]] : [...genres] })}`;
const newMap = `                    {knownPairings.map(({ key, genres, partner, lv }) => {\n                      const firstGenre = d.genres[0];\n                      const partnerLabel = GENRES.find((x) => x.id === partner)?.label ?? partner;\n                      const tip = \`Known fit with \${GENRES.find((x) => x.id === firstGenre)?.label ?? firstGenre} — combo knowledge Lv\${lv}. Tap to add \${partnerLabel}.\`;\n                      return (\n                        <button\n                          key={key}\n                          title={tip}\n                          onClick={() => set({ genres: [firstGenre, partner] })}`;
if (create.includes(oldMap)) {
  create = create.replace(oldMap, newMap);
} else if (!create.includes("partnerLabel = GENRES.find")) {
  throw new Error("Could not locate KNOWN FITS button mapping in Create.tsx");
}

const oldActiveClass = `                            active\n                              ? "border-mint bg-mint/15 text-mint"\n                              : "border-line bg-panel2/80 text-paper/80 hover:border-mint/50"`;
if (create.includes(oldActiveClass)) {
  create = create.replace(oldActiveClass, `                            "border-line bg-panel2/80 text-paper/80 hover:border-mint/50"`);
}

const oldLabel = `{genres.map((g) => GENRES.find((x) => x.id === g)!.label).join(" + ")}`;
if (create.includes(oldLabel)) {
  create = create.replace(oldLabel, `{partnerLabel}`);
}

fs.writeFileSync(CREATE, create);

console.log(`Rival posters: ${manifest.generated}/${manifest.posters.length} live, ${manifest.pending} pending (includes ${sharedPosters.length} shared-industry originals).`);
for (const studio of Object.keys(STUDIO_META)) {
  const baseLive = basePosters.filter((p) => p.studio === studio && !p.pending).length;
  const basePending = basePosters.filter((p) => p.studio === studio && p.pending).length;
  const shared = sharedPosters.filter((p) => p.studio === studio).length;
  console.log(`  ${studio}: ${baseLive} base live + ${basePending} reserve + ${shared} shared`);
}
console.log(`Imported ${POSTER_COUNT} individual supplied PNG posters using the audited catalog.`);
console.log("KNOWN FITS: contextual to the first selected genre and adds the learned partner.");
