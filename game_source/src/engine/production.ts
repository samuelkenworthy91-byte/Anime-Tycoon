/* ======================================================================
 * SHARED PRODUCTION-EXPECTATION MODULE
 *
 * Every scoring path (draft preview, release, balance harness) derives
 * the point expectations and review-expectation drift from the SAME
 * length/scope config that the production pipeline uses, so the review
 * curve is calibrated against what a show actually demands — not a magic
 * 170 denominator.
 *
 * The saturating curve:
 *   pointScore = ceiling × (1 − exp(−pts / expected))
 * keeps production effort the dominant determiner with real diminishing
 * returns: doubling the work never doubles the reviews.
 *
 * Values below are directional starting constants, exercised by the
 * seeded balance matrix (scripts/scoring-balance.test.ts) and tuned by
 * audit + playtesting. They are NOT magic numbers.
 * ==================================================================== */

import type { Draft, MediumId, ScopeId } from "./data";
import { MEDIUMS, PRODUCTION_SCOPES } from "./data";

/** reference point total for a Standard-scope TV series */
export const BASE_EXPECTED_POINTS = 450;

/** per-scope review-quality ceilings (out of ~22 for the largest scope) */
export const SCOPE_POINT_CEILING: Record<ScopeId, number> = {
  short: 16,
  standard: 18,
  extended: 20,
  prestige: 22,
};

/** budget affects quality only mildly (indie is not a death sentence,
 *  blockbuster is never auto-rich) */
export const BUDGET_QUALITY_FACTOR: Record<Draft["budget"], number> = {
  indie: 0.96,
  standard: 1.0,
  blockbuster: 1.06,
};

/** how much work a scope demands (from PRODUCTION_SCOPES.workMult) */
export const scopeOf = (d: Pick<Draft, "scope">) => PRODUCTION_SCOPES[d.scope ?? "standard"];

/** medium run-length adjustment: longer formats ask for more points */
export const mediumLengthAdjustment = (medium: MediumId) => 1 + (MEDIUMS[medium]?.weeks ?? 0) / 16;

/** the expected production points for a given scope × medium. This is the
 *  same config the pipeline uses (draftWeeks/length), not a fixed 170. */
export function expectedProductionPoints(d: Pick<Draft, "scope" | "medium">): number {
  return BASE_EXPECTED_POINTS * scopeOf(d).workMult * mediumLengthAdjustment(d.medium);
}

export function productionPointCeiling(d: Pick<Draft, "scope">): number {
  return SCOPE_POINT_CEILING[d.scope ?? "standard"];
}

/** saturating production→quality conversion:
 *   pts ≈ expected  → ~63% of ceiling
 *   pts ≈ 2×        → ~86%
 *   pts ≈ 3×        → ~95% (further effort is nearly wasted) */
export function productionPointScore(pts: number, d: Pick<Draft, "scope">): number {
  const ceiling = productionPointCeiling(d);
  const expected = expectedProductionPoints({ ...d, medium: (d as { medium?: MediumId }).medium ?? "tv" });
  return ceiling * (1 - Math.exp(-pts / expected));
}

/* ------------------------------------------------ review expectation
 * A slow EMA of shipped quality, not a hard "beat your best" bar: an
 * early 9 lowers nobody's future — it only slightly raises the baseline
 * the next show has to clear (bounded ±0.75). */

export const REVIEW_EXPECTATION_ALPHA = 0.2;
export const REVIEW_EXPECTATION_SEED = 32;
export const REVIEW_EXPECTATION_RANGE = 0.75;

export function nextReviewExpectation(prev: number, quality: number): number {
  return prev + (quality - prev) * REVIEW_EXPECTATION_ALPHA;
}

/** mild ±0.75 nudge; the studio's all-time best is a RECORD and never a
 *  denominator — reviewers compare against absolute quality */
export function reviewExpectationAdjustment(expectation?: number): number {
  if (expectation == null) return 0;
  return Math.max(-REVIEW_EXPECTATION_RANGE, Math.min(REVIEW_EXPECTATION_RANGE, (REVIEW_EXPECTATION_SEED - expectation) * 0.055));
}
