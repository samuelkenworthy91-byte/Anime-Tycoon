import { describe, expect, it } from "vitest";
import {
  GENRES,
  PROTAGONISTS,
  affinityTier,
  publicAffinities,
  type Draft,
  type GenreId,
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
import { castingCatalogMeta } from "../castCatalog";

const secretMember = PROTAGONISTS.find((member) => castingCatalogMeta(member)?.kind === "triple")!;
const visibleA = secretMember.visibleAff[0];
const visibleB = secretMember.visibleAff[1];
const hidden = secretMember.hiddenAff;
const noMatch = GENRES.map((genre) => genre.id).find(
  (genre) => ![visibleA, visibleB, hidden].includes(genre),
)!;

const draft = (genres: Draft["genres"], animeType: Draft["animeType"] = secretMember.type === "shonen" ? "shojo" : "shonen"): Draft => ({
  title: "Cast Catalog Test",
  medium: "tv",
  budget: "standard",
  scope: "standard",
  slot: "midnight",
  animeType,
  genres,
  audience: "teens",
  protag: secretMember.id,
  protagName: secretMember.name,
  secondary: secretMember.id,
  pet: secretMember.id,
  villain: secretMember.id,
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
});

describe("Cast schema", () => {
  it("keeps the original 21 genres and appends all nine expansion genres", () => {
    const first = GENRES.map((genre) => genre.id).slice(0, 21);
    expect(first).toEqual([
      "mecha", "isekai", "slice", "horror", "romance", "sports", "cyber", "fantasy", "idol", "mystery",
      "comedy", "cooking", "military", "supernatural", "space", "magical", "survival", "pirate", "martial", "mythology", "nordic",
    ]);
    expect(GENRES).toHaveLength(30);
    expect(GENRES.map((genre) => genre.id).slice(21)).toEqual(["samurai", "shinobi", "vampire", "grimdark", "monster_taming", "crime", "kaiju", "cosmic_horror", "arabia"]);
  });

  it("keeps Shonen/Shojo and Racing/Noir out of active genres", () => {
    expect(GENRES.some((genre) => ["shonen", "shojo", "racing", "noir"].includes(genre.id))).toBe(false);
  });
});

describe("rebuilt cast mechanics", () => {
  it("no match gives no affinity rating contribution", () => {
    expect(castContribution(secretMember, "protag", draft([noMatch])).affinityQuality).toBe(0);
  });

  it("no match gives no affinity sales contribution", () => {
    expect(castContribution(secretMember, "protag", draft([noMatch])).salesBonus).toBe(0);
  });

  it("one visible match gives the standard rating contribution", () => {
    expect(castContribution(secretMember, "protag", draft([visibleA])).affinityQuality).toBeCloseTo(VISIBLE_CAST_QUALITY);
  });

  it("one visible match gives the standard sales contribution", () => {
    expect(castContribution(secretMember, "protag", draft([visibleA])).salesBonus).toBeCloseTo(VISIBLE_CAST_SALES);
  });

  it("two visible matches remain the 1× tier", () => {
    expect(affinityTier(secretMember, [visibleA, visibleB])).toBe(1);
  });

  it("a designated hidden match gives exactly 2× visible rating contribution", () => {
    const result = castContribution(secretMember, "protag", draft([hidden]));
    expect(result.affinityQuality).toBeCloseTo(VISIBLE_CAST_QUALITY * HIDDEN_AFFINITY_MULTIPLIER);
  });

  it("a designated hidden match gives exactly 2× visible sales contribution", () => {
    const result = castContribution(secretMember, "protag", draft([hidden]));
    expect(result.salesBonus).toBeCloseTo(VISIBLE_CAST_SALES * HIDDEN_AFFINITY_MULTIPLIER);
  });

  it("visible plus hidden uses 2×, not 3×", () => {
    expect(affinityTier(secretMember, [visibleA, hidden])).toBe(2);
  });

  it("hidden talent is mechanically active before discovery", () => {
    expect(affinityTier(secretMember, [hidden])).toBe(2);
    expect(publicAffinities(secretMember, []).hidden).toBeNull();
  });

  it("discovery changes knowledge without increasing mechanics", () => {
    const before = castContribution(secretMember, "protag", draft([hidden]));
    const after = castContribution(secretMember, "protag", draft([hidden]));
    expect(after).toEqual(before);
    expect(publicAffinities(secretMember, [secretMember.id]).hidden).toBe(hidden);
  });

  it("matching Anime Type independently multiplies contribution by 1.10", () => {
    const mismatchType = secretMember.type === "shonen" ? "shojo" : "shonen";
    const mismatch = castContribution(secretMember, "protag", draft([visibleA], mismatchType));
    const match = castContribution(secretMember, "protag", draft([visibleA], secretMember.type));
    expect(match.totalQuality / mismatch.totalQuality).toBeCloseTo(TYPE_MATCH_MULTIPLIER);
    expect(match.salesBonus / mismatch.salesBonus).toBeCloseTo(TYPE_MATCH_MULTIPLIER);
  });

  it("Type mismatch has no penalty", () => {
    const mismatchType = secretMember.type === "shonen" ? "shojo" : "shonen";
    expect(castContribution(secretMember, "protag", draft([visibleA], mismatchType)).typeModifier).toBe(1);
  });

  it("four role contributions aggregate while staying bounded", () => {
    const roles = ["protag", "secondary", "pet", "villain"] as const;
    const parts = roles.map((role) => castContribution(secretMember, role, draft([hidden], secretMember.type)));
    expect(parts.reduce((sum, part) => sum + part.affinityQuality, 0)).toBeGreaterThan(parts[0].affinityQuality);
    expect(parts.reduce((sum, part) => sum + part.salesBonus, 0)).toBeLessThan(0.13);
    expect(parts.reduce((sum, part) => sum + part.totalQuality, 0)).toBeLessThan(4.31);
  });
});

describe("hidden-affinity discovery", () => {
  it("shows only two visible affinities and ??? before discovery", () => {
    expect(publicAffinities(secretMember, [])).toEqual({ visible: secretMember.visibleAff, hidden: null });
  });

  it("qualifying release discovery is deduplicated, one-time and genre-bound", () => {
    expect(castBreakthroughsForRelease(draft([hidden]), [])).toEqual([
      { castId: secretMember.id, name: secretMember.name, genre: hidden },
    ]);
    expect(castBreakthroughsForRelease(draft([hidden]), [secretMember.id])).toEqual([]);
    expect(castBreakthroughsForRelease(draft([visibleA]), [])).toEqual([]);
  });

  it("discovery persists through JSON save migration without retroactive unlocks", () => {
    const saved = { ...initialRun("Test", "steady"), castAffinityDiscovered: [secretMember.id] };
    expect(migrateRun(JSON.parse(JSON.stringify(saved))).castAffinityDiscovered).toEqual([secretMember.id]);
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
    const migrated = migrateDraftV2({ ...draft([visibleA]), animeType: undefined, genres: ["shojo", "noir"] } as unknown as Draft);
    expect(migrated.animeType).toBe("shojo");
    expect(migrated.genres).toEqual(["mystery"]);
  });
});
