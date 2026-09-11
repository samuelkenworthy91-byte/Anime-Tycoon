import { describe, expect, it } from "vitest";
import { GENRES, type GenreId } from "../data";

const EXPANSION_GENRES: GenreId[] = [
  "vampire",
  "grimdark",
  "monster_taming",
  "crime",
  "kaiju",
  "cosmic_horror",
  "arabia",
];

describe("R&D expansion genre licences", () => {
  it("keeps the full 30-genre catalog available to the R&D licence screen", () => {
    expect(GENRES).toHaveLength(30);

    const researchable = new Set(
      GENRES.filter((genre) => genre.rd > 0).map((genre) => genre.id),
    );

    for (const id of EXPANSION_GENRES) {
      const genre = GENRES.find((entry) => entry.id === id);
      expect(genre, id).toBeTruthy();
      expect(genre!.rd, id).toBeGreaterThan(0);
      expect(researchable.has(id), id).toBe(true);
    }
  });
});
