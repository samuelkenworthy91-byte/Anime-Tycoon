import { describe, expect, it } from "vitest";
import { GENRES, PROTAGONISTS } from "../data";
import { filterCastByFilters, filterCastByVisibleGenre } from "../castDisplayOrder";

describe("cast browse filters", () => {
  it("keeps the mixed source order when no filter is active", () => {
    const result = filterCastByFilters(PROTAGONISTS, []);
    expect(result.map((m) => m.id)).toEqual(PROTAGONISTS.map((m) => m.id));
    expect(result).not.toBe(PROTAGONISTS);
  });

  it("filters directly by Shonen or Shojo", () => {
    for (const type of ["shonen", "shojo"] as const) {
      const result = filterCastByFilters(PROTAGONISTS, [{ kind: "type", value: type }]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => m.type === type)).toBe(true);
    }
  });

  it("supports three simultaneous AND filters", () => {
    const target = PROTAGONISTS.find((member) => member.visibleAff.length >= 2)!;
    const filters = [
      { kind: "type" as const, value: target.type },
      { kind: "genre" as const, value: target.visibleAff[0] },
      { kind: "genre" as const, value: target.visibleAff[1] },
    ];
    const result = filterCastByFilters(PROTAGONISTS, filters);
    expect(result.some((member) => member.id === target.id)).toBe(true);
    expect(result.every((member) =>
      member.type === target.type &&
      member.visibleAff.includes(target.visibleAff[0]) &&
      member.visibleAff.includes(target.visibleAff[1])
    )).toBe(true);
  });

  it("returns cast connected to every genre, including concealed affinities", () => {
    for (const genre of GENRES.map((g) => g.id)) {
      const result = filterCastByVisibleGenre(PROTAGONISTS, genre);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => [...m.visibleAff, m.hiddenAff].includes(genre))).toBe(true);
    }
  });

  it("uses hidden affinities for eligibility without changing their concealed field", () => {
    for (const genre of GENRES.map((g) => g.id)) {
      const hiddenOnly = PROTAGONISTS.find((m) => m.hiddenAff === genre && !m.visibleAff.includes(genre));
      if (!hiddenOnly) continue;
      const result = filterCastByFilters(PROTAGONISTS, [{ kind: "genre", value: genre }]);
      expect(result.some((m) => m.id === hiddenOnly.id)).toBe(true);
      expect(hiddenOnly.visibleAff.includes(genre)).toBe(false);
      expect(hiddenOnly.hiddenAff).toBe(genre);
    }
  });
});
