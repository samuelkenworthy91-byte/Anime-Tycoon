import { describe, expect, it } from "vitest";
import { GENRES, PROTAGONISTS } from "../data";
import { filterCastByVisibleGenre } from "../castDisplayOrder";

describe("cast visible-genre filter", () => {
  it("keeps the mixed source order when no filter is active", () => {
    const result = filterCastByVisibleGenre(PROTAGONISTS, null);
    expect(result.map((m) => m.id)).toEqual(PROTAGONISTS.map((m) => m.id));
    expect(result).not.toBe(PROTAGONISTS);
  });

  it("returns only cast with the requested visible affinity", () => {
    for (const genre of GENRES.map((g) => g.id)) {
      const result = filterCastByVisibleGenre(PROTAGONISTS, genre);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => m.visibleAff.includes(genre))).toBe(true);
    }
  });

  it("never uses hidden affinities to satisfy the filter", () => {
    for (const genre of GENRES.map((g) => g.id)) {
      const hiddenOnly = PROTAGONISTS.find((m) => m.hiddenAff === genre && !m.visibleAff.includes(genre));
      if (!hiddenOnly) continue;
      const result = filterCastByVisibleGenre(PROTAGONISTS, genre);
      expect(result.some((m) => m.id === hiddenOnly.id)).toBe(false);
    }
  });
});
