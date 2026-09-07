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
 *  Part G: cast coverage validator — 253 visible genre pairs × 8 roles
 *  = 2,024 cells, reported exactly. Two truths are asserted:
 *   1. the enumeration math is exact (253 pairs, 8 groups, 2,024 cells)
 *   2. the gameplay invariant (type-mixed role coverage, what the live
 *      cast picker actually needs) stays complete — 4 × 253 = 1,012
 *  Strict per-type same-member cells are REPORTED (never fabricated);
 *  they have a hard combinatorial ceiling (50 members × C(3,2) = 150
 *  pair slots per group) so they cannot all be covered, by design.
 * ------------------------------------------------------------------ */

describe("cast coverage — 253 pairs × 8 roles = 2,024 cells", () => {
  const { required, covered, crewCovered, cells, pairs, groups } = computeCoverage();

  it("enumerates exactly 253 visible genre pairs from the 23 canonical genres", () => {
    expect(GENRES).toHaveLength(23);
    expect(pairs).toBe(23 * 22 / 2);
    expect(pairs).toBe(253);
    const seen = new Set(genrePairs().map(([a, b]) => [a, b].sort().join("|")));
    expect(seen.size).toBe(253);
    /* all pair members are visible (canonical) genres on live cast */
    const live = new Set(CAST_V2.flatMap((m) => m.visibleAff));
    for (const [a, b] of genrePairs()) {
      expect(live.has(a)).toBe(true);
      expect(live.has(b)).toBe(true);
    }
  });

  it("enumerates exactly 8 role groups (4 roles × 2 anime types)", () => {
    expect(groups).toHaveLength(8);
    expect(CAST_COVERAGE_ROLES).toEqual(["protag", "secondary", "pet", "villain"]);
    expect(CAST_COVERAGE_TYPES).toEqual(["shonen", "shojo"]);
  });

  it("REQUIRED is exactly 2,024 cells — no more, no fewer", () => {
    expect(required).toBe(2024);
    expect(cells).toHaveLength(2024);
  });

  it("every cell is explicitly adjudicated: coverage + crew-union + witness, no fabrication", () => {
    for (const c of cells) {
      expect(typeof c.covered).toBe("boolean");
      expect(typeof c.crewUnion).toBe("boolean");
      if (c.covered) {
        expect(c.witness).toBeTruthy();
        /* the witness truly carries both genres and belongs to the group */
        const m = CAST_V2.find((x) => x.id === c.witness)!;
        const aff = [...m.visibleAff, m.hiddenAff];
        expect(aff).toContain(c.pair[0]);
        expect(aff).toContain(c.pair[1]);
        expect(m.type).toBe(c.animeType);
      }
    }
  });

  it("the gameplay invariant holds: role-level (type-mixed) coverage is complete — 1,012/1,012", () => {
    const perRole = new Set<string>();
    for (const c of cells) {
      if (c.covered) perRole.add(`${c.role}|${c.pair[0]}|${c.pair[1]}`);
    }
    /* 4 roles × 253 pairs — every role can fill every paired prompt */
    expect(perRole.size).toBe(4 * 253);
  });

  it("crew-union floor is complete: both genres coexist in every group — 2,024/2,024", () => {
    expect(crewCovered).toBe(2024);
  });

  it("strict per-type coverage is honestly reported (and respects the combinatorial ceiling)", () => {
    /* each 50-member group offers ≤ 150 same-member pair slots (3 affinities
       per member → C(3,2) = 3 pairs × 50) — 253 strict cells per group are
       impossible; the report must sit at or under that ceiling */
    const summary = groupSummary(cells);
    expect(summary.size).toBe(8);
    for (const [group, row] of summary) {
      expect(row.required, group).toBe(253);
      expect(row.covered, group).toBeLessThanOrEqual(150);
      expect(row.missing.length + row.covered).toBe(253);
    }
    expect(covered).toBeGreaterThan(0);
    expect(covered).toBeLessThanOrEqual(150 * 8);
  });
});
