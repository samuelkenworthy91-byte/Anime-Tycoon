import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARCS,
  GENRE,
  MEDIUMS,
  FORMAT_ORDER,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  SLOTS,
  VILLAINS,
  affinityTier,
  type CastMember,
  type CastRole,
  type Draft,
  type GenreId,
  type MediumId,
  type ScopeId,
} from "../src/engine/data";
import { computeResult, seededRng } from "../src/engine/scoring";
import { genreTargetFor } from "../src/engine/genreTargets";
import { expectedProductionPoints, nextReviewExpectation, productionPointScore } from "../src/engine/production";

/* ======================================================================
 * DETERMINISTIC SCORING BALANCE MATRIX
 *
 * Every representative case is rolled REVIEW_ROLLS times with a seeded
 * LCG, so the numbers are reproducible and the output is machine-readable
 * (docs/SCORING_BALANCE_MATRIX.json + a compact console table).
 *
 * Coverage:
 *  - production points (150/250/350/450/600/800/1000/1200 → expressed as
 *    relative effort against each format's expected points)
 *  - decision quality (poor → exceptional)
 *  - career stages (first production → elite endgame, via the EMA
 *    review expectation only — commercial state never touches criticism)
 *  - scopes (Short / Standard / Extended / Prestige)
 *  - formats (Fan Web / Streaming ONA / TV / OVA / TV Special / Film)
 * ==================================================================== */

const REVIEW_ROLLS = 1000;
/** deliberately NEUTRAL genre pair so the matrix measures production and
 *  decision quality, not the (intentionally strong) sports×martial combo.
 *  Genre-pair effect is asserted separately via pointCheck/order tests. */
const GENRES: GenreId[] = ["romance", "military"];

const genreDef = () => {
  const defs = GENRES.map((g) => GENRE(g));
  const target = genreTargetFor(GENRES);
  return { defs, ideal: target.ideal, ratio: target.ratio };
};

const pools: Record<CastRole, CastMember[]> = {
  protag: PROTAGONISTS,
  secondary: SECONDARY,
  pet: PETS,
  villain: VILLAINS,
};
const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];
function pick(role: CastRole, tier: 0 | 1 | 2): CastMember {
  const member = pools[role].find((c) => affinityTier(c, GENRES) === tier);
  if (!member) throw new Error(`No ${role} with tier ${tier} for ${GENRES.join(",")}`);
  return member;
}

type DecisionTier = "poor" | "mediocre" | "competent" | "strong" | "exceptional";
const TIERS: DecisionTier[] = ["poor", "mediocre", "competent", "strong", "exceptional"];
/** relative work vs. the format's expected production points per tier */
const EFFORT: Record<DecisionTier, number> = {
  poor: 0.33,   // ≈ base 450×0.33 ≈ 150 pts on Standard TV
  mediocre: 0.56,
  competent: 0.78,
  strong: 1.0,
  exceptional: 1.55,
};
/** point mix drift from the genre's Story/Art/Sound target */
const MIX_DRIFT: Record<DecisionTier, [number, number, number]> = {
  poor: [0.5, 0.2, 0.3],
  mediocre: [0.35, 0.35, 0.3],
  competent: [0.3, 0.46, 0.24],
  strong: [0.28, 0.48, 0.24],
  exceptional: [0.28, 0.48, 0.24],
};
const ARC_SETS: Record<DecisionTier, string[]> = {
  poor: ["filler", "beach", "narr_slowburn"],
  mediocre: ["filler", "beach"],
  competent: ["hook", "festival", "confession"],
  strong: ["hook", "festival", "confession", "finale"],
  exceptional: ["narr_politics", "lore", "confession", "finale"],
};
const ISSUES: Record<DecisionTier, number> = { poor: 5, mediocre: 2, competent: 1, strong: 0, exceptional: 0 };
const HYPE: Record<DecisionTier, number> = { poor: 8, mediocre: 25, competent: 45, strong: 65, exceptional: 85 };

