import { describe, expect, it } from "vitest";
import type { CastMember, CastRole, Draft, GenreId } from "../data";
import { ARCS, PETS, PROTAGONISTS, SECONDARY, VILLAINS, affinityTier } from "../data";
import { eliteCriticalWeight, industryCriticalStandard } from "../difficulty";
import { computeProjectResult, makeProject, recordProjectImpact, type ScoringContext } from "../projects";
import {
  CRITICAL_DARLING_PERFECT_REVIEW_THRESHOLD,
  NORMAL_PERFECT_REVIEW_THRESHOLD,
  perfectReviewEligible,
  perfectReviewThreshold,
  computeResult,
  seededRng,
} from "../scoring";
import { genreTargetFor } from "../genreTargets";

const mascotId = PETS[0].id;
const draft = (): Draft => ({
  title: "Impact Accounting",
  medium: "tv",
  budget: "standard",
  scope: "standard",
  slot: "midnight",
  animeType: "shonen",
  genres: ["sports"],
  audience: "teens",
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  secondaryName: "Riko",
  pet: mascotId,
  petName: "Mochi",
  villain: "warlord",
  villainName: "Gharn",
  arcs: ["hook", "montage", "finale"],
  sliders: [50, 50, 50],
  season: 1,
});

const context = (over: Partial<ScoringContext> = {}): ScoringContext => ({
  research: [],
  showrunner: "steady",
  comboLevels: {},
  castCombos: [],
  arcCombos: [],
  studioTop: 20,
  reviewExpectation: 32,
  franchises: {},
  fans: 20_000,
  ...over,
});

describe("Critical Darling perfect-review identity", () => {
  it("locks the requested 9.40 gate while normal directors still need 9.92", () => {
    expect(CRITICAL_DARLING_PERFECT_REVIEW_THRESHOLD).toBe(9.4);
    expect(NORMAL_PERFECT_REVIEW_THRESHOLD).toBe(9.92);
    expect(perfectReviewThreshold("critical")).toBe(9.4);
    expect(perfectReviewThreshold("steady")).toBe(9.92);

    expect(perfectReviewEligible("critical", 9.399, 9.799)).toBe(false);
    expect(perfectReviewEligible("critical", 9.4, 9.8)).toBe(true);
    expect(perfectReviewEligible("steady", 9.4, 9.919)).toBe(false);
    expect(perfectReviewEligible("steady", 9.4, 9.92)).toBe(true);
  });
  it("turns the 9.40 identity into materially more real 10s on identical elite work", () => {
    const genres: GenreId[] = ["romance", "military"];
    const pools: Record<CastRole, CastMember[]> = {
      protag: PROTAGONISTS,
      secondary: SECONDARY,
      pet: PETS,
      villain: VILLAINS,
    };
    const cast = Object.fromEntries(
      (["protag", "secondary", "pet", "villain"] as CastRole[]).map((role) => [
        role,
        pools[role].find((member) => affinityTier(member, genres) === 2) ?? pools[role][0],
      ]),
    ) as Record<CastRole, CastMember>;
    const target = genreTargetFor(genres);
    const eliteDraft: Draft = {
      title: "Perfect Gate Trial",
      medium: "tv",
      budget: "blockbuster",
      scope: "prestige",
      slot: "midnight",
      animeType: "shonen",
      genres,
      audience: "teens",
      protag: cast.protag.id,
      protagName: cast.protag.name,
      secondary: cast.secondary.id,
      pet: cast.pet.id,
      villain: cast.villain.id,
      arcs: ["narr_politics", "lore", "confession", "finale"].filter((id) => ARCS.some((arc) => arc.id === id)),
      sliders: target.ideal,
      season: 1,
    };
    const baseOpts = {
      draft: eliteDraft,
      points: { story: 900, art: 1500, sound: 750 },
      issues: 0,
      hype: 95,
      research: [] as string[],
      genreIdeal: target.ideal,
      genreRatio: target.ratio,
      comboLevel: 5,
      newCombo: false,
      comboDiscovered: true,
      castCombos: [] as string[],
      arcCombos: [] as string[],
      studioTop: 40,
      reviewExpectation: 38,
      franchiseMult: 1,
      costs: 1_000_000,
      fanBase: 250_000,
      qualityFloor: 40,
      careerWeek: 12 * 48,
      industryPressureLevel: 3,
    };
    let steadyTens = 0;
    let criticalTens = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const steady = computeResult({ ...baseOpts, showrunner: "steady", rng: seededRng(seed) });
      const critical = computeResult({ ...baseOpts, showrunner: "critical", rng: seededRng(seed) });
      steadyTens += steady.reviews.filter((review) => review.score === 10).length;
      criticalTens += critical.reviews.filter((review) => review.score === 10).length;
    }
    expect(criticalTens).toBeGreaterThan(steadyTens);
    expect(criticalTens).toBeGreaterThan(0);
  });

});

