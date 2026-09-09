import { describe, expect, it } from "vitest";
import { CAST_V2, GENRES } from "../data";
import {
  CAST_COVERAGE_ROLES,
  CAST_COVERAGE_TYPES,
  computeCoverage,
  genrePairs,
  groupSummary,
} from "../castCoverage";

describe("Cast V4 strict Role × Type pair closure", () => {
  const result = computeCoverage();

  it("enumerates 253 unordered pairs from 23 canonical genres", () => {
    expect(GENRES).toHaveLength(23);
    expect(result.pairs).toBe(253);
    expect(genrePairs()).toHaveLength(253);
    expect(new Set(genrePairs().map(([a, b]) => [a, b].sort().join("|"))).size).toBe(253);
  });

  it("uses four roles and two anime types", () => {
    expect(CAST_COVERAGE_ROLES).toEqual(["protag", "secondary", "pet", "villain"]);
    expect(CAST_COVERAGE_TYPES).toEqual(["shonen", "shojo"]);
    expect(result.groups).toHaveLength(8);
  });

  it("audits exactly 2,024 strict cells", () => {
    expect(result.required).toBe(4 * 2 * 253);
    expect(result.required).toBe(2024);
    expect(result.cells).toHaveLength(2024);
  });

  it("has a same-member witness in the exact role/type bucket for every cell", () => {
    expect(CAST_V2).toHaveLength(736);
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

  it("reports all eight buckets as 253/253", () => {
    const summary = groupSummary(result.cells);
    expect(summary.size).toBe(8);
    for (const [group, row] of summary) {
      expect(row.required, group).toBe(253);
      expect(row.covered, group).toBe(253);
      expect(row.missing, group).toEqual([]);
    }
  });
});