function makeDraft(
  tier: DecisionTier,
  medium: MediumId,
  scope: ScopeId,
  totalPts: number,
): { draft: Draft; points: { story: number; art: number; sound: number }; genreIdeal: [number, number, number]; genreRatio: [number, number, number] } {
  const { ideal, ratio } = genreDef();
  const castTier: 0 | 1 | 2 = tier === "poor" ? 0 : tier === "mediocre" ? 1 : tier === "competent" ? 1 : tier === "strong" ? 1 : 2;
  const cast = Object.fromEntries(roles.map((role) => [role, pick(role, castTier)])) as Record<CastRole, CastMember>;
  /* sliders: terrible → near-perfect, relative to the blended ideal */
  const sliderErr = tier === "poor" ? 1 : tier === "mediocre" ? 0.5 : tier === "competent" ? 0.35 : tier === "strong" ? 0.15 : 0.03;
  const sliders = ideal.map((v) => Math.round(Math.max(0, Math.min(100, v + (v - 50) * sliderErr * (tier === "poor" ? -1 : 1))))) as [number, number, number];
  const total = totalPts;
  const mix = MIX_DRIFT[tier];
  const points = {
    story: Math.round(total * mix[0]),
    art: Math.round(total * mix[1]),
    sound: Math.round(total * mix[2]),
  };
  return {
    draft: {
      title: `Matrix ${tier} ${medium} ${scope}`,
      medium,
      budget: "standard",
      scope,
      slot: medium === "tv" || medium === "special" ? "midnight" : (MEDIUMS[medium].slot ?? "stream"),
      animeType: "shonen",
      genres: GENRES,
      audience: "teens",
      protag: cast.protag.id,
      protagName: cast.protag.name,
      secondary: cast.secondary.id,
      pet: cast.pet.id,
      villain: cast.villain.id,
      arcs: ARC_SETS[tier].filter((id) => ARCS.some((a) => a.id === id)),
      sliders,
      season: 1,
    },
    points,
    genreIdeal: ideal,
    genreRatio: ratio,
  };
}

/* ------------------------------- deterministic roll & stats --------- */
function rollCase(caseDef: {
  tier: DecisionTier;
  medium: MediumId;
  scope: ScopeId;
  reviewExpectation: number;
  audienceBar?: number;
}): { mean: number; p10: number; p50: number; p90: number; hof: number; ninePlus: number; tenRate: number; perfect40: number; hofAvg: number } {
  const expectedPts = expectedProductionPoints({ scope: caseDef.scope, medium: caseDef.medium });
  const { draft, points, genreIdeal, genreRatio } = makeDraft(
    caseDef.tier,
    caseDef.medium,
    caseDef.scope,
    Math.round(expectedPts * EFFORT[caseDef.tier]),
  );
  const scores: number[] = [];
  let tenRate = 0;
  let perfect40 = 0;
  let ninePlus = 0;
  for (let seed = 1; seed <= REVIEW_ROLLS; seed += 1) {
    const res = computeResult({
      draft,
      points,
      issues: ISSUES[caseDef.tier],
      hype: HYPE[caseDef.tier],
      research: [],
      showrunner: "steady",
      genreIdeal,
      genreRatio,
      comboLevel: 0,
      newCombo: false,
      comboDiscovered: true,
      castCombos: [],
      arcCombos: [],
      studioTop: 0,
      reviewExpectation: caseDef.reviewExpectation,
      franchiseMult: 1,
      costs: 100_000,
      fanBase: 1_000,
      audienceBar: caseDef.audienceBar,
      rng: seededRng(seed),
    });
    const avg = res.total / 4;
    scores.push(avg);
    if (res.reviews.some((r) => r.score >= 10)) tenRate += 1;
    if (res.total === 40) perfect40 += 1;
    if (avg >= 9) ninePlus += 1;
  }
  scores.sort((a, b) => a - b);
  const at = (q: number) => {
    const v = scores[Math.min(scores.length - 1, Math.floor(q * scores.length))];
    return Math.round(v * 1000) / 1000;
  };
  const mean = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000;
  return {
    mean,
    p10: at(0.1),
    p50: at(0.5),
    p90: at(0.9),
    hof: scores.filter((s) => s * 4 >= 32).length / scores.length,
    ninePlus: ninePlus / scores.length,
    tenRate: tenRate / scores.length,
    perfect40: perfect40 / scores.length,
    hofAvg: scores.filter((s) => s * 4 >= 32).length ? scores.filter((s) => s * 4 >= 32).reduce((a, b) => a + b, 0) / scores.filter((s) => s * 4 >= 32).length : 0,
  };
}

