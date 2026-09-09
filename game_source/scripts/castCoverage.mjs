#!/usr/bin/env node
/* Strict Cast V4 coverage report: 4 roles × 2 anime types × 253 pairs = 2,024 cells. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cast = JSON.parse(readFileSync(path.join(root, "src/engine/generated/castV3.json"), "utf8")).cast;
const genres = JSON.parse(readFileSync(path.join(root, "src/engine/generated/genreV3.json"), "utf8")).genres.map((g) => g.id);
const ROLES = ["protag", "secondary", "pet", "villain"];
const TYPES = ["shonen", "shojo"];
const asJson = process.argv.includes("--json");

const pairs = [];
for (let i = 0; i < genres.length; i += 1) {
  for (let j = i + 1; j < genres.length; j += 1) pairs.push([genres[i], genres[j]]);
}
const selectable = cast.filter((m) => !m.legacyPlaceholder);
const affOf = (m) => [...m.visibleAff, m.hiddenAff];
const cells = [];
for (const role of ROLES) {
  for (const type of TYPES) {
    const members = selectable.filter((m) => m.role === role && m.type === type);
    for (const [a, b] of pairs) {
      const witness = members.find((m) => {
        const aff = affOf(m);
        return aff.includes(a) && aff.includes(b);
      });
      cells.push({ role, type, group: `${role}:${type}`, pair: `${a}|${b}`, covered: !!witness, witness: witness?.id ?? null });
    }
  }
}
const perGroup = {};
for (const c of cells) {
  perGroup[c.group] ??= { required: 0, covered: 0, missing: [] };
  perGroup[c.group].required += 1;
  if (c.covered) perGroup[c.group].covered += 1;
  else perGroup[c.group].missing.push(c.pair);
}
const covered = cells.filter((c) => c.covered).length;
const report = {
  title: "CAST V4 STRICT ROLE × TYPE PAIR CLOSURE",
  roster: selectable.length,
  genres: genres.length,
  pairs: pairs.length,
  required: cells.length,
  covered,
  missing: cells.filter((c) => !c.covered).map((c) => `${c.group}:${c.pair}`),
  perGroup,
};
if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log("═".repeat(70));
  console.log("  CAST V4 STRICT ROLE × TYPE PAIR CLOSURE");
  console.log("═".repeat(70));
  console.log(`Roster         : ${report.roster}`);
  console.log(`Genres / pairs : ${report.genres} / ${report.pairs}`);
  console.log(`TOTAL          : ${report.covered}/${report.required}`);
  console.log("─".repeat(70));
  for (const [group, row] of Object.entries(perGroup)) {
    console.log(`${group.padEnd(22)} ${String(row.covered).padStart(3)}/${row.required}`);
  }
  if (report.missing.length) {
    console.log("─".repeat(70));
    for (const item of report.missing) console.log(`MISSING ${item}`);
  }
}
process.exit(report.covered === report.required ? 0 : 1);
