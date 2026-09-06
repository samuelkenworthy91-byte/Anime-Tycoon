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

/** per-scope review-quality ceilings (out of ~21 for the largest scope).
 *  The spread is deliberately narrow: choosing Prestige must pay for its
 *  higher ceiling with genuinely more output, never hand it out for free. */
export const SCOPE_POINT_CEILING: Record<ScopeId, number> = {
  short: 16,
  standard: 18,
  extended: 20,
  prestige: 20,
};

/** Ambition gate: the part of a scope's ceiling ABOVE standard only
 *  materialises when production output genuinely clears the scope's larger
 *  expected workload. At effort 1.0 (just meeting expectation) a Prestige
 *  show earns NO ceiling bonus at all; at ~1.5× expected effort the full
 *  ceiling unlocks. Merely *choosing* a bigger scope never buys HoF. */
export const SCOPE_AMBITION_START = 1.0;
export const SCOPE_AMBITION_SPAN = 0.5;

/** effective ceiling for the amount of work actually delivered */
export function effectivePointCeiling(d: Pick<Draft, "scope" | "medium">, effort: number): number {
  const base = SCOPE_POINT_CEILING[d.scope ?? "standard"] ?? 18;
  const extra = Math.max(0, base - SCOPE_POINT_CEILING.standard);
  if (extra <= 0) return base;
  const ambition = Math.max(0, Math.min(1, (effort - SCOPE_AMBITION_START) / SCOPE_AMBITION_SPAN));
  return SCOPE_POINT_CEILING.standard + extra * ambition;
}

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
 *   pts ≈ 3×        → ~95% (further effort is nearly wasted)
 *  The ceiling above Standard is gated by ambition (effectivePointCeiling),
 *  so a big scope only pays off once its larger workload is really met. */
export function productionPointScore(pts: number, d: Pick<Draft, "scope" | "medium">): number {
  const expected = expectedProductionPoints(d);
  const effort = expected > 0 ? pts / expected : 0;
  const ceiling = effectivePointCeiling(d, effort);
  return ceiling * (1 - Math.exp(-effort));
}

/* ------------------------------------------------ review expectation
 * A slow EMA of shipped quality, not a hard "beat your best" bar: an
 * early 9 lowers nobody's future — it only slightly raises the baseline
 * the next show has to clear (bounded ±0.75).
 *
 * The EMA is ASYMMETRIC on purpose: shipping excellence raises the bar
 * normally, but bad releases can barely lower it. Deliberately producing
 * rubbish must never be a useful review strategy — reviewers don't forget
 * what quality looks like just because the studio parked one stinker. */

export const REVIEW_EXPECTATION_ALPHA = 0.2;
/** downward drift: ~0.02 per flop — five deliberate flops shift the
 *  expectation by well under 2 points, and the bounded ±0.75 review nudge
 *  absorbs the rest. Genuinely long stretches of weak output still soften
 *  the bar, just very slowly. */
export const REVIEW_EXPECTATION_DOWN_ALPHA = 0.02;
export const REVIEW_EXPECTATION_SEED = 32;
export const REVIEW_EXPECTATION_RANGE = 0.75;

export function nextReviewExpectation(prev: number, quality: number): number {
  const alpha = quality >= prev ? REVIEW_EXPECTATION_ALPHA : REVIEW_EXPECTATION_DOWN_ALPHA;
  return prev + (quality - prev) * alpha;
}

/** mild ±0.75 nudge; the studio's all-time best is a RECORD and never a
 *  denominator — reviewers compare against absolute quality */
export function reviewExpectationAdjustment(expectation?: number): number {
  if (expectation == null) return 0;
  return Math.max(-REVIEW_EXPECTATION_RANGE, Math.min(REVIEW_EXPECTATION_RANGE, (REVIEW_EXPECTATION_SEED - expectation) * 0.055));
}
