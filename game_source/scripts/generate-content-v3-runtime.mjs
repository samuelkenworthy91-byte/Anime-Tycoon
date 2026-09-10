import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";
import { buildVampireGrimdarkCast } from "./content-packs/vampire-grimdark-pack.mjs";
import {
  buildGenre30Cast,
  buildGenre30Combos,
  GENRE30_NEW_GENRES,
  GENRE30_NEW_IDS,
  parseCsv,
} from "./content-packs/genre30-pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (...parts) => JSON.parse(readFileSync(resolve(root, ...parts), "utf8"));

const baseCast = readJson("docs/content-v3/CAST_V3_RUNTIME.json");
const v4 = readJson("docs/cast-v4/CAST_V4_FINAL_RUNTIME.json");
const baseGenres = readJson("docs/content-v3/GENRE_V3_RUNTIME.json");
const baseArcs = readJson("docs/content-v3/ARC_V3_RUNTIME.json");
const vgGenres = readJson("docs/content-v5/VAMPIRE_GRIMDARK_GENRES.json");
const vgArcs = readJson("docs/content-v5/VAMPIRE_GRIMDARK_ARCS.json");
const genre30Arcs = readJson("docs/content-v6/GENRE30_ARCS.json");
const genre30Manifest = parseCsv(readFileSync(resolve(root, "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv"), "utf8"));

const roles = ["protag", "secondary", "pet", "villain"];
const types = ["shonen", "shojo"];
const pairKey = (a, b) => [a, b].sort().join("|");

const baseGenreIds = baseGenres.genres.map((g) => g.id);
const vgCast = buildVampireGrimdarkCast(baseGenreIds);
const cast25 = [...baseCast.cast, ...vgCast];
const genre25Ids = [...baseGenreIds, ...vgGenres.genres.map((g) => g.id)];
const genre30Cast = buildGenre30Cast(genre30Manifest, new Set(cast25.map((c) => c.name)));
const genre30Combos = buildGenre30Combos(genre25Ids);

const cast = { cast: [...cast25, ...genre30Cast] };
const genres = {
  genres: [...baseGenres.genres, ...vgGenres.genres, ...GENRE30_NEW_GENRES],
  combos: [...baseGenres.combos, ...vgGenres.combos, ...genre30Combos],
};
const arcs = {
  add_arcs: [...baseArcs.add_arcs, ...vgArcs.add_arcs, ...genre30Arcs.add_arcs],
  add_combos: [...baseArcs.add_combos, ...vgArcs.add_combos, ...genre30Arcs.add_combos],
};

const genreIds = genres.genres.map((g) => g.id);
const pairs = genreIds.flatMap((a, i) => genreIds.slice(i + 1).map((b) => pairKey(a, b)));
const expectedCoverageCells = pairs.length * roles.length * types.length;
const newPairs = pairs.filter((key) => key.split("|").some((g) => GENRE30_NEW_IDS.includes(g)));

assert.equal(baseGenreIds.length, 23, "canonical V3 base must remain 23 genres");
assert.equal(vgGenres.genres.length, 2, "Vampire/Grimdark pack must remain exactly two genres");
assert.deepEqual(new Set(vgGenres.genres.map((g) => g.id)), new Set(["vampire", "grimdark"]), "Vampire/Grimdark ids drifted");
assert.equal(GENRE30_NEW_GENRES.length, 5, "Genre 30 pack must add exactly five genres");
assert.deepEqual(new Set(GENRE30_NEW_IDS), new Set(["monster_taming", "crime", "kaiju", "cosmic_horror", "arabia"]), "Genre 30 ids drifted");
assert.equal(genreIds.length, 30, `expected 30 genres, got ${genreIds.length}`);
assert.equal(new Set(genreIds).size, genreIds.length, "genre IDs must be unique");
assert.equal(pairs.length, 435, `expected 435 unordered genre pairs, got ${pairs.length}`);
assert.equal(newPairs.length, 135, `expected 135 new pairs from genres 26-30, got ${newPairs.length}`);

assert.equal(genre30Combos.length, 135, "Genre 30 pack must author all 135 newly introduced pairs");
assert.deepEqual(new Set(genre30Combos.map((c) => c.key)), new Set(newPairs), "Genre 30 combo pack does not exactly match the 135 new pairs");
assert.equal(genres.combos.length, pairs.length, "genre combo manifest must contain every unordered pair exactly once");
assert.equal(new Set(genres.combos.map((c) => c.key)).size, pairs.length, "genre combo keys must be unique");
assert.deepEqual(genres.combos.map((c) => c.key).sort(), [...pairs].sort(), "genre combo matrix must exactly match canonical ids");
for (const combo of genres.combos) {
  assert.equal(combo.key, pairKey(combo.genre_1, combo.genre_2), `${combo.key}: non-canonical combo key`);
  assert(genreIds.includes(combo.genre_1) && genreIds.includes(combo.genre_2), `${combo.key}: unknown genre`);
  assert(["strong", "supportive", "neutral", "risky", "experimental"].includes(combo.discovery_class), `${combo.key}: unknown discovery class`);
}
for (const id of GENRE30_NEW_IDS) {
  const authored = genre30Combos.filter((c) => c.genre_1 === id || c.genre_2 === id);
  assert.equal(authored.length, 29, `${id}: every new genre must pair with the other 29 genres`);
  const classes = new Set(authored.map((c) => c.discovery_class));
  assert(classes.has("strong"), `${id}: needs at least one strong pairing`);
  assert(classes.has("supportive"), `${id}: needs at least one supportive pairing`);
  assert(classes.has("experimental") || classes.has("risky"), `${id}: needs at least one non-obvious pairing`);
}