describe("mature-industry critical standard", () => {
  it("leaves ordinary reviews alone and progressively raises only the elite bar", () => {
    expect(eliteCriticalWeight(6.5)).toBe(0);
    expect(eliteCriticalWeight(7)).toBe(0);
    expect(eliteCriticalWeight(8)).toBeCloseTo(0.5);
    expect(eliteCriticalWeight(9)).toBe(1);

    const y1 = industryCriticalStandard(0, 0);
    const y6 = industryCriticalStandard(5 * 48, 0);
    const y15 = industryCriticalStandard(14 * 48, 0);
    const y25 = industryCriticalStandard(24 * 48, 6);
    expect(y1.elitePenalty).toBe(0);
    expect(y6.elitePenalty).toBeGreaterThan(0);
    expect(y15.elitePenalty).toBeGreaterThan(y6.elitePenalty);
    expect(y25.elitePenalty).toBeGreaterThan(y15.elitePenalty);
    expect(y25.elitePenalty).toBeLessThanOrEqual(0.85);
  });
});

describe("transparent impact accounting", () => {
  it("carries realised production bonuses into the final release report", () => {
    let p = makeProject(draft(), 20);
    p.points = { story: 300, art: 400, sound: 280 };
    p = recordProjectImpact(p, "Executive Rush", "art", 40);
    p = recordProjectImpact(p, "The Sloth · crew output", "story", 18);

    const out = computeProjectResult(p, {
      ...context({ showrunner: "sloth", careerWeek: 20 * 48, industryPressureLevel: 5 }),
      rng: seededRng(42),
    });

    const rush = out.impactReport?.find((row) => row.source === "Executive Rush" && row.metric === "art");
    const sloth = out.impactReport?.find((row) => row.source === "The Sloth · crew output" && row.metric === "story");
    expect(rush?.delta).toBe(40);
    expect(sloth?.delta).toBe(18);
    expect(out.criticalStandard?.year).toBe(21);
    expect(out.impactReport?.some((row) => row.source.includes("Industry standard"))).toBe(true);
  });

  it("shows exactly how much a 10% business multiplier added in pounds", () => {
    const p = makeProject(draft(), 20);
    p.points = { story: 300, art: 300, sound: 300 };

    const base = computeProjectResult(p, {
      ...context(),
      businessMult: 1,
      rng: seededRng(1234),
    });
    const boosted = computeProjectResult(p, {
      ...context(),
      businessMult: 1.10,
      rng: seededRng(1234),
    });

    expect(boosted.revenue).toBe(Math.round(base.revenue * 1.10));
    const row = boosted.impactReport?.find((item) => item.source === "Business & Audience discipline" && item.metric === "revenue");
    expect(row?.before).toBe(base.revenue);
    expect(row?.after).toBe(boosted.revenue);
    expect(row?.delta).toBe(boosted.revenue - base.revenue);
    expect(row?.detail).toContain("£");
  });
});
