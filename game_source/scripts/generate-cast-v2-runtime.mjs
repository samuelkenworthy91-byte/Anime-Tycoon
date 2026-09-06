import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(root, "docs", "cast-v2");
const out = join(root, "src", "engine", "generated");

const rosterPath = join(docs, "CAST_V2_MASTER.json");
const manifestPath = join(docs, "CAST_V2_VISUAL_MANIFEST.csv");
const genrePath = join(docs, "GENRE_V2_DATA.json");
const comboPath = join(docs, "GENRE_V2_COMBOS.json");

const roster = JSON.parse(readFileSync(rosterPath, "utf8"));
const genre = JSON.parse(readFileSync(genrePath, "utf8"));
const combos = JSON.parse(readFileSync(comboPath, "utf8"));
const manifestLines = readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);

function csvRow(line) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { cells.push(value); value = ""; }
    else value += ch;
  }
  cells.push(value);
  return cells;
}

const headers = csvRow(manifestLines[0]);
const manifest = new Map(manifestLines.slice(1).map((line) => {
  const values = csvRow(line);
  const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  return [row.id, row];
}));

const roleMap = { Lead: "protag", Sidekick: "secondary", Mascot: "pet", Villain: "villain" };
const cast = roster.map((member) => {
  const art = manifest.get(member.id);
  if (!art) throw new Error(`Missing visual manifest record for ${member.id}`);
  return {
    id: member.id,
    name: member.new_name,
    archetype: member.archetype,
    personality: member.personality,
    img: `cast/v2/${art.crop_filename}`,
    role: roleMap[member.role],
    type: member.anime_type.toLowerCase(),
    visibleAff: [member.visible_genre_1, member.visible_genre_2],
    hiddenAff: member.hidden_genre,
    gender: member.gender,
    species: member.species,
    ageBand: member.age_band,
    culturalBasis: member.cultural_basis,
  };
});

if (cast.length !== 192 || new Set(cast.map((m) => m.id)).size !== 192) throw new Error("Cast V2 ID invariant failed");
for (const member of cast) {
  if (new Set([...member.visibleAff, member.hiddenAff]).size !== 3) throw new Error(`Affinity invariant failed for ${member.id}`);
}
if (genre.length !== 21 || combos.length !== 210) throw new Error("Genre V2 invariant failed");

const sourceSha256 = Object.fromEntries([rosterPath, manifestPath, genrePath, comboPath].map((path) => [
  path.slice(docs.length + 1),
  createHash("sha256").update(readFileSync(path)).digest("hex"),
]));

writeFileSync(join(out, "castV2.json"), `${JSON.stringify({ sourceSha256, cast }, null, 2)}\n`);
writeFileSync(join(out, "genreV2.json"), `${JSON.stringify({ sourceSha256, genres: genre, combos }, null, 2)}\n`);
console.log(`Generated ${cast.length} cast records, ${genre.length} genres and ${combos.length} genre pairs.`);
