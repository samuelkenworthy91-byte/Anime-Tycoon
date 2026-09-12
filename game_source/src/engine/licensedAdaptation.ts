import { BUDGETS, PRODUCTION_SCOPES, type Draft, type MediumId } from "./data";
import { licensedRevenue, type AuctionIP, type IPContract } from "./ip";
import { commercialTierOf, tierOf, type Review, type ShowResult } from "./scoring";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const MEDIUM_CAPACITY: Record<MediumId, number> = {
  fanweb: -12,
  ona: -4,
  tv: 8,
  ova: 2,
  special: 0,
  movie: 12,
};
const MEDIUM_SOURCE_REACH: Record<MediumId, number> = {
  fanweb: 0.45,
  ona: 0.78,
  tv: 1,
  ova: 0.72,
  special: 0.82,
  movie: 1.28,
};
const BUDGET_CAPACITY = { indie: 40, standard: 62, blockbuster: 86 } as const;
const SCOPE_CAPACITY = { short: -12, standard: 0, extended: 12, prestige: 22 } as const;

export interface LicensedAdaptationAssessment {
  expectedScore: number;
  expectationGap: number;
  reviewDelta: number;
  adequacyGap: number;
  directionFit: number;
  sourceAudience: number;
  sourceFanDelta: number;
  routeName: string;
}

function routeAdjustment(ip: AuctionIP, contract: IPContract, routeId?: string): { delta: number; name: string } {
  const route = ip.availableArcs.find((a) => a.id === routeId);
  const name = route?.name ?? "Property route";
  if (!routeId) return { delta: -1.2, name };
  if (routeId.endsWith("_legacy")) return { delta: contract.sequelRights && contract.adaptations > 0 ? 1.3 : -3, name };
  if (routeId.endsWith("_turn")) return { delta: 1 - (ip.creatorControl / 100) * 1.15, name };
  return { delta: 0.4 + ip.creatorControl / 300, name };
}

