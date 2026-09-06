import { GENRE, PETS, PROTAGONISTS, SECONDARY, VILLAINS, affinityTier, type CastMember, type CastRole, type Draft, type GenreId } from "../src/engine/data";
import { computeResult } from "../src/engine/scoring";
import { describe, expect, it } from "vitest";

const pools: Record<CastRole, CastMember[]> = {
  protag: PROTAGONISTS,
  secondary: SECONDARY,
  pet: PETS,
  villain: VILLAINS,
};
const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];
const genre: GenreId = "romance";

function pick(role: CastRole, tier: 0 | 1 | 2): CastMember {
  const member = pools[role].find((candidate) => affinityTier(candidate, [genre]) === tier);
  if (!member) throw new Error(`No ${role} with tier ${tier} for ${genre}`);
  return member;
}

function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

type Quality = "poor" | "baseline" | "excellent";
const quality = {
  poor: { points: { story: 15, art: 15, sound: 15 }, issues: 8, hype: 0 },
  baseline: { points: { story: 55, art: 55, sound: 55 }, issues: 2, hype: 35 },
  excellent: { points: { story: 100, art: 100, sound: 100 }, issues: 0, hype: 75 },
} as const;

function makeDraft(tiers: (0 | 1 | 2)[]): Draft {
  const cast = Object.fromEntries(roles.map((role, index) => [role, pick(role, tiers[index])])) as Record<CastRole, CastMember>;
  return {
    title: "Balance Fixture",
    medium: "tv",
    budget: "standard",
    scope: "standard",
    slot: "midnight",
    animeType: "shonen",
    genres: [genre],
    audience: "teens",
    protag: cast.protag.id,
    protagName: cast.protag.name,
    secondary: cast.secondary.id,
    pet: cast.pet.id,
    villain: cast.villain.id,
    arcs: [],
    sliders: [50, 50, 50],
    season: 1,
  };
}

function simulate(tiers: (0 | 1 | 2)[], level: Quality, trials = 400) {
  const draft = makeDraft(tiers);
  const genreDef = GENRE(genre);
  const totals = { rating: 0, sales: 0, revenue: 0, failures: 0, hits: 0, blockbusters: 0 };
  const originalRandom = Math.random;
  try {
    for (let trial = 1; trial <= trials; trial += 1) {
      Math.random = seeded(trial);
      const result = computeResult({
        draft,
        ...quality[level],
        research: [],
        showrunner: "steady",
        genreIdeal: genreDef.ideal,
        genreRatio: genreDef.ratio,
        comboLevel: 0,
        newCombo: false,
        comboDiscovered: true,
        castCombos: [],
        arcCombos: [],
        studioTop: 30,
        franchiseMult: 1,
        costs: 100_000,
        fanBase: 1_000,
      });
      totals.rating += result.total;
      totals.sales += result.sales.reduce((sum, units) => sum + units, 0);
      totals.revenue += result.revenue;
      if (result.total < 15) totals.failures += 1;
      if (result.total >= 27) totals.hits += 1;
      if (result.total >= 32) totals.blockbusters += 1;
    }
  } finally {
    Math.random = originalRandom;
  }
  return {
    averageRating: +(totals.rating / trials).toFixed(3),
    averageSales: Math.round(totals.sales / trials),
    averageRevenue: Math.round(totals.revenue / trials),
    failureRate: +(totals.failures / trials).toFixed(3),
    hitRate: +(totals.hits / trials).toFixed(3),
    blockbusterRate: +(totals.blockbusters / trials).toFixed(3),
  };
}

const results = {
  A_no_affinity: simulate([0, 0, 0, 0], "baseline"),
  B_one_visible: simulate([1, 0, 0, 0], "baseline"),
  C_four_visible: simulate([1, 1, 1, 1], "baseline"),
  D_one_hidden: simulate([2, 0, 0, 0], "baseline"),
  E_two_hidden: simulate([2, 2, 0, 0], "baseline"),
  F_four_hidden: simulate([2, 2, 2, 2], "baseline"),
  G_perfect_cast_poor_production: simulate([2, 2, 2, 2], "poor"),
  H_poor_cast_excellent_production: simulate([0, 0, 0, 0], "excellent"),
  I_perfect_cast_excellent_production: simulate([2, 2, 2, 2], "excellent"),
};

console.log(JSON.stringify({ trialsPerScenario: 400, genre, results }, null, 2));

describe("Cast V2 deterministic balance simulation", () => {
  it("makes visible affinity noticeable in ratings and revenue", () => {
    expect(results.B_one_visible.averageRating).toBeGreaterThan(results.A_no_affinity.averageRating);
    expect(results.B_one_visible.averageRevenue).toBeGreaterThan(results.A_no_affinity.averageRevenue);
  });

  it("makes hidden-perfect casting outperform equivalent visible casting", () => {
    expect(results.D_one_hidden.averageRating).toBeGreaterThan(results.B_one_visible.averageRating);
    expect(results.D_one_hidden.averageRevenue).toBeGreaterThan(results.B_one_visible.averageRevenue);
  });

  it("does not let four hidden matches rescue a disastrous production", () => {
    expect(results.G_perfect_cast_poor_production.hitRate).toBe(0);
    expect(results.H_poor_cast_excellent_production.averageRating)
      .toBeGreaterThan(results.G_perfect_cast_poor_production.averageRating);
  });
});
