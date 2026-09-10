import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { buildVampireGrimdarkCast, VAMPIRE_GRIMDARK_NEW_GENRES } from "./content-packs/vampire-grimdark-pack.mjs";

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(gameRoot, "..");
const baseGenres = JSON.parse(readFileSync(resolve(gameRoot, "docs/content-v3/GENRE_V3_RUNTIME.json"), "utf8")).genres.map((g) => g.id);
const cast = buildVampireGrimdarkCast(baseGenres);
const roles = ["protag", "secondary", "pet", "villain"];
const types = ["shonen", "shojo"];

assert.equal(cast.length, baseGenres.length * roles.length * types.length, "genre-expansion cast must contain one legacy-partner witness per Role × Type bucket");
assert.equal(new Set(cast.map((c) => c.id)).size, cast.length, "genre-expansion cast IDs must be unique");
assert.equal(new Set(cast.map((c) => c.name)).size, cast.length, "genre-expansion cast names must be unique");
for (const role of roles) {
  for (const type of types) {
    const bucket = cast.filter((c) => c.role === role && c.type === type);
    assert.equal(bucket.length, baseGenres.length, `${role}/${type}: expansion bucket size drift`);
    assert.deepEqual(new Set(bucket.map((c) => c.legacyPartnerGenre)), new Set(baseGenres), `${role}/${type}: legacy-partner coverage drift`);
  }
}

const outDir = resolve(gameRoot, "public/cast/v5");
mkdirSync(outDir, { recursive: true });
const wanted = new Set();
for (const member of cast) {
  const affinities = [...member.visibleAff, member.hiddenAff];
  assert.equal(new Set(affinities).size, 3, `${member.id}: affinities must be distinct`);
  assert(VAMPIRE_GRIMDARK_NEW_GENRES.every((g) => affinities.includes(g)), `${member.id}: must include Vampire and Grimdark`);
  assert(affinities.includes(member.legacyPartnerGenre), `${member.id}: missing legacy partner affinity`);
  const source = resolve(repoRoot, member.sourceRoot);
  assert(existsSync(source), `${member.id}: missing root upload ${member.sourceRoot}`);
  const header = readFileSync(source).subarray(0, 24);
  assert.equal(header.toString("hex", 0, 8), "89504e470d0a1a0a", `${member.sourceRoot}: expected PNG source`);
  assert(header.readUInt32BE(16) > 0 && header.readUInt32BE(20) > 0, `${member.sourceRoot}: invalid PNG dimensions`);
  const destName = `${member.id}.png`;
  wanted.add(destName);
  copyFileSync(source, resolve(outDir, destName));
}
for (const file of readdirSync(outDir)) {
  if (file.startsWith("vg_") && file.endsWith(".png") && !wanted.has(file)) rmSync(resolve(outDir, file));
}
console.log(`Prepared ${cast.length} Vampire/Grimdark runtime portraits from the repository-root upload drop.`);
