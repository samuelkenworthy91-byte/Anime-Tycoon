import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parseCsv } from "./content-packs/genre30-pack.mjs";

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stagingRoot = resolve(gameRoot, "art_src/cast_v6_genre30_upload_staging");
const manifestPath = resolve(stagingRoot, "manifest/final_manifest_webp.csv");
const sourceDir = resolve(stagingRoot, "portraits");
const runtimeDir = resolve(gameRoot, "public/cast/v6");

assert(existsSync(manifestPath), "Genre 30 final manifest is missing");
assert(existsSync(sourceDir), "Genre 30 portrait staging directory is missing");
const rows = parseCsv(readFileSync(manifestPath, "utf8"));
assert.equal(rows.length, 520, `expected 520 Genre 30 manifest rows, got ${rows.length}`);
assert.equal(new Set(rows.map((r) => r.character_id)).size, 520, "Genre 30 character IDs must be unique");
assert.equal(new Set(rows.map((r) => r.staging_filename_webp)).size, 520, "Genre 30 portrait filenames must be unique");

mkdirSync(runtimeDir, { recursive: true });
const wanted = new Set();
for (const row of rows) {
  assert(/^g30_(protag|secondary|pet|villain)_(shonen|shojo)_\d{3}$/.test(row.character_id), `${row.character_id}: invalid Genre 30 id`);
  assert.equal(row.staging_filename_webp, `${row.character_id}.webp`, `${row.character_id}: runtime filename drift`);
  const source = resolve(sourceDir, row.staging_filename_webp);
  assert(existsSync(source), `${row.character_id}: missing staged portrait`);
  const header = readFileSync(source).subarray(0, 16);
  assert.equal(header.toString("ascii", 0, 4), "RIFF", `${row.character_id}: expected RIFF WebP`);
  assert.equal(header.toString("ascii", 8, 12), "WEBP", `${row.character_id}: expected WEBP source`);
  wanted.add(row.staging_filename_webp);
  copyFileSync(source, resolve(runtimeDir, row.staging_filename_webp));
}

for (const file of readdirSync(runtimeDir)) {
  if (file.startsWith("g30_") && file.endsWith(".webp") && !wanted.has(file)) rmSync(resolve(runtimeDir, file));
}
assert.equal(readdirSync(runtimeDir).filter((f) => /^g30_.*\.webp$/.test(f)).length, 520, "Genre 30 runtime portrait count drift");
console.log("Prepared 520 Genre 30 runtime WebP portraits from canonical staging.");
