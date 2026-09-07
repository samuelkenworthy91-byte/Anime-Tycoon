#!/usr/bin/env node
/* ============================================================================
 * CAST V3 COVERAGE REPORT
 *
 * Canonical closure invariants:
 *   A) 253 pairs × 4 roles = 1,012 role cells (anime types mixed)
 *   B) 253 pairs × 2 anime types = 506 type cells (roles mixed)
 *
 * Total acceptance grid: 1,518 cells. A witness must be one selectable cast
 * member that carries BOTH genres among visibleAff + hiddenAff.
 * ========================================================================== */
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
const buildCells = (dimension, groups, memberFilter) => {
  const out = [];
  for (const group of groups) {
    const members = selectable.filter((m) => memberFilter(m, group));
    for (const [a, b] of pairs) {
      const witness = members.find((m) => {
        const aff = affOf(m);
        return aff.includes(a) && aff.includes(b);
      });
      out.push({ dimension, group, pair: `${a}|${b}`, covered: !!witness, witness: witness?.id ?? null });
    }
  }
  return out;
};

const roleCells = buildCells("role", ROLES, (m, role) => m.role === role);
const typeCells = buildCells("type", TYPES, (m, type) => m.type === type);
const cells = [...roleCells, ...typeCells];
const roleCovered = roleCells.filter((c) => c.covered).length;
const typeCovered = typeCells.filter((c) => c.covered).length;

const perGroup = {};
for (const c of cells) {
  const key = `${c.dimension}:${c.group}`;
  perGroup[key] ??= { required: 0, covered: 0, missing: [] };
  perGroup[key].required += 1;
  if (c.covered) perGroup[key].covered += 1;
  else perGroup[key].missing.push(c.pair);
}

const report = {
  title: "CAST V3 CANONICAL PAIR CLOSURE",
  roster: selectable.length,
  genres: genres.length,
  pairs: pairs.length,
  roleCoverage: { required: roleCells.length, covered: roleCovered },
  animeTypeCoverage: { required: typeCells.length, covered: typeCovered },
  required: cells.length,
  covered: roleCovered + typeCovered,
  missing: cells.filter((c) => !c.covered).map((c) => `${c.dimension}:${c.group}:${c.pair}`),
  perGroup,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("═".repeat(70));
  console.log("  CAST V3 CANONICAL PAIR CLOSURE");
  console.log("═".repeat(70));
  console.log(`Roster         : ${report.roster}`);
  console.log(`Genres / pairs : ${report.genres} / ${report.pairs}`);
  console.log(`ROLE CELLS     : ${roleCovered}/${roleCells.length}  (4 × 253)`);
  console.log(`TYPE CELLS     : ${typeCovered}/${typeCells.length}  (2 × 253)`);
  console.log(`TOTAL          : ${report.covered}/${report.required}`);
  console.log("─".repeat(70));
  for (const [group, row] of Object.entries(perGroup)) {
    console.log(`${group.padEnd(20)} ${String(row.covered).padStart(3)}/${row.required}`);
  }
  if (report.missing.length) {
    console.log("─".repeat(70));
    for (const item of report.missing) console.log(`MISSING ${item}`);
  }
}

process.exit(report.covered === report.required ? 0 : 1);
