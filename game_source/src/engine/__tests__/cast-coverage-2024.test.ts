import { describe, expect, it } from "vitest";
import { CAST_V2, GENRES } from "../data";
import {
  CAST_COVERAGE_ROLES,
  CAST_COVERAGE_TYPES,
  computeCoverage,
  genrePairs,
  groupSummary,
} from "../castCoverage";

const expectedPairs = (GENRES.length * (GENRES.length - 1)) / 2;
const expectedCells = CAST_COVERAGE_ROLES.length * CAST_COVERAGE_TYPES.length * expectedPairs;

describe("strict Role × Type pair closure", () => {
  const result = computeCoverage();

  it("enumerates every unordered pair from the active genre catalog", () => {
    expect(GENRES).toHaveLength(30);
    expect(result.pairs).toBe(expectedPairs);
    expect(genrePairs()).toHaveLength(expectedPairs);
    expect(new Set(genrePairs().map(([a, b]) => [a, b].sort().join("|"))).size).toBe(expectedPairs);
  });

  it("uses four roles and two anime types", () => {
    expect(CAST_COVERAGE_ROLES).toEqual(["protag", "secondary", "pet", "villain"]);
    expect(CAST_COVERAGE_TYPES).toEqual(["shonen", "shojo"]);
    expect(result.groups).toHaveLength(8);
  });

  it("audits every strict Role × Type × genre-pair cell", () => {
    expect(expectedPairs).toBe(435);
    expect(result.required).toBe(expectedCells);
    expect(result.required).toBe(3480);
    expect(result.cells).toHaveLength(expectedCells);
  });

  it("has a same-member witness in the exact role/type bucket for every cell", () => {
    expect(CAST_V2).toHaveLength(1440);
    expect(result.covered).toBe(result.required);
    for (const cell of result.cells) {
      expect(cell.covered, `${cell.group}/${cell.pair.join("|")}`).toBe(true);
      expect(cell.witness).toBeTruthy();
      const member = CAST_V2.find((m) => m.id === cell.witness);
      expect(member).toBeTruthy();
      expect(member!.role).toBe(cell.role);
      expect(member!.type).toBe(cell.type);
      const aff = [...member!.visibleAff, member!.hiddenAff];
      expect(aff).toContain(cell.pair[0]);
      expect(aff).toContain(cell.pair[1]);
    }
  });

  it("reports all eight buckets as fully closed", () => {
    const summary = groupSummary(result.cells);
    expect(summary.size).toBe(8);
    for (const [group, row] of summary) {
      expect(row.required, group).toBe(expectedPairs);
      expect(row.covered, group).toBe(expectedPairs);
      expect(row.missing, group).toEqual([]);
    }
  });
});
