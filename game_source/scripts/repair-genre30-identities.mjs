import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./content-packs/genre30-pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtime = JSON.parse(readFileSync(resolve(root, "src/engine/generated/castV3.json"), "utf8")).cast;
const runtimeNames = new Map(runtime.filter((member) => member.id.startsWith("g30_")).map((member) => [member.id, member.name]));

const genreTokens = {
  monster_taming: "Beast", crime: "Underworld", kaiju: "Titan", cosmic_horror: "Abyss", arabia: "Dune",
  mecha: "Gear", isekai: "Portal", slice: "Hearth", horror: "Terror", romance: "Heart",
  sports: "Arena", cyber: "Neon", fantasy: "Realm", idol: "Stage", mystery: "Cipher",
  comedy: "Mirth", cooking: "Kitchen", military: "Command", supernatural: "Spirit", space: "Void",
  magical: "Charm", survival: "Wild", pirate: "Corsair", martial: "Fist", mythology: "Myth",
  nordic: "North", samurai: "Blade", shinobi: "Shadow", vampire: "Blood", grimdark: "Ruin",
};

const bucketTitles = {
  protag_shonen: "Vanguard",
  protag_shojo: "Luminary",
  secondary_shonen: "Wing",
  secondary_shojo: "Confidant",
  pet_shonen: "Familiar",
  pet_shojo: "Sprite",
  villain_shonen: "Nemesis",
  villain_shojo: "Sovereign",
};

function canonicalEpithet(row) {
  const tokens = [row.visible_genre_1, row.visible_genre_2, row.hidden_genre].map((genre) => genreTokens[genre]);
  assert(tokens.every(Boolean), `${row.character_id}: missing genre epithet token`);
  const title = bucketTitles[`${row.role}_${row.anime_type}`];
  assert(title, `${row.character_id}: missing Role × Type epithet title`);
  return `The ${tokens.join(" ")} ${title}`;
}

function encodeCsv(rows, headers) {
  const field = (value) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => field(row[header])).join(","))].join("\n") + "\n";
}

const paths = [
  "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest.csv",
  "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv",
  "docs/content-v6/GENRE30_CAST_ROSTER.csv",
];

for (const relativePath of paths) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  const rows = parseCsv(source);
  const headers = Object.keys(rows[0] ?? {});
  assert.equal(rows.length, 520, `${relativePath}: expected 520 rows`);
  for (const row of rows) {
    const canonicalName = runtimeNames.get(row.character_id);
    assert(canonicalName, `${row.character_id}: missing current stable runtime name`);
    row.name = canonicalName;
    row.epithet = canonicalEpithet(row);
  }
  assert.equal(new Set(rows.map((row) => row.name)).size, 520, `${relativePath}: canonical names must be unique`);
  assert.equal(new Set(rows.map((row) => row.epithet)).size, 520, `${relativePath}: canonical epithets must be unique`);
  writeFileSync(path, encodeCsv(rows, headers));
}

console.log("Canonicalized 520 Genre 30 names and epithets across the authoritative roster and import manifests.");
