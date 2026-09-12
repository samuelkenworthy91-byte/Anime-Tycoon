import { describe, expect, it } from "vitest";
import { ARCS, ARC_RESEARCH_COMBOS, ARC_RESEARCH_GENRE_KEYS, GENRES, arcGenreFit } from "../data";
import { GENRE_SPEC_GROUPS, growthForLevel, uniformGenreForSeed, specDef } from "../careers";
import type { Staff } from "../data";

describe("depth pass stage 1", () => {
  it("Genre Studies supplies exactly two genuine positive arc fits for all 30 genres", () => {
    expect(GENRES).toHaveLength(30);
    expect(ARC_RESEARCH_GENRE_KEYS).toHaveLength(60);
    for (const genre of GENRES) {
      const keys = ARC_RESEARCH_GENRE_KEYS.filter((k) => k.endsWith(`|${genre.id}`));
      expect(keys).toHaveLength(2);
      for (const key of keys) {
        const id = key.slice(0, key.lastIndexOf("|"));
        const arc = ARCS.find((a) => a.id === id)!;
        expect(arcGenreFit(arc, genre.id).score).toBeGreaterThan(0);
      }
    }
  });
  it("Narrative Analytics now teaches a substantially larger structure library", () => {
    expect(ARC_RESEARCH_COMBOS.length).toBeGreaterThanOrEqual(12);
  });
  it("uniform genre seed maps every genre exactly once in a 30-seed cycle", () => {
    expect(new Set(Array.from({ length: GENRES.length }, (_, i) => uniformGenreForSeed(i))).size).toBe(GENRES.length);
  });
  it("purple specialisations stay grouped while covering every genre equally", () => {
    expect(GENRE_SPEC_GROUPS).toHaveLength(10);
    expect(GENRE_SPEC_GROUPS.every((g) => g.genres.length === 3)).toBe(true);
    const flat = GENRE_SPEC_GROUPS.flatMap((g) => [...g.genres]);
    expect(flat).toHaveLength(GENRES.length);
    expect(new Set(flat).size).toBe(GENRES.length);
    for (const genre of GENRES) {
      expect(flat.filter((g) => g === genre.id)).toHaveLength(1);
      for (const role of ["writer", "animator", "composer"] as const) {
        const group = GENRE_SPEC_GROUPS.find((g) => g.genres.includes(genre.id))!;
        expect(specDef(`g_${role}_${group.id}`)?.genres).toContain(genre.id);
      }
    }
  });
  it("elite Potential has a dramatically higher ceiling than weak Potential", () => {
    const base = (id:string,potential:number):Staff => ({ id, name:id, role:"animator", story:20, art:40, sound:20, level:1, salary:1, cost:1, stamina:100, portrait:0, potential });
    const low = Array.from({length:100},(_,i)=>growthForLevel(base(`low-${i}`,10),10)).map(g=>g.story+g.art+g.sound);
    const elite = Array.from({length:100},(_,i)=>growthForLevel(base(`elite-${i}`,100),10)).map(g=>g.story+g.art+g.sound);
    expect(Math.min(...low)).toBe(0);
    expect(Math.max(...elite)).toBeGreaterThanOrEqual(20);
    expect(elite.reduce((a,b)=>a+b,0)/elite.length).toBeGreaterThan((low.reduce((a,b)=>a+b,0)/low.length)*5);
  });
});
