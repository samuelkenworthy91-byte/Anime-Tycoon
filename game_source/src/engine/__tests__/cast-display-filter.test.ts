import { describe, expect, it } from "vitest";
import { GENRES, PROTAGONISTS } from "../data";
import { filterCastByFilters, filterCastByVisibleGenre } from "../castDisplayOrder";

const visiblePairKey = (member: (typeof PROTAGONISTS)[number]) => [...member.visibleAff].sort().join("|");
const ALL_DISCOVERED = PROTAGONISTS.map((member) => member.id);

describe("cast browse filters", () => {
  it("keeps source order while removing repeated public pairs from ordinary browsing", () => {
    const result = filterCastByFilters(PROTAGONISTS, []);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(PROTAGONISTS.length);

    for (const type of ["shonen", "shojo"] as const) {
      const cell = result.filter((member) => member.type === type);
      const keys = cell.map(visiblePairKey);
      expect(new Set(keys).size).toBe(keys.length);
    }

    const sourceIndex = new Map(PROTAGONISTS.map((member, index) => [member.id, index]));
    const indexes = result.map((member) => sourceIndex.get(member.id)!);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(result).not.toBe(PROTAGONISTS);
  });

  it("filters directly by Shonen or Shojo", () => {
    for (const type of ["shonen", "shojo"] as const) {
      const result = filterCastByFilters(PROTAGONISTS, [{ kind: "type", value: type }]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => m.type === type)).toBe(true);
    }
  });

  it("supports a strict Type + two-genre query with one owner", () => {
    const target = PROTAGONISTS.find((member) => member.visibleAff.length >= 2)!;
    const filters = [
      { kind: "type" as const, value: target.type },
      { kind: "genre" as const, value: target.visibleAff[0] },
      { kind: "genre" as const, value: target.visibleAff[1] },
    ];
    const result = filterCastByFilters(PROTAGONISTS, filters);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(target.type);
    expect([...result[0].visibleAff, result[0].hiddenAff]).toEqual(
      expect.arrayContaining([target.visibleAff[0], target.visibleAff[1]]),
    );
    // An exact public pair exists (the target itself), so strict ownership must
    // prefer an exact public-pair witness over a hidden-only witness.
    expect(result[0].visibleAff).toEqual(expect.arrayContaining([target.visibleAff[0], target.visibleAff[1]]));
  });

  it("returns cast connected to every genre, including concealed affinities", () => {
    for (const genre of GENRES.map((g) => g.id)) {
      const result = filterCastByVisibleGenre(PROTAGONISTS, genre, ALL_DISCOVERED);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => [...m.visibleAff, m.hiddenAff].includes(genre))).toBe(true);
    }
  });

  it("does not expose a hidden-affinity match until that character has been discovered", () => {
    for (const genre of GENRES.map((g) => g.id)) {
      const hiddenOnly = PROTAGONISTS.find((m) => m.hiddenAff === genre && !m.visibleAff.includes(genre));
      if (!hiddenOnly) continue;

      const before = filterCastByFilters(PROTAGONISTS, [{ kind: "genre", value: genre }], []);
      expect(before.some((m) => m.id === hiddenOnly.id)).toBe(false);

      const after = filterCastByFilters(PROTAGONISTS, [{ kind: "genre", value: genre }], [hiddenOnly.id]);
      expect(after.some((m) => m.id === hiddenOnly.id)).toBe(true);
      expect(after.find((m) => m.id === hiddenOnly.id)?.epithet).toContain("SECRET MATCH");
      expect(hiddenOnly.visibleAff.includes(genre)).toBe(false);
      expect(hiddenOnly.hiddenAff).toBe(genre);
    }
  });
});
