import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./content-packs/genre30-pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const json = (...parts) => JSON.parse(readFileSync(resolve(root, ...parts), "utf8"));
const csv = (...parts) => parseCsv(readFileSync(resolve(root, ...parts), "utf8"));
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const cast = json("src/engine/generated/castV3.json").cast;
assert.equal(cast.length, 1440, "live cast count drift");
assert.equal(new Set(cast.map((member) => member.id)).size, cast.length, "runtime cast IDs must be unique");
assert.equal(new Set(cast.map((member) => member.img)).size, cast.length, "runtime portrait paths must be unique");

const runtimeHashes = new Map();
for (const member of cast) {
  const path = resolve(root, "public", member.img);
  assert(existsSync(path), `${member.id}: missing runtime portrait ${member.img}`);
  assert(!member.legacyPlaceholder, `${member.id}: generic placeholder is forbidden`);
  assert(!/placeholder|fallback/i.test(member.img), `${member.id}: fallback portrait path is forbidden`);
  runtimeHashes.set(member.id, digest(path));
}
assert.equal(new Set(runtimeHashes.values()).size, cast.length, "exact duplicate runtime portraits detected");

const v6Roster = csv("docs/content-v6/GENRE30_CAST_ROSTER.csv");
const v6Images = csv("art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv");
assert.equal(v6Roster.length, 520, "canonical V6 roster count drift");
assert.equal(v6Images.length, 520, "V6 image manifest count drift");
assert.equal(new Set(v6Roster.map((row) => row.character_id)).size, 520, "V6 roster IDs must be unique");
assert.equal(new Set(v6Roster.map((row) => row.sequence)).size, 520, "V6 source sequences must be unique");
assert.equal(new Set(v6Roster.map((row) => row.name)).size, 520, "V6 canonical names must be unique");
assert.equal(new Set(v6Roster.map((row) => row.epithet)).size, 520, "V6 canonical epithets must be unique");
const castById = new Map(cast.map((member) => [member.id, member]));
const imageById = new Map(v6Images.map((row) => [row.character_id, row]));
const v6Fields = ["sequence", "name", "epithet", "role", "anime_type", "visible_genre_1", "visible_genre_2", "hidden_genre"];
for (const row of v6Roster) {
  const member = castById.get(row.character_id);
  const image = imageById.get(row.character_id);
  assert(member, `${row.character_id}: missing from runtime cast`);
  assert(image, `${row.character_id}: missing from image manifest`);
  for (const field of v6Fields) assert.equal(image[field], row[field], `${row.character_id}: ${field} roster/image-manifest drift`);
  assert.equal(member.name, row.name, `${row.character_id}: runtime name drift`);
  assert.equal(member.epithet, row.epithet, `${row.character_id}: runtime epithet drift`);
  assert.equal(member.role, row.role, `${row.character_id}: runtime role drift`);
  assert.equal(member.type, row.anime_type, `${row.character_id}: runtime anime type drift`);
  assert.deepEqual(member.visibleAff, [row.visible_genre_1, row.visible_genre_2], `${row.character_id}: runtime visible-pair drift`);
  assert.equal(member.hiddenAff, row.hidden_genre, `${row.character_id}: runtime hidden-affinity drift`);
  assert.equal(member.sourceManifestSequence, Number(row.sequence), `${row.character_id}: runtime source sequence drift`);
  assert.equal(member.img, `cast/v6/${row.character_id}.webp`, `${row.character_id}: runtime path drift`);
  assert.equal(image.staging_filename_webp, `${row.character_id}.webp`, `${row.character_id}: source filename drift`);
  const source = resolve(root, "art_src/cast_v6_genre30_upload_staging/portraits", image.staging_filename_webp);
  assert(existsSync(source), `${row.character_id}: missing staged V6 source`);
  assert.equal(runtimeHashes.get(row.character_id), digest(source), `${row.character_id}: runtime V6 bytes do not match intended source`);
}

const roles = ["protag", "secondary", "pet", "villain"];
const types = ["shonen", "shojo"];
const reference = new Map(v6Roster.filter((row) => row.role === "protag" && row.anime_type === "shonen").map((row) => [row.character_id.slice(-3), [row.visible_genre_1, row.visible_genre_2, row.hidden_genre]]));
assert.equal(reference.size, 65, "V6 reference bucket must contain 65 affinity triples");
for (const role of roles) for (const type of types) {
  const bucket = v6Roster.filter((row) => row.role === role && row.anime_type === type);
  assert.equal(bucket.length, 65, `${role}/${type}: V6 bucket count drift`);
  for (const row of bucket) assert.deepEqual([row.visible_genre_1, row.visible_genre_2, row.hidden_genre], reference.get(row.character_id.slice(-3)), `${row.character_id}: Role × Type affinity-cell drift`);
}

for (const member of cast.filter((entry) => entry.id.startsWith("vg_"))) {
  const source = resolve(repoRoot, member.sourceRoot);
  assert(existsSync(source), `${member.id}: missing V5 source`);
  assert.equal(runtimeHashes.get(member.id), digest(source), `${member.id}: V5 source/runtime copy drift`);
}

const v4Manifest = new Map(csv("docs/cast-v4/CAST_V4_FINAL_MANIFEST.csv").map((row) => [row.id, row]));
const v4Art = new Map(csv("docs/cast-v4/CAST_V4_FINAL_ART_MAP.csv").map((row) => [row.stable_id, row]));
const v4Hashes = new Map(csv("docs/cast-v4/CAST_V4_RUNTIME_ART_SHA256.csv").map((row) => [row.stable_id, row.sha256]));
assert.equal(v4Manifest.size, 304, "V4 canonical manifest count drift");
for (const [id, row] of v4Manifest) {
  const member = castById.get(id);
  assert(member, `${id}: missing V4 runtime record`);
  assert.deepEqual(member.visibleAff, [row.visibleAff1, row.visibleAff2], `${id}: V4 visible metadata drift`);
  assert.equal(member.hiddenAff, row.hiddenAff, `${id}: V4 hidden metadata drift`);
  assert.equal(runtimeHashes.get(id), v4Hashes.get(id), `${id}: V4 runtime hash ledger drift`);
  const art = v4Art.get(id);
  const source = resolve(root, "art_src/cast_v4_upload_staging", art.selected_source_path);
  assert(existsSync(source), `${id}: missing V4 selected source`);
  assert.equal(digest(source), art.selected_source_sha256, `${id}: V4 selected-source hash drift`);
}

for (const member of cast.filter((entry) => !entry.id.startsWith("g30_") && !entry.id.startsWith("vg_") && !entry.id.startsWith("v4_"))) {
  const suffix = member.id.startsWith("cv3_") ? `${member.id}.webp` : basename(member.img);
  assert.equal(basename(member.img), suffix, `${member.id}: legacy stable filename drift`);
}

console.log("Verified 1,440 stable-ID cast mappings, 520 canonical V6 source joins, 304 V4 source selections, exact source/runtime copies, and zero exact duplicate portraits.");
