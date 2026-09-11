import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./content-packs/genre30-pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const index = resolve(dist, "index.html");
assert(existsSync(index), "dist/index.html is missing");
const bundle = readFileSync(index, "utf8");
assert(bundle.includes("<script"), "inlined JavaScript bundle is missing from dist/index.html");
const roster = parseCsv(readFileSync(resolve(root, "docs/content-v6/GENRE30_CAST_ROSTER.csv"), "utf8"));
const sourceRows = parseCsv(readFileSync(resolve(root, "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv"), "utf8"));
const sourceById = new Map(sourceRows.map((row) => [row.character_id, row]));
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
for (const row of roster) {
  assert(bundle.includes(row.character_id), `${row.character_id}: absent from compiled bundle`);
  assert(bundle.includes(row.name), `${row.character_id}: canonical name absent from compiled bundle`);
  assert(bundle.includes(row.epithet), `${row.character_id}: canonical epithet absent from compiled bundle`);
  assert(bundle.includes(`cast/v6/${row.character_id}.webp`), `${row.character_id}: portrait path absent from compiled bundle`);
  const source = resolve(root, "art_src/cast_v6_genre30_upload_staging/portraits", sourceById.get(row.character_id).staging_filename_webp);
  const built = resolve(dist, "cast/v6", `${row.character_id}.webp`);
  assert(existsSync(built), `${row.character_id}: portrait absent from final dist`);
  assert.equal(digest(built), digest(source), `${row.character_id}: final dist portrait does not match intended source`);
}
assert(bundle.includes("castingPairKeys"), "compiled casting-connection index is missing");
console.log("Verified dist/index.html, compiled canonical metadata and all 520 source-identical Genre 30 portraits in the final browser build.");
