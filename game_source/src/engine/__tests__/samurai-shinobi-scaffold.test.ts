import { describe, expect, it } from "vitest";
import manifest from "../generated/genreV3.json";
import {
  AUDIENCES,
  CANONICAL_GENRE_IDS,
  COMBO,
  GENRE,
  GENRES,
  SLOTS,
  comboMult,
  comboKey,
  type GenreId,
} from "../data";
import { initMarket } from "../market";
import { migrateActiveGenre, migrateGenreRecord } from "../castV2Migration";
import { migrateRun as migrateRunState } from "../state";
import { ensureCareer, rollHire } from "../careers";
import { ARCS } from "../data";

const LEGACY_EXPANSION_IDS = ["samurai", "shinobi"] as GenreId[];
const CURRENT_EXPANSION_IDS = ["vampire", "grimdark"] as GenreId[];
const ALL_EXPANSION_IDS = [...LEGACY_EXPANSION_IDS, ...CURRENT_EXPANSION_IDS];

describe("canonical genre expansion regressions", () => {
  it("exposes 25 active canonical genre ids", () => {
    expect(GENRES).toHaveLength(25);
    expect(ALL_EXPANSION_IDS.every((id) => GENRES.some((g) => g.id === id))).toBe(true);
    expect(CANONICAL_GENRE_IDS).toHaveLength(25);
    expect(GENRES.map((g) => g.id)).toEqual(CANONICAL_GENRE_IDS);
  });

  it("gives expansion ids complete runtime entries", () => {
    for (const id of ALL_EXPANSION_IDS) {
      const g = GENRE(id);
      expect(g.label).toBeTruthy();
      expect(g.desc).toBeTruthy();
      expect(g.desc.length).toBeGreaterThan(10);
      expect(g.icon).toBeDefined();
      expect(g.ideal).toHaveLength(3);
      expect(g.ideal.every((v) => v >= 0 && v <= 100)).toBe(true);
      expect(g.ratio.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
      expect(g.rd).toBeGreaterThan(0);
      expect(g.desc.toUpperCase()).not.toContain("PROVISIONAL");
    }
  });

  it("keeps Martial Arts present and untouched", () => {
    const martial = GENRE("martial");
    expect(martial.label).toBe("Martial Arts");
    expect(martial.ideal).toEqual([62, 78, 48]);
  });

  it("initialises the market with all 25 genre keys", () => {
    const market = initMarket();
    for (const id of ALL_EXPANSION_IDS) {
      expect(typeof market.genres[id]).toBe("number");
      expect(Number.isFinite(market.genres[id])).toBe(true);
    }
    expect(Object.keys(market.genres)).toHaveLength(25);
  });

  it("staff favourite-genre picking accepts canonical ids", () => {
    const hires = Array.from({ length: 40 }, (_, i) => rollHire(i));
    expect(hires.every((s) => GENRES.some((g) => g.id === s.favGenre))).toBe(true);
    const forced = ensureCareer({ ...hires[0], favGenre: "samurai" as GenreId }, 0);
    expect(forced.favGenre).toBe("samurai");
  });

  it("supports authored story arcs for all expansion genres", () => {
    for (const id of ALL_EXPANSION_IDS) {
      expect(ARCS.some(a => a.syn?.includes(id) || a.anti?.includes(id)), id).toBe(true);
    }
  });

  it("preserves established Samurai and Shinobi slot preferences", () => {
    expect(SLOTS.prime.best).toContain("samurai");
    expect(SLOTS.midnight.best).toContain("shinobi");
  });

  it("keeps audience fit lookup safe for every active genre", () => {
    for (const audience of Object.values(AUDIENCES)) {
      for (const id of CANONICAL_GENRE_IDS) expect(Number.isFinite(audience.fit[id] ?? 1), `${audience.label}/${id}`).toBe(true);
    }
  });

  it("loads all 300 canonical pairs and their authored multipliers", () => {
    expect(manifest.combos).toHaveLength(300);
    for (const pair of manifest.combos) {
      expect(comboMult([pair.genre_1, pair.genre_2] as GenreId[])).toBe(pair.learned_multiplier);
    }
    expect(COMBO[comboKey(["samurai", "military"])]).toBe(1.22);
    expect(COMBO[comboKey(["shinobi", "mystery"])]).toBe(1.22);
    expect(COMBO[comboKey(["vampire", "horror"] as GenreId[])]).toBe(1.27);
    expect(COMBO[comboKey(["grimdark", "space"] as GenreId[])]).toBe(1.27);
  });

  it("migration accepts expansion ids and preserves old sparse records", () => {
    for (const id of ALL_EXPANSION_IDS) expect(migrateActiveGenre(id)).toBe(id);
    const migrated = migrateGenreRecord({ mecha: 3, slice: 1 });
    expect(migrated).toEqual({ mecha: 3, slice: 1 });
  });

  it("full migrateRun expands an older save without auto-unlocking researched genres", () => {
    const legacy = {
      week: 10,
      cash: 100_000,
      rd: 50,
      genresUnlocked: ["slice", "fantasy"],
      genreKnowledge: { mecha: 4 },
      comboLevels: { "mecha|slice": 2 },
      market: { genres: { mecha: 1 }, audiences: {}, mediums: {} },
      projects: [],
      staff: [],
      staffResting: {},
      notices: [],
    } as unknown as Parameters<typeof migrateRunState>[0];
    const r = migrateRunState(legacy);
    expect(r.genresUnlocked).toContain("slice");
    expect(r.genresUnlocked).toContain("fantasy");
    expect(r.genresUnlocked).not.toContain("samurai");
    expect(r.genresUnlocked).not.toContain("vampire" as GenreId);
    for (const id of ALL_EXPANSION_IDS) expect(r.market.genres[id]).toBeDefined();
  });
});
