import { describe, expect, it } from "vitest";
import {
  GENRES,
  affinityTier,
  castById,
  publicAffinities,
  type Draft,
} from "../data";
import {
  HIDDEN_AFFINITY_MULTIPLIER,
  TYPE_MATCH_MULTIPLIER,
  VISIBLE_CAST_QUALITY,
  VISIBLE_CAST_SALES,
  castContribution,
} from "../scoring";
import {
  inferAnimeType,
  migrateActiveGenre,
  migrateDraftV2,
  migrateUnlockedGenres,
} from "../castV2Migration";
import { castBreakthroughsForRelease, initialRun, migrateRun } from "../state";

const kai = castById("kai");
const draft = (genres: Draft["genres"], animeType: Draft["animeType"] = "shojo"): Draft => ({
  title: "Cast V2 Test",
  medium: "tv",
  budget: "standard",
  scope: "standard",
  slot: "midnight",
  animeType,
  genres,
  audience: "teens",
  protag: kai.id,
  protagName: kai.name,
  secondary: kai.id,
  pet: kai.id,
  villain: kai.id,
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
});

describe("Cast V2 schema", () => {
  it("has exactly the final 21 active genres", () => {
    expect(GENRES.map((genre) => genre.id)).toEqual([
      "mecha", "isekai", "slice", "horror", "romance", "sports", "cyber", "fantasy", "idol", "mystery",
      "comedy", "cooking", "military", "supernatural", "space", "magical", "survival", "pirate", "martial", "mythology", "nordic",
    ]);
  });

  it("keeps Shonen/Shojo and Racing/Noir out of active genres", () => {
    expect(GENRES.some((genre) => ["shonen", "shojo", "racing", "noir"].includes(genre.id))).toBe(false);
  });
});

describe("Correct Cast mechanics", () => {
  it("no match gives no affinity rating contribution", () => {
    expect(castContribution(kai, "protag", draft(["fantasy"])).affinityQuality).toBe(0);
  });

  it("no match gives no affinity sales contribution", () => {
    expect(castContribution(kai, "protag", draft(["fantasy"])).salesBonus).toBe(0);
  });

  it("one visible match gives the standard rating contribution", () => {
    expect(castContribution(kai, "protag", draft(["sports"])).affinityQuality).toBeCloseTo(VISIBLE_CAST_QUALITY);
  });

  it("one visible match gives the standard sales contribution", () => {
    expect(castContribution(kai, "protag", draft(["sports"])).salesBonus).toBeCloseTo(VISIBLE_CAST_SALES);
  });

  it("two visible matches remain the 1× tier", () => {
    expect(affinityTier(kai, ["sports", "martial"])).toBe(1);
  });

  it("a hidden match gives exactly 2× visible rating contribution", () => {
    const hidden = castContribution(kai, "protag", draft(["cooking"]));
    expect(hidden.affinityQuality).toBeCloseTo(VISIBLE_CAST_QUALITY * HIDDEN_AFFINITY_MULTIPLIER);
  });

  it("a hidden match gives exactly 2× visible sales contribution", () => {
    const hidden = castContribution(kai, "protag", draft(["cooking"]));
    expect(hidden.salesBonus).toBeCloseTo(VISIBLE_CAST_SALES * HIDDEN_AFFINITY_MULTIPLIER);
  });

  it("visible plus hidden uses 2×, not 3×", () => {
    expect(affinityTier(kai, ["sports", "cooking"])).toBe(2);
  });

  it("hidden talent is mechanically active before discovery", () => {
    expect(affinityTier(kai, [kai.hiddenAff])).toBe(2);
    expect(publicAffinities(kai, []).hidden).toBeNull();
  });

  it("discovery changes knowledge without increasing mechanics", () => {
    const before = castContribution(kai, "protag", draft([kai.hiddenAff]));
    const after = castContribution(kai, "protag", draft([kai.hiddenAff]));
    expect(after).toEqual(before);
    expect(publicAffinities(kai, [kai.id]).hidden).toBe(kai.hiddenAff);
  });

  it("matching Anime Type independently multiplies contribution by 1.10", () => {
    const mismatch = castContribution(kai, "protag", draft(["sports"], "shojo"));
    const match = castContribution(kai, "protag", draft(["sports"], "shonen"));
    expect(match.totalQuality / mismatch.totalQuality).toBeCloseTo(TYPE_MATCH_MULTIPLIER);
    expect(match.salesBonus / mismatch.salesBonus).toBeCloseTo(TYPE_MATCH_MULTIPLIER);
  });

  it("Type mismatch has no penalty", () => {
    const mismatch = castContribution(kai, "protag", draft(["sports"], "shojo"));
    expect(mismatch.typeModifier).toBe(1);
  });

  it("four role contributions aggregate while staying bounded", () => {
    const roles = ["protag", "secondary", "pet", "villain"] as const;
    const parts = roles.map((role) => castContribution(kai, role, draft(["cooking"], "shonen")));
    expect(parts.reduce((sum, part) => sum + part.affinityQuality, 0)).toBeGreaterThan(parts[0].affinityQuality);
    expect(parts.reduce((sum, part) => sum + part.salesBonus, 0)).toBeLessThan(0.13);
    expect(parts.reduce((sum, part) => sum + part.totalQuality, 0)).toBeLessThan(4.31);
  });
});

describe("hidden-affinity discovery", () => {
  it("shows only two visible affinities and ??? before discovery", () => {
    expect(publicAffinities(kai, [])).toEqual({ visible: kai.visibleAff, hidden: null });
  });

  it("qualifying release discovery is deduplicated, one-time and genre-bound", () => {
    expect(castBreakthroughsForRelease(draft(["cooking"]), [])).toEqual([
      { castId: kai.id, name: kai.name, genre: "cooking" },
    ]);
    expect(castBreakthroughsForRelease(draft(["cooking"]), [kai.id])).toEqual([]);
    expect(castBreakthroughsForRelease(draft(["sports"]), [])).toEqual([]);
  });

  it("discovery persists through JSON save migration without retroactive unlocks", () => {
    const saved = { ...initialRun("Test", "steady"), castAffinityDiscovered: [kai.id] };
    expect(migrateRun(JSON.parse(JSON.stringify(saved))).castAffinityDiscovered).toEqual([kai.id]);
    const legacy = initialRun("Legacy", "steady") as unknown as Record<string, unknown>;
    delete legacy.castAffinityDiscovered;
    delete legacy.castGenreV2;
    expect(migrateRun(legacy).castAffinityDiscovered).toEqual([]);
  });
});

describe("legacy genre and Type migration", () => {
  it("uses deterministic subject, unlock and Shonen/Shojo mappings", () => {
    expect(migrateActiveGenre("racing")).toBe("sports");
    expect(migrateActiveGenre("noir")).toBe("mystery");
    expect(migrateUnlockedGenres(["racing", "noir"])).toEqual(["slice", "fantasy", "pirate", "survival"]);
    expect(inferAnimeType(undefined, ["shonen", "sports"], "kai")).toBe("shonen");
    expect(inferAnimeType(undefined, ["shojo", "romance"], "kai")).toBe("shojo");
    const migrated = migrateDraftV2({ ...draft(["sports"]), animeType: undefined, genres: ["shojo", "noir"] } as unknown as Draft);
    expect(migrated.animeType).toBe("shojo");
    expect(migrated.genres).toEqual(["mystery"]);
  });
});
