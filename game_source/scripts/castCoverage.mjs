#!/usr/bin/env node
/* ============================================================================
 *  CAST COVERAGE REPORT — 253 visible genre pairs × 8 role groups = 2,024
 *
 *  Groups  : protag | secondary | pet | villain  ×  shonen | shojo  (8)
 *  Cells   : every unordered pair of the 23 canonical genres      (C(23,2)=253)
 *  COVERED : ≥1 selectable member of the group carries BOTH genres
 *            (visible ∪ hidden affinities) — the role slot can fill
 *            that paired prompt from within the group.
 *  CREW    : both genres exist somewhere in the group (soft floor).
 *
 *  Reads the live generated manifests (castV3.json, genreV3.json) — the same
 *  data the game imports. Exit codes: 0 = role-level coverage complete;
 *  1 = coverage regressed.  --strict upgrades to per-group (×2 types) demand.
 * ============================================================================ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cast = JSON.parse(readFileSync(path.join(root, "src/engine/generated/castV3.json"), "utf8")).cast;
const genres = JSON.parse(readFileSync(path.join(root, "src/engine/generated/genreV3.json"), "utf8")).genres.map((g) => g.id);

const ROLES = ["protag", "secondary", "pet", "villain"];
const TYPES = ["shonen", "shojo"];
const strict = process.argv.includes("--strict");
const asJson = process.argv.includes("--json");

const pairs = [];
for (let i = 0; i < genres.length; i++)
  for (let j = i + 1; j < genres.length; j++) pairs.push([genres[i], genres[j]]);

const affOf = (m) => [...m.visibleAff, m.hiddenAff];
const selectable = cast.filter((m) => !m.legacyPlaceholder);

const cells = [];
for (const role of ROLES) {
  for (const type of TYPES) {
    const members = selectable.filter((m) => m.role === role && m.type === type);
    const union = new Set();
    const pairWitness = new Map();
    for (const m of members) {
      const aff = affOf(m);
      for (const g of aff) union.add(g);
      for (let i = 0; i < aff.length; i++)
        for (let j = i + 1; j < aff.length; j++)
          pairWitness.set([aff[i], aff[j]].sort().join("|"), m.id);
    }
    for (const [a, b] of pairs) {
      const key = [a, b].sort().join("|");
      cells.push({
        group: `${role}.${type}`,
        pair: key,
        covered: pairWitness.has(key),
        witness: pairWitness.get(key) ?? null,
        crewUnion: union.has(a) && union.has(b),
      });
    }
  }
}

/* role-level view (type-merged): the game mixes types within a role */
const roleLevel = [];
for (const role of ROLES) {
  const members = selectable.filter((m) => m.role === role);
  const pairWitness = new Map();
  for (const m of members) {
    const aff = affOf(m);
    for (let i = 0; i < aff.length; i++)
      for (let j = i + 1; j < aff.length; j++)
        pairWitness.set([aff[i], aff[j]].sort().join("|"), m.id);
  }
  for (const [a, b] of pairs) {
    const key = [a, b].sort().join("|");
    roleLevel.push({ group: role, pair: key, covered: pairWitness.has(key), witness: pairWitness.get(key) ?? null });
  }
}

const required = cells.length; // 8 groups × 253 = 2024
const covered = cells.filter((c) => c.covered).length;
const crewCovered = cells.filter((c) => c.crewUnion).length;
const roleRequired = roleLevel.length; // 4 × 253 = 1012
const roleCovered = roleLevel.filter((c) => c.covered).length;

const byGroup = new Map();
for (const c of cells) {
  if (!byGroup.has(c.group)) byGroup.set(c.group, { total: 0, ok: 0, missing: [] });
  const g = byGroup.get(c.group);
  g.total++;
  if (c.covered) g.ok++;
  else g.missing.push(c.pair);
}

const report = {
  title: "CAST COVERAGE — 253 visible genre pairs × 8 roles = 2,024 cells",
  pairs: pairs.length,
  groups: ROLES.length * TYPES.length,
  required,
  covered,
  crewUnionCovered: crewCovered,
  missing: cells.filter((c) => !c.covered).map((c) => `${c.group}:${c.pair}`),
  roleLevel: { required: roleRequired, covered: roleCovered },
  feasibility: "Strict same-member pairs per role×type group is combinatorially capped (50 members × C(3,2) pair slots); role-level (type-merged) coverage is the gameplay invariant and is required = covered.",
  perGroup: Object.fromEntries([...byGroup.entries()].map(([g, v]) => [g, { required: v.total, covered: v.ok, missing: v.missing }])),
};

if (asJson) {
  console.log(JSON.stringify(report, null, 1));
} else {
  console.log("═".repeat(66));
  console.log("  CAST COVERAGE VALIDATOR");
  console.log("  253 visible genre pairs × 8 roles (4 roles × 2 types) = 2,024 cells");
  console.log("═".repeat(66));
  console.log(`REQUIRED : ${required}`);
  console.log(`COVERED  : ${covered}  (strict: one member of the group holds both genres)`);
  console.log(`CREW     : ${crewCovered}  (both genres exist somewhere in the group)`);
  console.log(`MISSING  : ${required - covered} strict cells`);
  console.log(`ROLE-LEVEL (type-mixed, the gameplay invariant): ${roleCovered}/${roleRequired}`);
  console.log("─".repeat(66));
  for (const [g, v] of byGroup) {
    console.log(`${g.padEnd(18)} ${String(v.ok).padStart(4)}/${v.total}   missing ${v.missing.length}`);
  }
  console.log("─".repeat(66));
  const missingRows = cells.filter((c) => !c.covered);
  for (const c of missingRows.slice(0, 200)) console.log(`  MISSING ${c.group.padEnd(18)} ${c.pair}`);
  if (missingRows.length > 200) console.log(`  … and ${missingRows.length - 200} more (use --json for the full list)`);
  console.log("─".repeat(66));
  console.log(`feasibility: ${report.feasibility}`);
}

/* gameplay invariant: role-level (type-mixed) coverage must stay complete */
const ok = roleCovered === roleRequired && crewCovered === required && (!strict || covered === required);
process.exit(ok ? 0 : 1);