assert.equal(v4.cast.length, 304, "Cast V4 manifest must contain 304 additions");
assert.equal(new Set(v4.cast.map((c) => c.id)).size, 304, "V4 IDs must be unique");
assert.equal(vgCast.length, 184, `expected 184 Vampire/Grimdark cast, got ${vgCast.length}`);
assert.equal(genre30Manifest.length, 520, `expected 520 Genre 30 manifest rows, got ${genre30Manifest.length}`);
assert.equal(genre30Cast.length, 520, `expected 520 Genre 30 cast, got ${genre30Cast.length}`);
assert.equal(cast.cast.length, 1440, `expected 1,440 total cast, got ${cast.cast.length}`);
assert.equal(new Set(cast.cast.map((c) => c.id)).size, cast.cast.length, "cast IDs must be unique");

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

const vgNew = new Set(["vampire", "grimdark"]);
for (const role of roles) {
  for (const type of types) {
    const bucket = vgCast.filter((c) => c.role === role && c.type === type);
    assert.equal(bucket.length, baseGenreIds.length, `${role}/${type}: Vampire/Grimdark bucket size drift`);
    assert.deepEqual(new Set(bucket.map((c) => c.legacyPartnerGenre)), new Set(baseGenreIds), `${role}/${type}: Vampire/Grimdark legacy partner coverage drift`);
    for (const c of bucket) {
      const aff = [...c.visibleAff, c.hiddenAff];
      assert([...vgNew].every((g) => aff.includes(g)), `${c.id}: must carry Vampire and Grimdark`);
      assert(aff.includes(c.legacyPartnerGenre), `${c.id}: missing legacy partner genre`);
    }
  }
}

for (const role of roles) {
  for (const type of types) {
    const bucket = genre30Cast.filter((c) => c.role === role && c.type === type);
    assert.equal(bucket.length, 65, `${role}/${type}: Genre 30 bucket must contain 65 cast`);
    const witnessed = new Set();
    for (const c of bucket) {
      const affinities = [...c.visibleAff, c.hiddenAff];
      for (let i = 0; i < affinities.length; i += 1) {
        for (let j = i + 1; j < affinities.length; j += 1) {
          const key = pairKey(affinities[i], affinities[j]);
          if (newPairs.includes(key)) witnessed.add(key);
        }
      }
    }
    assert.equal(witnessed.size, 135, `${role}/${type}: Genre 30 cast must witness all 135 newly introduced pairs`);
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
assert.equal(expectedCoverageCells, 3480, `30 genres should create 3,480 strict coverage cells, got ${expectedCoverageCells}`);
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
const arcIdSet = new Set([...arcIds, "case", "confession"]);
for (const combo of genre30Arcs.add_combos) {
  assert(Array.isArray(combo.arcs) && combo.arcs.length >= 2, `${combo.id}: arc combo needs at least two arcs`);
  for (const id of combo.arcs) assert(arcIdSet.has(id), `${combo.id}: unknown arc ${id}`);
}
for (const id of GENRE30_NEW_IDS) {
  const support = genre30Arcs.add_arcs.filter((a) => (a.syn ?? []).includes(id) || (a.anti ?? []).includes(id) || a.unlock?.genre === id);
  assert(support.length >= 8, `${id}: needs broad story-arc support`);
}
for (let i = 0; i < GENRE30_NEW_IDS.length; i += 1) {
  for (let j = i + 1; j < GENRE30_NEW_IDS.length; j += 1) {
    const a = GENRE30_NEW_IDS[i];
    const b = GENRE30_NEW_IDS[j];
    assert(genre30Arcs.add_arcs.some((arc) => (arc.syn ?? []).includes(a) && (arc.syn ?? []).includes(b)), `${a}+${b}: needs a crossover story arc`);
  }
}

for (const [name, payload] of [["castV3", cast], ["genreV3", genres], ["arcV3", arcs]]) {
  writeFileSync(resolve(root, "src/engine/generated", `${name}.json`), JSON.stringify(payload, null, 2) + "\n");
}
console.log(`Validated generated runtime: ${cast.cast.length} cast, ${genreIds.length} genres, ${pairs.length} pairs, strict ${expectedCoverageCells}/${expectedCoverageCells} Role × Type pair coverage, ${genre30Arcs.add_arcs.length} Genre 30 arcs and ${genre30Arcs.add_combos.length} Genre 30 arc combos.`);
