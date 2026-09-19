import { describe, expect, it } from "vitest";
import { CAST_V2, type AnimeType, type CastRole, type Draft, type GenreId } from "../data";
import { castContribution, computeResult, seededRng } from "../scoring";

const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];
const genres: GenreId[] = ["romance", "mystery"];

function castIds(type: AnimeType) {
  return Object.fromEntries(
    roles.map((role) => [role, CAST_V2.find((member) => member.role === role && member.type === type)!.id])
  ) as Record<CastRole, string>;
}

function licensedDraft(placeholderType: AnimeType): Draft {
  const ids = castIds(placeholderType);
  return {
    title: "Shojo Canon Regression",
    medium: "tv",
    budget: "standard",
    scope: "standard",
    slot: "prime",
    animeType: "shojo",
    genres,
    audience: "teens",
    protag: ids.protag,
    protagName: "Canonical Lead",
    secondary: ids.secondary,
    secondaryName: "Canonical Companion",
    pet: ids.pet,
    petName: "Canonical Mascot",
    villain: ids.villain,
    villainName: "Canonical Antagonist",
    arcs: ["hook", "origin", "finale"],
    sliders: [50, 50, 50],
    season: 1,
    licensedIpId: "ip_test_shojo",
    licensedArcId: "ip_test_shojo_opening",
    licensedCharacters: ["Canonical Lead", "Canonical Companion", "Canonical Antagonist", "Canonical Mascot"],
  };
}

function result(draft: Draft) {
  return computeResult({
    draft,
    points: { story: 120, art: 120, sound: 120 },
    issues: 0,
    hype: 60,
    research: [],
    showrunner: "steady",
    genreIdeal: [50, 50, 50],
    genreRatio: [0.34, 0.33, 0.33],
    comboLevel: 0,
    newCombo: false,
    comboDiscovered: true,
    castCombos: [],
    arcCombos: [],
    studioTop: 0,
    reviewExpectation: 25,
    franchiseMult: 1,
    costs: 200_000,
    fanBase: 25_000,
    rng: seededRng(91),
  });
}

describe("shojo licensed IP canonical casting", () => {
  it("never penalises a shojo licensed adaptation for internal placeholder cast ids", () => {
    const shonenPlaceholders = result(licensedDraft("shonen"));
    const shojoPlaceholders = result(licensedDraft("shojo"));

    expect(shonenPlaceholders.quality).toBe(shojoPlaceholders.quality);
    expect(shonenPlaceholders.total).toBe(shojoPlaceholders.total);
    expect(shonenPlaceholders.revenue).toBe(shojoPlaceholders.revenue);
    expect(shonenPlaceholders.fans).toBe(shojoPlaceholders.fans);

    const labels = shonenPlaceholders.breakdown.map((row) => row.label);
    expect(labels.some((label) => label.startsWith("Canonical IP cast"))).toBe(true);
    expect(labels).not.toContain("Anime Type casting");
    expect(labels).not.toContain("Known cast fit");
    expect(labels).not.toContain("Known Correct Cast commercial lift");
  });

  it("keeps anime-type casting meaningful for ordinary studio-cast productions", () => {
    const member = CAST_V2.find((candidate) => candidate.role === "protag" && candidate.type === "shojo")!;
    const probeGenres = member.visibleAff.length ? member.visibleAff : genres;
    const matched = castContribution(member, "protag", { genres: probeGenres, animeType: "shojo" });
    const mismatched = castContribution(member, "protag", { genres: probeGenres, animeType: "shonen" });

    expect(matched.typeModifier).toBeGreaterThan(mismatched.typeModifier);
    expect(matched.totalQuality).toBeGreaterThan(mismatched.totalQuality);
  });
});