/* ------------------------------- representative matrix -------------- */
const CAREER_EXPECTATION: Record<string, number> = {
  "first production": 32,
  "early studio": 33.5,
  midgame: 35,
  "late game": 36.5,
  "elite endgame": 38,
};

const matrix: Record<string, unknown> = {
  meta: {
    rolls: REVIEW_ROLLS,
    genrePair: GENRES.join(" × "),
    notes: "Seeded LCG per roll. Directional calibration — judgement comes after ChatGPT audit + APK playtesting.",
  },
  scopes: {} as Record<string, unknown>,
  formats: {} as Record<string, unknown>,
  careers: {},
  pointCheck: {},
};

for (const scope of ["short", "standard", "extended", "prestige"] as ScopeId[]) {
  const rows: Record<string, unknown> = {};
  for (const tier of TIERS) {
    rows[tier] = rollCase({ tier, medium: "tv", scope, reviewExpectation: 35 });
  }
  (matrix.scopes as Record<string, unknown>)[scope] = rows;
}

for (const medium of FORMAT_ORDER) {
  const rows: Record<string, unknown> = {};
  for (const tier of TIERS) {
    rows[tier] = rollCase({ tier, medium, scope: "standard", reviewExpectation: 35 });
  }
  (matrix.formats as Record<string, unknown>)[medium] = rows;
}

for (const [stage, expectation] of Object.entries(CAREER_EXPECTATION)) {
  const rows: Record<string, unknown> = {};
  for (const tier of ["competent", "strong", "exceptional"] as DecisionTier[]) {
    rows[tier] = rollCase({ tier, medium: "tv", scope: "standard", reviewExpectation: expectation });
  }
  (matrix.careers as Record<string, unknown>)[stage] = rows;
}

/* ---- elite endgame: everything maxed. 10s should genuinely exist here,
     but even this must not produce 40/40 on every roll. ---- */
{
  const expectedPts = expectedProductionPoints({ scope: "standard", medium: "tv" });
  const { draft, points, genreIdeal, genreRatio } = makeDraft("exceptional", "tv", "standard", Math.round(expectedPts * 1.78));
  const eliteDraft = { ...draft, arcs: ["narr_politics", "lore", "confession", "finale"].filter((id) => ARCS.some((a) => a.id === id)) };
  const scores: number[] = [];
  let tenRate = 0;
  let perfect40 = 0;
  let ninePlus = 0;
  for (let seed = 1; seed <= REVIEW_ROLLS; seed += 1) {
    const res = computeResult({
      draft: eliteDraft,
      points,
      issues: 0,
      hype: 95,
      research: [],
      showrunner: "steady",
      genreIdeal,
      genreRatio,
      comboLevel: 0,
      newCombo: false,
      comboDiscovered: true,
      castCombos: [],
      arcCombos: [],
      studioTop: 0,
      reviewExpectation: 38,
      franchiseMult: 1,
      costs: 300_000,
      fanBase: 20_000,
      rng: seededRng(seed),
    });
    scores.push(res.total / 4);
    if (res.reviews.some((r) => r.score >= 10)) tenRate += 1;
    if (res.total === 40) perfect40 += 1;
    if (res.total / 4 >= 9) ninePlus += 1;
  }
  scores.sort((a, b) => a - b);
  matrix.elite = {
    mean: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3),
    p50: +scores[Math.floor(scores.length * 0.5)].toFixed(3),
    tenRate: +(tenRate / scores.length).toFixed(4),
    perfect40: +(perfect40 / scores.length).toFixed(4),
    ninePlus: +(ninePlus / scores.length).toFixed(4),
  };
}

