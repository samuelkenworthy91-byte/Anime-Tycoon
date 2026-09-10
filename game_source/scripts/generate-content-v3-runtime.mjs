import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";
import { buildVampireGrimdarkCast } from "./content-packs/vampire-grimdark-pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (...parts) => JSON.parse(readFileSync(resolve(root, ...parts), "utf8"));
const baseCast = readJson("docs/content-v3/CAST_V3_RUNTIME.json");
const v4 = readJson("docs/cast-v4/CAST_V4_FINAL_RUNTIME.json");
const baseGenres = readJson("docs/content-v3/GENRE_V3_RUNTIME.json");
const baseArcs = readJson("docs/content-v3/ARC_V3_RUNTIME.json");
const castExpansion = { cast: buildVampireGrimdarkCast(baseGenres.genres.map((g) => g.id)) };
const genreExpansion = readJson("docs/content-v5/VAMPIRE_GRIMDARK_GENRES.json");
const arcExpansion = readJson("docs/content-v5/VAMPIRE_GRIMDARK_ARCS.json");

const cast = { cast: [...baseCast.cast, ...castExpansion.cast] };
const genres = {
  genres: [...baseGenres.genres, ...genreExpansion.genres],
  combos: [...baseGenres.combos, ...genreExpansion.combos],
};
const arcs = {
  add_arcs: [...baseArcs.add_arcs, ...arcExpansion.add_arcs],
  add_combos: [...baseArcs.add_combos, ...arcExpansion.add_combos],
};

const roles = ["protag", "secondary", "pet", "villain"];
const types = ["shonen", "shojo"];
const pairKey = (a, b) => [a, b].sort().join("|");
const genreIds = genres.genres.map((g) => g.id);
const pairs = genreIds.flatMap((a, i) => genreIds.slice(i + 1).map((b) => pairKey(a, b)));
const expectedCoverageCells = pairs.length * roles.length * types.length;

assert.equal(new Set(genreIds).size, genreIds.length, "genre IDs must be unique");
assert.equal(genres.combos.length, pairs.length, "genre combo manifest must contain every unordered pair exactly once");
assert.equal(new Set(genres.combos.map((c) => c.key)).size, pairs.length, "genre combo keys must be unique");
assert.deepEqual(genres.combos.map((c) => c.key).sort(), [...pairs].sort(), "genre combo matrix must exactly match canonical ids");
for (const combo of genres.combos) {
  assert.equal(combo.key, pairKey(combo.genre_1, combo.genre_2), `${combo.key}: non-canonical combo key`);
  assert(genreIds.includes(combo.genre_1) && genreIds.includes(combo.genre_2), `${combo.key}: unknown genre`);
  assert(["strong", "supportive", "neutral", "risky", "experimental"].includes(combo.discovery_class), `${combo.key}: unknown discovery class`);
}

assert.equal(cast.cast.length, baseCast.cast.length + castExpansion.cast.length, "final roster size drift");
assert.equal(new Set(cast.cast.map((c) => c.id)).size, cast.cast.length, "cast IDs must be unique");
assert.equal(v4.cast.length, 304, "Cast V4 manifest must contain 304 additions");
assert.equal(new Set(v4.cast.map((c) => c.id)).size, 304, "V4 IDs must be unique");
assert.equal(castExpansion.cast.length, (genreIds.length - genreExpansion.genres.length) * roles.length * types.length, "Vampire/Grimdark cast pack size drift");

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
  assert(!c.img.includes("art_src"), `${c.id}: runtime path must not point at art staging`);
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
  const actual = baseCast.cast.find((c) => c.id === id);
  assert(actual, `V4 ID missing from 736-cast base roster: ${id}`);
  for (const field of ["role", "type", "hiddenAff"]) assert.equal(actual[field], expected[field], `${id}: ${field} drift`);
  assert.deepEqual(actual.visibleAff, expected.visibleAff, `${id}: visible affinity drift`);
}

const oldGenreIds = baseGenres.genres.map((g) => g.id);
const requiredNew = new Set(genreExpansion.genres.map((g) => g.id));
assert.deepEqual(requiredNew, new Set(["vampire", "grimdark"]), "this pack must add Vampire and Grimdark only");
for (const role of roles) {
  for (const type of types) {
    const bucket = castExpansion.cast.filter((c) => c.role === role && c.type === type);
    assert.equal(bucket.length, oldGenreIds.length, `${role}/${type}: expansion bucket size drift`);
    assert.deepEqual(new Set(bucket.map((c) => c.legacyPartnerGenre)), new Set(oldGenreIds), `${role}/${type}: legacy partner coverage drift`);
    for (const c of bucket) {
      const aff = [...c.visibleAff, c.hiddenAff];
      assert([...requiredNew].every((g) => aff.includes(g)), `${c.id}: must carry both new genres`);
      assert(aff.includes(c.legacyPartnerGenre), `${c.id}: missing legacy partner genre`);
    }
  }
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
assert.equal(coveredCells, expectedCoverageCells, `strict Role × Type × pair coverage must be ${expectedCoverageCells}/${expectedCoverageCells}`);
writeFileSync(
  resolve(root, "docs/content-v3/CAST_V3_TYPE_PAIR_COVERAGE.csv"),
  ["role,anime_type,genre_a,genre_b,witness_id", ...coverageRows.map((row) => row.join(","))].join("\n") + "\n",
);

const arcIds = arcs.add_arcs.map((a) => a.id);
const arcComboIds = arcs.add_combos.map((a) => a.id);
assert.equal(new Set(arcIds).size, arcIds.length, "arc IDs must be unique");
assert.equal(new Set(arcComboIds).size, arcComboIds.length, "arc-combo IDs must be unique");
for (const a of arcs.add_arcs) {
  for (const g of [...(a.syn ?? []), ...(a.anti ?? [])]) assert(genreIds.includes(g), `${a.id}: unknown genre ${g}`);
  if (a.unlock?.kind === "genre") assert(genreIds.includes(a.unlock.genre), `${a.id}: unknown unlock genre ${a.unlock.genre}`);
}

for (const [name, payload] of [["castV3", cast], ["genreV3", genres], ["arcV3", arcs]]) {
  writeFileSync(resolve(root, "src/engine/generated", `${name}.json`), JSON.stringify(payload, null, 2) + "\n");
}
console.log(`Validated generated runtime: ${cast.cast.length} cast, ${genreIds.length} genres, ${pairs.length} pairs, strict ${expectedCoverageCells}/${expectedCoverageCells} Role × Type pair coverage.`);