function adjustReviews(reviews: Review[], targetTotal: number): Review[] {
  const out = reviews.map((review) => ({ ...review }));
  let current = out.reduce((sum, review) => sum + review.score, 0);
  let guard = 0;
  while (current !== targetTotal && guard++ < 100) {
    const direction = targetTotal > current ? 1 : -1;
    let changed = false;
    for (let i = 0; i < out.length && current !== targetTotal; i += 1) {
      const next = out[i].score + direction;
      if (next < 1 || next > 10) continue;
      out[i].score = next;
      current += direction;
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}

function sourceCurve(total: number, weeks: number, expectationGap: number): number[] {
  if (weeks <= 0 || total <= 0) return Array.from({ length: Math.max(0, weeks) }, () => 0);
  const tail = expectationGap >= 4 ? 0.035 : expectationGap < -4 ? -0.055 : 0;
  const weights = Array.from({ length: weeks }, (_, i) => {
    const opening = i === 0 ? 1.35 : 1;
    const decay = Math.exp(-i / 4.4);
    return Math.max(0.04, opening * decay * (1 + tail * i));
  });
  const weightTotal = weights.reduce((a, b) => a + b, 0) || 1;
  const sales = weights.map((w) => Math.max(0, Math.round(total * w / weightTotal)));
  const correction = total - sales.reduce((a, b) => a + b, 0);
  if (sales.length) sales[sales.length - 1] += correction;
  return sales;
}

function directionFit(draft: Draft, ideal: [number, number, number]): number {
  const averageDiff = draft.sliders.reduce((sum, value, i) => sum + Math.abs(value - ideal[i]), 0) / 3;
  return clamp(Math.round(100 - averageDiff * 1.55), 0, 100);
}

export function assessLicensedAdaptation(opts: {
  ip: AuctionIP;
  contract: IPContract;
  draft: Draft;
  baseTotal: number;
  hype: number;
  genreIdeal: [number, number, number];
}): LicensedAdaptationAssessment {
  const { ip, contract, draft, baseTotal, hype, genreIdeal } = opts;
  const scope = draft.scope ?? "standard";
  const deliveryCapacity = BUDGET_CAPACITY[draft.budget] + SCOPE_CAPACITY[scope] + MEDIUM_CAPACITY[draft.medium];
  const difficulty = (ip.adaptationDifficulty + ip.scopeComplexity) / 2;
  const adequacyGap = deliveryCapacity - difficulty;
  const adequacyDelta = clamp(adequacyGap / 11, -5, 2.5);
  const prestigeDelta = clamp((ip.prestige - 55) / 35, -0.5, 1.5);
  const expectationPressure = clamp((ip.expectationLevel - 65) / 40, 0, 0.9);
  const route = routeAdjustment(ip, contract, draft.licensedArcId);
  const reviewDelta = clamp(adequacyDelta + prestigeDelta + route.delta - expectationPressure, -6, 4);
  const expectedScore = Math.round(14 + ip.expectationLevel * 0.2);
  const adjustedTotal = clamp(Math.round(baseTotal + reviewDelta), 4, 40);
  const expectationGap = adjustedTotal - expectedScore;
  const marketingReach = 0.85 + clamp(hype, 0, 100) / 100 * 0.9;
  const wordOfMouth = expectationGap >= 5 ? 1.32 : expectationGap >= 0 ? 1.08 + expectationGap * 0.035 : expectationGap >= -4 ? 0.9 : 0.62;
  const sourceAudience = Math.round(
    ip.fanbase * 1000 *
    (1.55 + ip.prestige / 85) *
    MEDIUM_SOURCE_REACH[draft.medium] *
    marketingReach *
    wordOfMouth
  );

  const coreFans = ip.fanbase * 1000;
  const volatility = 0.75 + ip.audienceVolatility / 200;
  let sourceFanDelta = 0;
  if (expectationGap >= 5) sourceFanDelta = coreFans * (0.3 + Math.min(0.18, expectationGap * 0.02)) * volatility;
  else if (expectationGap >= 0) sourceFanDelta = coreFans * (0.08 + expectationGap * 0.035) * volatility;
  else if (expectationGap >= -4) sourceFanDelta = -coreFans * Math.abs(expectationGap) * 0.025 * volatility;
  else sourceFanDelta = -coreFans * clamp(0.14 + (Math.abs(expectationGap) - 4) * 0.065, 0.14, 0.7) * volatility;

  return {
    expectedScore,
    expectationGap,
    reviewDelta,
    adequacyGap,
    directionFit: directionFit(draft, genreIdeal),
    sourceAudience,
    sourceFanDelta: Math.round(sourceFanDelta),
    routeName: route.name,
  };
}

export function applyLicensedAdaptationOutcome(opts: {
  ip: AuctionIP;
  contract: IPContract;
  draft: Draft;
  result: ShowResult;
  hype: number;
  genreIdeal: [number, number, number];
}): ShowResult {
  const { ip, contract, draft, result, hype, genreIdeal } = opts;
  const assessment = assessLicensedAdaptation({ ip, contract, draft, baseTotal: result.total, hype, genreIdeal });
  const targetTotal = clamp(Math.round(result.total + assessment.reviewDelta), 4, 40);
  const reviews = adjustReviews(result.reviews, targetTotal);
  const total = reviews.reduce((sum, review) => sum + review.score, 0);
  const tier = tierOf(total);
  const hallOfFame = total >= 32;
  const extraSales = sourceCurve(assessment.sourceAudience, result.sales.length, assessment.expectationGap);
  const sales = result.sales.map((units, i) => Math.max(0, units + (extraSales[i] ?? 0)));
  const extraUnits = extraSales.reduce((a, b) => a + b, 0);
  const extraGross = draft.medium === "fanweb" ? Math.round(extraUnits * 0.55 * 0.98) : Math.round(extraUnits * 2.6);
  const gross = Math.max(0, result.revenue + extraGross);
  const { royalty, ownershipRevenue, net } = licensedRevenue(gross, contract);
  const fans = Math.round(result.fans + assessment.sourceFanDelta);
  const commercial = commercialTierOf(draft.medium, net);
  const scopeLabel = PRODUCTION_SCOPES[draft.scope ?? "standard"].label;
  const budgetLabel = BUDGETS[draft.budget].label;
  const expectationLabel = assessment.expectationGap >= 0 ? "met" : "missed";
  const fanLabel = assessment.sourceFanDelta >= 0 ? `+${assessment.sourceFanDelta.toLocaleString("en-GB")}` : `−${Math.abs(assessment.sourceFanDelta).toLocaleString("en-GB")}`;

  return {
    ...result,
    reviews,
    total,
    tier,
    hallOfFame,
    quality: clamp(result.quality + assessment.reviewDelta, 12, 40),
    sales,
    revenue: net,
    fans,
    commercial,
    breakdown: [
      ...result.breakdown,
      { label: `Genre direction (${draft.genres.join(" × ")})`, pts: `${assessment.directionFit}% match · same target as original productions` },
      { label: `Property route · ${assessment.routeName}`, pts: `${assessment.reviewDelta >= 0 ? "+" : ""}${assessment.reviewDelta.toFixed(1)} adaptation-side review adjustment` },
      { label: `Budget / scope suitability · ${budgetLabel} / ${scopeLabel}`, pts: assessment.adequacyGap >= 0 ? `adequate (+${Math.round(assessment.adequacyGap)} capacity)` : `under-scoped (${Math.round(assessment.adequacyGap)} capacity)` },
      { label: `Source prestige / expectations`, pts: `${ip.prestige} prestige · expected ${assessment.expectedScore}/40 · ${expectationLabel} by ${Math.abs(assessment.expectationGap)}` },
      { label: `Existing IP audience`, pts: `+${assessment.sourceAudience.toLocaleString("en-GB")} source-driven viewers/units · marketing affects reach, not craft` },
      { label: `IP fan conversion / backlash`, pts: `${fanLabel} fans` },
      { label: `${ip.title} royalty (${Math.round(contract.royaltyRate * 100)}%)`, pts: `−£${royalty.toLocaleString("en-GB")}` },
      { label: `Production ownership (${Math.round(contract.ownershipShare * 100)}%)`, pts: `+£${ownershipRevenue.toLocaleString("en-GB")}` },
    ],
  };
}
