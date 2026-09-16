import { describe, expect, it } from "vitest";
import { GENRES } from "../data";
import { randomAnimeTitle } from "../titleGenerator";

function seeded(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

describe("genre-aware anime title generator", () => {
  it("can generate safe titles for every live genre", () => {
    for (const [index, genre] of GENRES.entries()) {
      const title = randomAnimeTitle([genre.id], index % 2 ? "shojo" : "shonen", seeded(index + 1));
      expect(title.length).toBeGreaterThan(2);
      expect(title.length).toBeLessThanOrEqual(64);
    }
  });

  it("produces a broad pool rather than a single adjective+noun pattern", () => {
    const titles = new Set<string>();
    for (let i = 1; i <= 160; i++) titles.add(randomAnimeTitle([], i % 2 ? "shonen" : "shojo", seeded(i * 7919)));
    expect(titles.size).toBeGreaterThan(120);
    expect([...titles].some((title) => title.includes(":"))).toBe(true);
    expect([...titles].some((title) => title.split(" ").length >= 5)).toBe(true);
  });

  it("mixes vocabulary when two genres are selected", () => {
    const titles = Array.from({ length: 80 }, (_, i) => randomAnimeTitle(["cyber", "romance"], "shojo", seeded(i + 99)));
    expect(new Set(titles).size).toBeGreaterThan(60);
    expect(titles.every((title) => title.length <= 64)).toBe(true);
  });
});
