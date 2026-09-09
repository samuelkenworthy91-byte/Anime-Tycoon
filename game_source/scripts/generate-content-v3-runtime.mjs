import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readContent = (name) => JSON.parse(readFileSync(resolve(root, "docs/content-v3", name), "utf8"));
const readV4 = (name) => JSON.parse(readFileSync(resolve(root, "docs/cast-v4", name), "utf8"));
const cast = readContent("CAST_V3_RUNTIME.json");
const v4 = readV4("CAST_V4_FINAL_RUNTIME.json");
const genres = readContent("GENRE_V3_RUNTIME.json");
const arcs = readContent("ARC_V3_RUNTIME.json");

const roles = ["protag", "secondary", "pet", "villain"];
const types = ["shonen", "shojo"];
const expectedBuckets = {
  "protag:shonen": 90,
  "protag:shojo": 95,
  "secondary:shonen": 89,
  "secondary:shojo": 92,
  "pet:shonen": 90,
  "pet:shojo": 94,
  "villain:shonen": 92,
  "villain:shojo": 94,
};

assert.equal(cast.cast.length, 736, "final roster must contain 736 cast records");
assert.equal(v4.cast.length, 304, "Cast V4 manifest must contain 304 additions");
assert.equal(new Set(cast.cast.map((c) => c.id)).size, 736, "cast IDs must be unique");
assert.equal(new Set(v4.cast.map((c) => c.id)).size, 304, "V4 IDs must be unique");
assert.equal(genres.genres.length, 23);
assert.equal(genres.combos.length, 253);
const genreIds = genres.genres.map((g) => g.id);
assert.equal(new Set(genreIds).size, 23);
const pairKey = (a, b) => [a, b].sort().join("|");
const pairs = genreIds.flatMap((a, i) => genreIds.slice(i + 1).map((b) => pairKey(a, b)));
assert.equal(pairs.length, 253);
assert.deepEqual(genres.combos.map((c) => c.key).sort(), [...pairs].sort());

const requiredIdentity = ["id", "name", "archetype", "img", "personality", "role", "type", "hiddenAff", "gender", "species", "ageBand", "culturalBasis"];
for (const c of cast.cast) {
  for (const field of requiredIdentity) {
    assert.equal(typeof c[field], "string", `${c.id}: ${field} must be a string`);
    assert(c[field].trim(), `${c.id}: ${field} must be non-empty`);
  }
  assert(c.epithet && String(c.epithet).trim(), `${c.id}: epithet required`);
  assert(Array.isArray(c.visibleAff) && c.visibleAff.length === 2, `${c.id}: visibleAff must contain 2 genres`);
  const affinities = [...c.visibleAff, c.hiddenAff];
  assert.equal(new Set(affinities).size, 3, `${c.id}: affinities must be distinct`);
  assert(affinities.every((g) => genreIds.includes(g)), `${c.id}: unknown affinity`);
  assert(roles.includes(c.role), `${c.id}: unknown role`);
  assert(types.includes(c.type), `${c.id}: unknown anime type`);
  assert(!c.img.includes("art_src/cast_v4_upload_staging"), `${c.id}: runtime path must not point at staging`);
  assert(existsSync(resolve(root, "public", c.img)), `${c.id}: missing runtime portrait ${c.img}`);
}

// Existing Cast V3 contains one deliberate legacy full-name collision: Rook.
const allowedDuplicateNames = new Map([["Rook", new Set(["cv3_mascot_011", "cv3_mascot_057"])]]);
const byName = new Map();
for (const c of cast.cast) {
  const list = byName.get(c.name) ?? [];
  list.push(c.id);
  byName.set(c.name, list);
}
for (const [name, ids] of byName) {
  if (ids.length <= 1) continue;
  const allowed = allowedDuplicateNames.get(name);
  assert(allowed, `duplicate full name not allow-listed: ${name} (${ids.join(", ")})`);
  assert.deepEqual(new Set(ids), allowed, `unexpected IDs for allow-listed duplicate ${name}`);
}

const v4ById = new Map(v4.cast.map((c) => [c.id, c]));
for (const [id, expected] of v4ById) {
  const actual = cast.cast.find((c) => c.id === id);
  assert(actual, `V4 ID missing from final roster: ${id}`);
  for (const field of ["role", "type", "hiddenAff"]) assert.equal(actual[field], expected[field], `${id}: ${field} drift`);
  assert.deepEqual(actual.visibleAff, expected.visibleAff, `${id}: visible affinity drift`);
  assert.equal(actual.img, `cast/v4/${id}.webp`, `${id}: runtime portrait path drift`);
}

for (const [bucket, count] of Object.entries(expectedBuckets)) {
  const [role, type] = bucket.split(":");
  assert.equal(cast.cast.filter((c) => c.role === role && c.type === type).length, count, `${bucket}: roster count drift`);
}

const coverageRows = [];
let coveredCells = 0;
for (const role of roles) {
  for (const type of types) {
    const members = cast.cast.filter((c) => c.role === role && c.type === type && !c.legacyPlaceholder);
    for (const expectedPair of pairs) {
      const [genreA, genreB] = expectedPair.split("|");
      const witness = members.find((c) => {
        const affinities = [...c.visibleAff, c.hiddenAff];
        return affinities.includes(genreA) && affinities.includes(genreB);
      });
      assert(witness, `${role}/${type}: missing ${expectedPair}`);
      coverageRows.push([role, type, genreA, genreB, witness.id]);
      coveredCells += 1;
    }
  }
}
assert.equal(coveredCells, 2024, "strict Role × Type × pair coverage must be 2024/2024");
writeFileSync(
  resolve(root, "docs/content-v3/CAST_V3_TYPE_PAIR_COVERAGE.csv"),
  ["role,anime_type,genre_a,genre_b,witness_id", ...coverageRows.map((row) => row.join(","))].join("\n") + "\n",
);

assert.equal(arcs.add_arcs.length, 24);
assert.equal(arcs.add_combos.length, 18);
for (const [name, payload] of [["castV3", cast], ["genreV3", genres], ["arcV3", arcs]]) {
  writeFileSync(resolve(root, "src/engine/generated", `${name}.json`), JSON.stringify(payload, null, 2) + "\n");
}
console.log("Validated and generated final Cast V4 runtime: 736 cast, 23 genres, 253 pairs, strict 2024/2024 Role × Type pair coverage.");
