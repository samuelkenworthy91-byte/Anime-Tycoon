import { describe, expect, it } from "vitest";
import { CAST_V2, GENRES } from "../data";
import {
  CAST_COVERAGE_ROLES,
  CAST_COVERAGE_TYPES,
  computeCoverage,
  genrePairs,
  groupSummary,
} from "../castCoverage";

/* ------------------------------------------------------------------ *
 *  Cast V3 closure is deliberately TWO complementary guarantees:
 *
 *   - 253 pairs × 4 roles = 1,012 role cells (anime types mixed)
 *   - 253 pairs × 2 anime types = 506 type cells (roles mixed)
 *
 *  Total canonical acceptance grid = 1,518 cells. This matches the
 *  432-character closure now on main and avoids pretending that every
 *  54-member role×type intersection could cover 253 same-member pairs.
 * ------------------------------------------------------------------ */

describe("Cast V3 canonical pair closure", () => {
  const result = computeCoverage();

  it("enumerates exactly 253 unordered pairs from 23 canonical genres", () => {
    expect(GENRES).toHaveLength(23);
    expect(result.pairs).toBe(253);
    expect(genrePairs()).toHaveLength(253);
    expect(new Set(genrePairs().map(([a, b]) => [a, b].sort().join("|"))).size).toBe(253);
  });

  it("uses the four runtime roles and two anime types", () => {
    expect(CAST_COVERAGE_ROLES).toEqual(["protag", "secondary", "pet", "villain"]);
    expect(CAST_COVERAGE_TYPES).toEqual(["shonen", "shojo"]);
    expect(result.groups).toHaveLength(6);
  });

  it("audits exactly 1,518 canonical cells", () => {
    expect(result.roleRequired).toBe(4 * 253);
    expect(result.typeRequired).toBe(2 * 253);
    expect(result.required).toBe(1518);
    expect(result.cells).toHaveLength(1518);
  });

  it("covers every pair in each of the four cast roles — 1,012/1,012", () => {
    expect(result.roleCovered).toBe(result.roleRequired);
    expect(result.roleCovered).toBe(1012);
  });

  it("covers every pair globally within Shonen and within Shojo — 506/506", () => {
    expect(result.typeCovered).toBe(result.typeRequired);
    expect(result.typeCovered).toBe(506);
  });

  it("has a real same-member witness for every accepted cell", () => {
    expect(result.covered).toBe(result.required);
    for (const cell of result.cells) {
      expect(cell.covered, `${cell.dimension}:${cell.group}/${cell.pair.join("|")}`).toBe(true);
      expect(cell.witness).toBeTruthy();
      const member = CAST_V2.find((m) => m.id === cell.witness);
      expect(member).toBeTruthy();
      const aff = [...member!.visibleAff, member!.hiddenAff];
      expect(aff).toContain(cell.pair[0]);
      expect(aff).toContain(cell.pair[1]);
      if (cell.dimension === "role") expect(member!.role).toBe(cell.group);
      else expect(member!.type).toBe(cell.group);
    }
  });

  it("reports every canonical group as 253/253 with no missing pairs", () => {
    const summary = groupSummary(result.cells);
    expect(summary.size).toBe(6);
    for (const [group, row] of summary) {
      expect(row.required, group).toBe(253);
      expect(row.covered, group).toBe(253);
      expect(row.missing, group).toEqual([]);
    }
  });
});
