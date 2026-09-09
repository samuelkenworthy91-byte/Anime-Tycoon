import { describe, expect, it } from "vitest";
import { GENRES } from "../data";
import { randomStartingGenres } from "../startingGenres";

describe("random starting genres", () => {
  it("returns exactly two different canonical genres", () => {
    const picked = randomStartingGenres(() => 0);
    expect(picked).toEqual([GENRES[0].id, GENRES[1].id]);
    expect(new Set(picked).size).toBe(2);
    expect(picked.every((id) => GENRES.some((genre) => genre.id === id))).toBe(true);
  });

  it("can select genres from the far end of the live pool without duplicating", () => {
    const picked = randomStartingGenres(() => 0.999999);
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
    expect(picked.every((id) => GENRES.some((genre) => genre.id === id))).toBe(true);
  });
});
