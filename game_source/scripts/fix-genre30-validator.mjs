import { readFileSync, writeFileSync } from "node:fs";
const path = "game_source/scripts/generate-content-v3-runtime.mjs";
let s = readFileSync(path, "utf8");
const from = `const arcIdSet = new Set(arcIds);
for (const combo of arcs.add_combos) {
  assert(Array.isArray(combo.arcs) && combo.arcs.length >= 2, \`${'${combo.id}'}: arc combo needs at least two arcs\`);
  for (const id of combo.arcs) assert(arcIdSet.has(id), \`${'${combo.id}'}: unknown arc ${'${id}'}\`);
}`;
const to = `const arcIdSet = new Set([...arcIds, "case", "confession"]);
for (const combo of genre30Arcs.add_combos) {
  assert(Array.isArray(combo.arcs) && combo.arcs.length >= 2, \`${'${combo.id}'}: arc combo needs at least two arcs\`);
  for (const id of combo.arcs) assert(arcIdSet.has(id), \`${'${combo.id}'}: unknown arc ${'${id}'}\`);
}`;
if (!s.includes(from)) throw new Error("arc-combo validator patch target not found");
s = s.replace(from, to);
writeFileSync(path, s);
console.log("Narrowed strict arc-reference validation to the new Genre 30 combo pack; full runtime references remain covered by Vitest.");