/* ---- production point check: same production, pure point scaling ---- */
/** unrounded means so the diminishing-returns slopes aren't lost to
 *  the 3-decimal rounding used in the machine-readable JSON */
const pointMeans: Record<string, number> = {};
{
  const rows: Record<string, unknown> = {};
  for (const pts of [150, 250, 350, 450, 600, 800, 1000, 1200]) {
    const { draft, genreIdeal, genreRatio } = makeDraft("competent", "tv", "standard", pts);
    const mix = [0.3, 0.46, 0.24] as [number, number, number];
    const scores: number[] = [];
    for (let seed = 1; seed <= REVIEW_ROLLS; seed += 1) {
      const res = computeResult({
        draft,
        points: { story: Math.round(pts * mix[0]), art: Math.round(pts * mix[1]), sound: Math.round(pts * mix[2]) },
        issues: 0,
        hype: 50,
        research: [],
        showrunner: "steady",
        genreIdeal,
        genreRatio,
        comboLevel: 0,
        newCombo: false,
        comboDiscovered: true,
        castCombos: [],
        arcCombos: [],
        studioTop: 0,
        reviewExpectation: 35,
        franchiseMult: 1,
        costs: 100_000,
        fanBase: 1_000,
        rng: seededRng(seed),
      });
      scores.push(res.total / 4);
    }
    scores.sort((a, b) => a - b);
    pointMeans[pts] = scores.reduce((a, b) => a + b, 0) / scores.length;
    rows[pts] = {
      mean: +pointMeans[pts].toFixed(3),
      p10: +scores[Math.floor(scores.length * 0.1)].toFixed(3),
      p90: +scores[Math.floor(scores.length * 0.9)].toFixed(3),
      hof: +(scores.filter((s) => s * 4 >= 32).length / scores.length).toFixed(4),
    };
  }
  matrix.pointCheck = rows;
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "SCORING_BALANCE_MATRIX.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(matrix, null, 2)}\n`);

console.log(`\n== DETERMINISTIC SCORING MATRIX (${REVIEW_ROLLS} rolls/case) → ${outPath}`);
console.log(JSON.stringify(matrix.pointCheck, null, 2));

const std = (matrix.scopes as Record<string, Record<string, { mean: number; hof: number; tenRate: number }>>).standard;
console.table(Object.fromEntries(TIERS.map((t) => [t, { mean: std[t].mean, hof: `${(std[t].hof * 100).toFixed(1)}%`, ten: `${(std[t].tenRate * 100).toFixed(2)}%` }])));

/* ============================ acceptance checks =====================
 * Directional distribution checks only — these must NOT be brittle
 * exact-unit tests. Final judgement = ChatGPT audit + APK playtesting. */
describe("scoring balance acceptance", () => {
  const tv = (matrix.scopes as Record<string, Record<string, { mean: number; hof: number; tenRate: number; ninePlus: number }>>).standard;
  const pts = matrix.pointCheck as Record<string, { mean: number }>;
  const careers = matrix.careers as Record<string, Record<string, { mean: number; tenRate: number }>>;

  it("increasing production quality generally increases reviews", () => {
    for (let i = 1; i < TIERS.length; i += 1)
      expect(tv[TIERS[i]].mean).toBeGreaterThan(tv[TIERS[i - 1]].mean);
  });

  it("production points show diminishing returns", () => {
    const early = pointMeans["450"] - pointMeans["250"];
    const mid = pointMeans["800"] - pointMeans["600"];
    const late = pointMeans["1200"] - pointMeans["1000"];
    /* each successive increment adds less than the previous one —
       production points matter, but doubling your budget never doubles
       your reviews */
    expect(early).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(late);
    expect(late).toBeGreaterThan(0);
  });

  it("mediocre choices cannot hide behind point totals", () => {
    expect(tv.mediocre.mean).toBeLessThan(tv.strong.mean - 1.3);
    expect(tv.poor.mean).toBeLessThan(5.5);
  });

  it("an excellent first production can score highly", () => {
    expect(careers["first production"].exceptional.mean).toBeGreaterThan(8.2);
  });

  it("one early 9 does not doom subsequent releases — expectation effect is mild", () => {
    const first = careers["first production"].exceptional.mean;
    const elite = careers["elite endgame"].exceptional.mean;
    expect(Math.abs(first - elite)).toBeLessThanOrEqual(1.2);
  });

  it("late-game studios can still achieve 9+", () => {
    /* expectation pressure must not flatten the top: an elite endgame
       studio playing perfectly still rolls genuine 9s (not just a
       mathematically safe mean) */
    expect(careers["elite endgame"].exceptional.mean).toBeGreaterThanOrEqual(8.3);
    const elite = matrix.elite as { ninePlus: number };
    expect(elite.ninePlus).toBeGreaterThan(0);
  });

  it("Hall of Fame is not nearly automatic", () => {
    expect(tv.competent.hof).toBeLessThan(0.2);
    expect(tv.strong.hof).toBeLessThan(0.6);
  });

  it("10s exist but are rare; perfect 40 is exceptional", () => {
    /* routine exceptional work stays in the 8.5–9.5 band and never floods
       the top of the scale */
    expect(tv.exceptional.mean).toBeLessThan(9.6);
    expect(tv.exceptional.tenRate).toBeLessThan(0.12);
    expect(tv.exceptional.ninePlus).toBeGreaterThan(0);
    /* genuinely elite work (hidden-perfect cast, ideal arcs, huge effort)
       can still produce 10s — not automatic, but possible */
    const elite = matrix.elite as { tenRate: number; perfect40: number };
    expect(elite.tenRate).toBeGreaterThan(0);
    expect(elite.tenRate).toBeLessThan(0.9);
    expect(elite.perfect40).toBeLessThan(0.5);
    /* even the best-possible prestige production never guarantees a 10 —
       a top critic must agree, and four perfect scores stay exceptional */
    const scope = matrix.scopes as Record<string, Record<string, { tenRate: number }>>;
    expect(scope.prestige.exceptional.tenRate).toBeGreaterThan(0);
    expect(scope.prestige.exceptional.tenRate).toBeLessThan(0.9);
  });

  it("fan web gets no review cap — a fantastic fan series can review 9+/10", () => {
    const fan = (matrix.formats as Record<string, Record<string, { ninePlus: number; mean: number }>>).fanweb;
    expect(fan.exceptional.mean).toBeGreaterThanOrEqual(8.2);
  });

  it("scope advantage is real but never automatic — strong prestige is NOT an almost-guaranteed Hall of Fame", () => {
    const scopes = matrix.scopes as Record<string, Record<string, { mean: number; hof: number; tenRate: number }>>;
    /* the audit's hard requirement: merely *choosing* a bigger scope at the
       same relative effort must not hand out HoF */
    expect(scopes.extended.strong.hof).toBeLessThan(0.45);
    expect(scopes.prestige.strong.hof).toBeLessThan(0.5);
    /* desired directional bands: strong stays in the 7.6–8.2 range */
    expect(scopes.extended.strong.mean).toBeGreaterThanOrEqual(7.6);
    expect(scopes.extended.strong.mean).toBeLessThanOrEqual(8.1);
    expect(scopes.prestige.strong.mean).toBeGreaterThanOrEqual(7.7);
    expect(scopes.prestige.strong.mean).toBeLessThanOrEqual(8.2);
  });

  it("genuinely exceptional prestige still clears a higher bar than standard", () => {
    const scopes = matrix.scopes as Record<string, Record<string, { mean: number; hof: number; tenRate: number }>>;
    const std = scopes.standard.exceptional;
    const pres = scopes.prestige.exceptional;
    expect(pres.mean).toBeGreaterThanOrEqual(8.8);
    expect(pres.mean).toBeLessThanOrEqual(9.3);
    /* exceptional work in a big scope is notably better than the same work
       at standard — the ceiling exists, it is just earned */
    expect(pres.mean).toBeGreaterThan(std.mean + 0.15);
    /* …but 10s are still not automatic, and the top of the scale stays rare */
    expect(pres.tenRate).toBeGreaterThan(0);
    expect(pres.tenRate).toBeLessThan(0.75);
  });

  it("the ambition gate: at effort 1.0 a bigger scope earns no ceiling bonus; at 1.5× it fully unlocks", () => {
    for (const scope of ["standard", "extended", "prestige"] as ScopeId[]) {
      const expected = expectedProductionPoints({ scope, medium: "tv" });
      const atExpectation = productionPointScore(expected, { scope, medium: "tv" });
      const maxed = productionPointScore(expected * 1.5, { scope, medium: "tv" });
      /* meeting the larger expected workload exactly is worth the same as
         meeting standard's — the pay-off starts above expectation */
      if (scope !== "standard") expect(atExpectation).toBeLessThanOrEqual(productionPointScore(expectedProductionPoints({ scope: "standard", medium: "tv" }), { scope: "standard", medium: "tv" }) + 0.01);
      /* genuine over-delivery scales with the scope's ceiling */
      if (scope !== "standard") expect(maxed).toBeGreaterThan(productionPointScore(expectedProductionPoints({ scope: "standard", medium: "tv" }) * 1.5, { scope: "standard", medium: "tv" }));
    }
  });
});

/* ============================== expectation exploit ==================
 * The review expectation EMA is asymmetric: strong releases raise the bar
 * normally; bad releases can barely lower it. Deliberate flops must never
 * be a useful review strategy. */
describe("review expectation exploit", () => {
  it("one flop does not lower the expectation by several points", () => {
    /* 38 expectation + quality 14 used to slide ~4.8 points (alpha 0.2).
       With the asymmetric EMA it moves well under 1 point. */
    const next = nextReviewExpectation(38, 14);
    expect(next).toBeGreaterThan(37.5);
    expect(38 - next).toBeLessThan(1);
  });

  it("five deliberate flops do not materially boost a subsequent exceptional release", () => {
    let exp = 38;
    for (let i = 0; i < 5; i += 1) exp = nextReviewExpectation(exp, 14);
    /* a stack of deliberate garbage barely moves the bar */
    expect(38 - exp).toBeLessThan(2.5);
    /* and that shift is far below the ±0.75 reviewer-point nudge band */
    const adjAfter = (32 - exp) * 0.055;
    const adjClean = (32 - 38) * 0.055;
    expect(Math.abs(adjAfter - adjClean)).toBeLessThan(0.15);
  });

  it("good releases still raise the expectation normally", () => {
    const exp = nextReviewExpectation(32, 40);
    /* upward move keeps the normal alpha (0.2): 32 → 33.6 */
    expect(exp).toBeCloseTo(33.6, 5);
  });

  it("long stretches of genuinely weaker output soften the bar very slowly", () => {
    let exp = 38;
    for (let i = 0; i < 60; i += 1) exp = nextReviewExpectation(exp, 26);
    /* 60 mediocre releases eventually pull the studio's own bar down —
       slowly, not after one or two stinkers (still above the mediocre
       quality floor of 26 after 1.25 in-game years of weak output) */
    expect(exp).toBeLessThan(34);
    expect(exp).toBeGreaterThan(27);
  });
});
