import { readFileSync, writeFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const write = (path, text) => writeFileSync(path, text, "utf8");

function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Casting Catalog V7 migration target missing: ${label}`);
  return text.replace(from, to);
}

// 1) State/discovery must only reason about active catalogue members that have
// a real secret affinity. Reserve portraits and public-only pair blocks are not
// profileable and cannot generate fake CASTING BREAKTHROUGH notices.
{
  const path = "src/engine/state.ts";
  let text = read(path);
  text = replaceRequired(
    text,
    '} from "./data";\nimport {\n  inferAnimeType,',
    '} from "./data";\nimport { catalogHasSecret, isCastingActive } from "./castCatalog";\nimport {\n  inferAnimeType,',
    "state catalog helpers import",
  );
  text = replaceRequired(
    text,
    '  CAST_V2.filter((m) => !m.legacyPlaceholder).map((m) => m.id);',
    '  CAST_V2.filter((m) => isCastingActive(m) && catalogHasSecret(m)).map((m) => m.id);',
    "profileable cast pool",
  );
  text = replaceRequired(
    text,
    '? [...new Set(r.castAffinityDiscovered.filter((id) => typeof id === "string" && !castById(id).legacyPlaceholder))]',
    '? [...new Set(r.castAffinityDiscovered.filter((id) => {\n          if (typeof id !== "string") return false;\n          const member = castById(id);\n          return isCastingActive(member) && catalogHasSecret(member);\n        }))]',
    "save discovery cleanup",
  );
  text = replaceRequired(
    text,
    '    if (member.legacyPlaceholder || discovered.includes(castId) || !draft.genres.includes(member.hiddenAff)) return [];',
    '    if (!isCastingActive(member) || !catalogHasSecret(member) || discovered.includes(castId) || !draft.genres.includes(member.hiddenAff)) return [];',
    "release discovery gate",
  );
  write(path, text);
}

// 2) Remove the obsolete pair-owner field from the public CastMember schema.
{
  const path = "src/engine/data.ts";
  let text = read(path);
  const obsolete = '  /** Curated pair eligibility used by casting filters; hidden labels stay concealed. */\n  castingPairKeys?: string[];\n';
  if (text.includes(obsolete)) text = text.replace(obsolete, "");
  write(path, text);
}

// 3) Stop regenerating Genre30 castingPairKeys. The CSV remains art/content
// provenance; live pair ownership is created centrally by castCatalog.ts.
{
  const path = "scripts/content-packs/genre30-pack.mjs";
  let text = read(path);
  const start = text.indexOf('  const castById = new Map(cast.map((member) => [member.id, member]));');
  if (start >= 0) {
    const end = text.indexOf('  return cast;', start);
    if (end < 0) throw new Error("Casting Catalog V7 migration target missing: Genre30 return cast");
    text = text.slice(0, start)
      + '  // Pair ownership is intentionally NOT generated here. Casting Catalog V7\n'
      + '  // remaps every active Role × Type bucket centrally at runtime.\n'
      + text.slice(end);
  }
  write(path, text);
}

// 4) The source verifier now protects stable IDs and exact portrait bytes only.
// Old affinity triples may remain in archival manifests but are not live wiring.
{
  const path = "scripts/verify-cast-wiring.mjs";
  let text = read(path);
  const start = text.indexOf('const roles = ["protag", "secondary", "pet", "villain"];');
  const endMarker = 'for (const member of cast.filter((entry) => entry.id.startsWith("vg_"))) {';
  const end = text.indexOf(endMarker, start);
  if (start >= 0 && end >= 0) {
    const replacement = `const roles = ["protag", "secondary", "pet", "villain"];\nconst types = ["shonen", "shojo"];\nfor (const role of roles) for (const type of types) {\n  const bucket = v6Roster.filter((row) => row.role === role && row.anime_type === type);\n  assert.equal(bucket.length, 65, \`${"${role}/${type}"}: V6 source bucket count drift\`);\n}\nassert(cast.every((member) => !("castingPairKeys" in member)), "legacy castingPairKeys must not be regenerated");\n\n`;
    text = text.slice(0, start) + replacement + text.slice(end);
  }
  write(path, text);
}

// 5) Production-bundle verification must no longer demand the removed legacy
// owner index. Portrait/source checks remain intact.
{
  const path = "scripts/verify-built-cast.mjs";
  let text = read(path);
  text = text.replace(
    'assert(bundle.includes("castingPairKeys"), "compiled casting-connection index is missing");\n',
    '',
  );
  write(path, text);
}

console.log("Applied Casting Catalog V7 source migration.");
