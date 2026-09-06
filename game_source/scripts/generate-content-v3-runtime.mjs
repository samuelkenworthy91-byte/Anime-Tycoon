import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => JSON.parse(readFileSync(resolve(root, "docs/content-v3", name), "utf8"));
const cast = read("CAST_V3_RUNTIME.json");
const genres = read("GENRE_V3_RUNTIME.json");
const arcs = read("ARC_V3_RUNTIME.json");
assert.equal(cast.cast.length, 400);
assert.equal(new Set(cast.cast.map(c => c.id)).size, 400);
assert.equal(genres.genres.length, 23);
assert.equal(genres.combos.length, 253);
const ids = genres.genres.map(g => g.id);
assert.equal(new Set(ids).size, 23);
const pair = (a, b) => [a, b].sort().join("|");
const pairs = ids.flatMap((a, i) => ids.slice(i + 1).map(b => pair(a, b)));
assert.deepEqual(genres.combos.map(c => c.key).sort(), [...pairs].sort());
for (const role of ["protag", "secondary", "pet", "villain"]) {
  const members = cast.cast.filter(c => c.role === role);
  assert.equal(members.length, 100);
  for (const type of ["shonen", "shojo"]) assert.equal(members.filter(c => c.type === type).length, 50);
  const covered = new Set();
  for (const c of members) {
    const affinities = [...c.visibleAff, c.hiddenAff];
    assert.equal(c.visibleAff.length, 2);
    assert.equal(new Set(affinities).size, 3);
    assert(affinities.every(g => ids.includes(g)));
    assert(c.epithet);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) covered.add(pair(affinities[i], affinities[j]));
  }
  assert(pairs.every(p => covered.has(p)), `${role}: incomplete coverage`);
}
assert.equal(arcs.add_arcs.length, 24);
assert.equal(arcs.add_combos.length, 18);
for (const [name, payload] of [["castV3", cast], ["genreV3", genres], ["arcV3", arcs]]) {
  writeFileSync(resolve(root, "src/engine/generated", `${name}.json`), JSON.stringify(payload, null, 2) + "\n");
}
console.log("Validated and generated Cast V3 (400), genres (23/253), and arc additions (24/18).");
