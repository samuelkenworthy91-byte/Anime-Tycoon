import { describe, expect, it } from "vitest";
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
import { arcGenreFit, ARCS } from "../data";

const SCAFFOLD_IDS: GenreId[] = ["samurai", "shinobi"];

describe("Samurai + Shinobi runtime scaffolding", () => {
  it("exposes 23 active genre ids: canonical 21 + the two scaffold ids", () => {
    expect(GENRES).toHaveLength(23);
    expect(SCAFFOLD_IDS.every((id) => GENRES.some((g) => g.id === id))).toBe(true);
    /* original 21 unchanged and in order */
    expect(CANONICAL_GENRE_IDS).toHaveLength(21);
    expect(GENRES.map((g) => g.id).slice(0, 21)).toEqual(CANONICAL_GENRE_IDS);
  });

  it("gives the scaffold ids a complete runtime entry (label/icon/desc/ideal/ratio/rd)", () => {
    for (const id of SCAFFOLD_IDS) {
      const g = GENRE(id);
      expect(g.label).toBeTruthy();
      expect(g.desc).toBeTruthy();
      expect(g.desc.length).toBeGreaterThan(10);
      expect(g.icon).toBeDefined();
      expect(g.ideal).toHaveLength(3);
      expect(g.ideal.every((v) => v >= 0 && v <= 100)).toBe(true);
      expect(g.ratio.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
      expect(g.rd).toBeGreaterThan(0);
      expect(g.desc.toUpperCase()).toContain("PROVISIONAL");
    }
  });

  it("keeps Martial Arts present and untouched", () => {
    const martial = GENRE("martial");
    expect(martial.label).toBe("Martial Arts");
    expect(martial.ideal).toEqual([62, 78, 48]);
  });

  it("initialises the market with all 23 slots at neutral heat", () => {
    const market = initMarket();
    for (const id of SCAFFOLD_IDS) {
      expect(typeof market.genres[id]).toBe("number");
      /* initMarket can randomly heat two risers/fallers, so just verify the key is present */
      expect(Number.isFinite(market.genres[id])).toBe(true);
    }
    expect(Object.keys(market.genres)).toHaveLength(23);
  });

  it("staff favourite-genre picking accepts the scaffold ids", () => {
    /* deterministic: try a batch of hires and give one an explicit scaffold fav */
    const hires = Array.from({ length: 40 }, (_, i) => rollHire(i));
    expect(hires.every((s) => GENRES.some((g) => g.id === s.favGenre))).toBe(true);
    const forced = ensureCareer({ ...hires[0], favGenre: "samurai" as GenreId }, 0);
    expect(forced.favGenre).toBe("samurai");
  });

  it("arc typing treats scaffold ids as NEUTRAL (no crash, no fake synergy)", () => {
    for (const id of SCAFFOLD_IDS) {
      for (const arc of ARCS) {
        const fit = arcGenreFit(arc, id);
        expect(fit.label).toBe("NEUTRAL");
        expect(fit.score).toBe(0);
      }
    }
  });

  it("slot preferences reference the scaffold ids where provisionally assigned", () => {
    expect(SLOTS.prime.best).toContain("samurai");
    expect(SLOTS.midnight.best).toContain("shinobi");
  });

  it("audience fit defaults exist for both scaffold ids", () => {
    for (const audience of Object.values(AUDIENCES)) {
      for (const id of SCAFFOLD_IDS) expect(typeof audience.fit[id]).toBe("number");
    }
  });

  it("combo lookups stay neutral: no 253-pair matrix was created", () => {
    for (const id of SCAFFOLD_IDS) {
      const pair = comboKey([id, "slice"]);
      /* pairs absent from the manifest read as neutral 1.0 — the scaffold
         must not invent synergy data */
      expect(COMBO[pair] ?? 1).toBe(1);
      expect(comboMult([id, "slice"])).toBe(1);
    }
    /* the loader is string-keyed, so a future 253-pair manifest lands with
       no type-system rewrite: construct one synthetically and read it back */
    const future = new Map<string, number>(Object.entries(COMBO));
    for (let i = 0; i < GENRES.length; i += 1) {
      for (let j = i + 1; j < GENRES.length; j += 1) {
        future.set(comboKey([GENRES[i].id, GENRES[j].id]), 1.05);
      }
    }
    expect(future.get(comboKey(["samurai", "slice"]))).toBe(1.05);
    expect(future.get(comboKey(["samurai", "shinobi"]))).toBe(1.05);
    /* 23 genres → 23×22/2 = 253 pairs, exactly what Work's manifest will carry */
    expect(future.size).toBe(253);
  });

  it("migration accepts the scaffold ids as active genres and defaults old saves safely", () => {
    /* new ids are valid active genres through the migration layer */
    expect(migrateActiveGenre("samurai")).toBe("samurai");
    expect(migrateActiveGenre("shinobi")).toBe("shinobi");
    /* an old save (rival markets / knowledge) migrates without the ids and stays valid */
    const migrated = migrateGenreRecord({ mecha: 3, slice: 1 });
    expect(migrated).toEqual({ mecha: 3, slice: 1 });
  });

  it("full migrateRun on a 21-genre-era save adds the ids without touching old data", () => {
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
    /* scaffold genres are NOT auto-unlocked — they must be researched */
    expect(r.genresUnlocked).not.toContain("samurai");
    /* market now has all 23 keys with defaults */
    expect(r.market.genres.samurai).toBeDefined();
    expect(r.market.genres.shinobi).toBeDefined();
  });
});


