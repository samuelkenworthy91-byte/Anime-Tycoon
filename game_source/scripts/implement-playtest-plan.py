from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def path(rel: str) -> Path:
    return ROOT / rel


def read(rel: str) -> str:
    return path(rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    p = path(rel)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def replace_exact(rel: str, old: str, new: str, expected: int = 1) -> None:
    text = read(rel)
    found = text.count(old)
    if found != expected:
        raise RuntimeError(f"{rel}: expected {expected} copies of exact block, found {found}: {old[:120]!r}")
    write(rel, text.replace(old, new, expected))


def replace_regex(rel: str, pattern: str, repl: str, expected: int = 1) -> None:
    text = read(rel)
    out, found = re.subn(pattern, repl, text, count=expected, flags=re.S)
    if found != expected:
        raise RuntimeError(f"{rel}: expected {expected} regex replacements, found {found}: {pattern[:120]!r}")
    write(rel, out)


# ---------------------------------------------------------------- licensed draft boundary
replace_exact(
    "src/components/LicensedCreate.tsx",
    'arcs:[arcId,studioArcId||"hook","finale"].filter(Boolean)',
    'arcs:[studioArcId||"hook","finale"].filter(Boolean)',
)

replace_exact(
    "src/engine/castV2Migration.ts",
    'import { GENRES, castById, type AnimeType, type Draft, type GenreId, type Staff } from "./data";',
    'import { ARCS, GENRES, castById, type AnimeType, type Draft, type GenreId, type Staff } from "./data";',
)
replace_regex(
    "src/engine/castV2Migration.ts",
    r'export function migrateUnlockedGenres\(raw: unknown\): GenreId\[\] \{.*?\n\}',
    '''export function migrateUnlockedGenres(raw: unknown, includeLegacyDefaults = true): GenreId[] {
  const migrated = asStrings(raw).flatMap((genre): GenreId[] => {
    if (genre === "racing") return ["pirate"];
    if (genre === "noir") return ["survival"];
    const active = migrateActiveGenre(genre);
    return active ? [active] : [];
  });
  const defaults: GenreId[] = includeLegacyDefaults ? ["slice", "fantasy"] : [];
  return [...new Set<GenreId>([...defaults, ...migrated])];
}''',
)
replace_regex(
    "src/engine/castV2Migration.ts",
    r'export function migrateDraftV2\(raw: Draft \| Record<string, unknown>, unlocked\?: readonly GenreId\[\]\): Draft \{.*?\n\}',
    '''export function migrateDraftV2(raw: Draft | Record<string, unknown>, unlocked?: readonly GenreId[]): Draft {
  const draft = raw as Draft;
  const oldGenres = (raw as { genres?: unknown }).genres;
  const rawArcs = asStrings((raw as { arcs?: unknown }).arcs);
  const licensedIpId = typeof draft.licensedIpId === "string" ? draft.licensedIpId : undefined;
  let licensedArcId = typeof draft.licensedArcId === "string" ? draft.licensedArcId : undefined;

  /* Old licensed drafts put property-route ids in the normal ARCS list. Recover
     that route, then remove non-ARCS ids so release scoring can never dereference
     an IP route as if it were a normal story beat. */
  if (licensedIpId && !licensedArcId) {
    licensedArcId = rawArcs.find((id) => id.startsWith(`${licensedIpId}_`) && !ARCS.some((a) => a.id === id));
  }
  const arcs = licensedIpId ? rawArcs.filter((id) => ARCS.some((a) => a.id === id)) : rawArcs;

  return {
    ...draft,
    animeType: inferAnimeType((raw as { animeType?: unknown }).animeType, oldGenres, draft.protag),
    genres: migrateGenreList(oldGenres, draft.protag, unlocked),
    arcs,
    ...(licensedArcId ? { licensedArcId } : {}),
  };
}''',
)

replace_exact(
    "src/engine/projects.ts",
    '  const base = 11 + MEDIUMS[d.medium].weeks + Math.max(0, d.arcs.length - 3);',
    '  const storyBeatCount = d.arcs.length + (d.licensedArcId ? 1 : 0);\n  const base = 11 + MEDIUMS[d.medium].weeks + Math.max(0, storyBeatCount - 3);',
)

# ---------------------------------------------------------------- licensed adaptation engine
write("src/engine/licensedAdaptation.ts", '''import { BUDGETS, PRODUCTION_SCOPES, type Draft, type MediumId } from "./data";
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
''')

# ---------------------------------------------------------------- narrative discoveries and literal descriptions
replace_exact(
    "src/engine/creativeDiscovery.ts",
    'import { GENRES, RESEARCH, SECRET_COMBOS, comboKey, comboMult, type GenreId } from "./data";',
    'import { ARCS, ARC_COMBOS, GENRES, RESEARCH, SECRET_COMBOS, comboKey, comboMult, type GenreId } from "./data";',
)
replace_exact(
    "src/engine/creativeDiscovery.ts",
    '''      label,
      rd: 62 + index * 4,
    };''',
    '''      label,
      order: index + 1,
      rd: 62 + index * 4,
    };''',
)
replace_exact(
    "src/engine/creativeDiscovery.ts",
    '''    name: `Experimental Pair Study: ${study.label}`,
    rd: study.rd,
    requires: "genre_studies",
    desc: `R&D suspects this unlikely pairing may hide an unusual audience response. Complete the study to reveal whether the ${study.label} theory is real before risking a production.`,''',
    '''    name: `Experimental Combination Study ${study.order}`,
    rd: study.rd,
    requires: "genre_studies",
    desc: "Investigate an unusual relationship between two genres. Completing this study will identify the pairing and its effect.",''',
)
replace_exact(
    "src/engine/creativeDiscovery.ts",
    '''}

export interface GenreReleaseEffect {''',
    '''}

export function experimentalStudyPresentation(item: { id: string; name: string; desc: string }, completed: boolean) {
  const study = RESEARCHABLE_SECRET_COMBOS.find((candidate) => candidate.id === item.id);
  if (!study || !completed) return { name: item.name, desc: item.desc };
  const effect = study.mult >= 1.2 ? "an unusually strong relationship" : study.mult < 0.95 ? "a risky relationship" : "a measurable relationship";
  return {
    name: `Breakthrough: ${study.label}`,
    desc: `Research confirms ${effect} between ${study.label}. The pairing is now known before production.`,
  };
}

const LITERAL_ARC_DESCRIPTIONS: Record<string, string> = {
  hook: "Open with an immediate problem, image or confrontation that gives the audience a clear reason to keep watching.",
  montage: "A character trains repeatedly over time, showing visible improvement before the challenge that tests that training.",
  tournament: "Characters enter an organised bracket or series of competitive matches, with advancement decided by performance.",
  origin: "Reveal the antagonist's earlier life and the events that shaped their current motives before the audience is asked to reassess them.",
  redemption: "An antagonist recognises the harm they caused and changes sides or takes meaningful action to repair it.",
  finale: "Bring the major conflicts and character goals to their decisive confrontation and resolve the season's central promises.",
  confession: "A character directly admits a hidden feeling, truth or relationship choice that has been building through earlier scenes.",
  case: "Introduce a mystery with evidence, suspects and questions that characters actively investigate before a reveal.",
  twist: "Reveal information that changes the audience's understanding of earlier events while still fitting the clues already shown.",
  narr_betrayal: "A trusted ally turns against the group, abandons them at a critical moment or reveals divided loyalties.",
  narr_revenge: "A character pursues the person or group responsible for an earlier loss, betrayal or defeat.",
  narr_rescue: "The cast attempts to recover a captured, missing or defecting character from an enemy or dangerous location.",
  narr_mentor: "An experienced figure trains or guides another character, establishing a relationship whose approval or loss can matter later.",
  narr_sacrifice: "A character knowingly gives up their safety, future or life so that somebody else can survive or succeed.",
  narr_foundfamily: "Characters who were not originally family choose mutual loyalty and belonging through shared experience.",
  narr_secretid: "A character maintains a concealed identity or role whose discovery would materially change their relationships.",
  narr_villainreveal: "Expose who the true antagonist is after earlier scenes have established the threat, suspects or false assumptions.",
  narr_falsewin: "Let the characters believe they have won before revealing that the apparent victory hid a larger failure or trap.",
};
for (const arc of ARCS) {
  const literal = LITERAL_ARC_DESCRIPTIONS[arc.id];
  if (literal) arc.desc = literal;
}

/* Keep the structure model semantically clean: positive structures live in
   ARC_COMBOS, negative structures in ARC_CLASHES. */
for (const oldNegative of ["backwards_training", "spoiled_mystery"]) {
  const at = ARC_COMBOS.findIndex((combo) => combo.id === oldNegative);
  if (at >= 0) ARC_COMBOS.splice(at, 1);
}
const EXTRA_ARC_COMBOS = [
  { id: "failed_retrieval", name: "Failed Retrieval", arcs: ["narr_rescue", "narr_betrayal"], q: 4, f: 0.03, ordered: true },
  { id: "personal_vendetta", name: "Personal Vendetta", arcs: ["narr_betrayal", "narr_revenge"], q: 4, f: 0.03, ordered: true },
  { id: "retrieval_crisis", name: "Retrieval Crisis", arcs: ["narr_rivalintro", "narr_rescue", "narr_betrayal"], q: 5, f: 0.04, ordered: true },
  { id: "lie_becomes_personal", name: "The Lie Becomes Personal", arcs: ["narr_falsewin", "narr_betrayal", "narr_revenge"], q: 6, f: 0.04, ordered: true },
  { id: "avenge_the_mentor", name: "Avenge the Mentor", arcs: ["narr_mentor", "narr_sacrifice", "narr_revenge"], q: 6, f: 0.03, ordered: true },
  { id: "bring_them_home", name: "Bring Them Home", arcs: ["narr_foundfamily", "narr_betrayal", "narr_rescue"], q: 5, f: 0.05, ordered: true },
  { id: "mask_was_threat", name: "The Mask Was the Threat", arcs: ["narr_secretid", "narr_villainreveal"], q: 4, f: 0.03, ordered: true },
];
for (const combo of EXTRA_ARC_COMBOS) {
  if (!ARC_COMBOS.some((existing) => existing.id === combo.id)) ARC_COMBOS.push(combo);
}
const redemptionRoad = ARC_COMBOS.find((combo) => combo.id === "road");
if (redemptionRoad) {
  redemptionRoad.ordered = true;
  redemptionRoad.q = Math.max(redemptionRoad.q, 4);
}

export interface GenreReleaseEffect {''',
)
replace_exact(
    "src/engine/creativeDiscovery.ts",
    '''  ordered: boolean;
  kind: "clash";''',
    '''  ordered: boolean;
  adjacent?: boolean;
  kind: "clash";''',
)
replace_exact(
    "src/engine/creativeDiscovery.ts",
    '''export const ARC_CLASHES: ArcDiscoveryEffect[] = [
  {''',
    '''export const ARC_CLASHES: ArcDiscoveryEffect[] = [
  {
    id: "clash_backwards_training",
    name: "Training After the Test",
    arcs: ["tournament", "montage"],
    q: -7,
    f: -0.05,
    ordered: true,
    kind: "clash",
    explanation: "Training arrives after the decisive competition, so the preparation cannot earn the result the audience already watched.",
  },
  {
    id: "clash_spoiled_mystery",
    name: "Answer Before the Question",
    arcs: ["narr_villainreveal", "case"],
    q: -8,
    f: -0.07,
    ordered: true,
    kind: "clash",
    explanation: "The antagonist is exposed before the investigation gives the audience a mystery to solve.",
  },
  {
    id: "clash_redemption_before_origin",
    name: "Motive Too Late",
    arcs: ["redemption", "origin"],
    q: -7,
    f: -0.05,
    ordered: true,
    kind: "clash",
    explanation: "The story asks the audience to accept redemption before showing the history meant to make that change understandable.",
  },
  {
    id: "clash_sacrifice_undone",
    name: "Sacrifice Undone",
    arcs: ["narr_sacrifice", "narr_rescue"],
    q: -8,
    f: -0.08,
    ordered: true,
    adjacent: true,
    kind: "clash",
    explanation: "The sacrifice is immediately reversed by a rescue beat, stripping the loss of the consequence the scene promised.",
  },
  {''',
)
replace_exact(
    "src/engine/creativeDiscovery.ts",
    '''export function arcClashesFor(arcIds: string[]): ArcDiscoveryEffect[] {
  return ARC_CLASHES.filter((clash) => clash.ordered
    ? containsInOrder(arcIds, clash.arcs)
    : clash.arcs.every((id) => arcIds.includes(id)));
}''',
    '''function containsAdjacent(haystack: string[], needles: string[]): boolean {
  if (!needles.length || needles.length > haystack.length) return false;
  return haystack.some((_, start) => needles.every((needle, offset) => haystack[start + offset] === needle));
}

export function arcClashesFor(arcIds: string[]): ArcDiscoveryEffect[] {
  return ARC_CLASHES.filter((clash) => clash.adjacent
    ? containsAdjacent(arcIds, clash.arcs)
    : clash.ordered
      ? containsInOrder(arcIds, clash.arcs)
      : clash.arcs.every((id) => arcIds.includes(id)));
}''',
)

# ---------------------------------------------------------------- progression engine
write("src/engine/progression.ts", '''import { GENRES, OFFICES, type GenreId } from "./data";

const GENRE_PURCHASE_CURVE = [
  9, 11, 13, 15,
  19, 22, 25, 28, 32,
  35, 38, 41, 44, 47, 50, 53, 55,
  60, 65, 70, 75, 80, 85, 90, 95,
] as const;

export interface GenreProgressState {
  rd: number;
  genresUnlocked: GenreId[];
  notices: string[];
}

export function genreUnlockCost(run: Pick<GenreProgressState, "genresUnlocked">, genreId: GenreId): number {
  if (run.genresUnlocked.includes(genreId)) return 0;
  const purchases = Math.max(0, new Set(run.genresUnlocked).size - 2);
  const base = GENRE_PURCHASE_CURVE[Math.min(purchases, GENRE_PURCHASE_CURVE.length - 1)];
  const genre = GENRES.find((g) => g.id === genreId);
  const oldPrice = genre?.rd ?? 30;
  const modifier = oldPrice <= 18 ? -1 : oldPrice <= 32 ? 0 : oldPrice <= 48 ? 1 : 2;
  return Math.max(8, Math.min(95, base + modifier));
}

export function unlockGenreLicense<T extends GenreProgressState>(run: T, genreId: GenreId): T | null {
  if (run.genresUnlocked.includes(genreId)) return null;
  const cost = genreUnlockCost(run, genreId);
  if (run.rd < cost) return null;
  const label = GENRES.find((g) => g.id === genreId)?.label ?? genreId;
  return {
    ...run,
    rd: run.rd - cost,
    genresUnlocked: [...run.genresUnlocked, genreId],
    notices: [...run.notices, `New genre licensed: ${label}! (${cost} RD)`],
  };
}

export interface OfficeProgressState {
  cash: number;
  officeLevel: number;
  showsMade: number;
  staff: readonly unknown[];
  fans: number;
}

export interface ProgressRequirement {
  id: "cash" | "shows" | "staff" | "fans";
  label: string;
  current: number;
  target: number;
  met: boolean;
  display: string;
}

const OFFICE_GATES: Record<number, { shows: number; staff: number; fans: number }> = {
  1: { shows: 3, staff: 1, fans: 2_500 },
  2: { shows: 8, staff: 3, fans: 20_000 },
  3: { shows: 15, staff: 5, fans: 75_000 },
  4: { shows: 24, staff: 8, fans: 200_000 },
};

const number = (v: number) => Math.round(v).toLocaleString("en-GB");
const money = (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`;

export function officeRelocationRequirements(run: OfficeProgressState): ProgressRequirement[] {
  const nextLevel = run.officeLevel + 1;
  const next = OFFICES[nextLevel];
  const gate = OFFICE_GATES[nextLevel];
  if (!next || !gate) return [];
  return [
    { id: "cash", label: "Cash", current: run.cash, target: next.cost, met: run.cash >= next.cost, display: `${money(run.cash)} / ${money(next.cost)}` },
    { id: "shows", label: "Productions aired", current: run.showsMade, target: gate.shows, met: run.showsMade >= gate.shows, display: `${run.showsMade} / ${gate.shows}` },
    { id: "staff", label: "Employees", current: run.staff.length, target: gate.staff, met: run.staff.length >= gate.staff, display: `${run.staff.length} / ${gate.staff}` },
    { id: "fans", label: "Studio fans", current: run.fans, target: gate.fans, met: run.fans >= gate.fans, display: `${number(run.fans)} / ${number(gate.fans)}` },
  ];
}

export function officeRelocationBlockReason(run: OfficeProgressState): string | null {
  const requirements = officeRelocationRequirements(run);
  if (!requirements.length) return "No larger studio is available.";
  const missing = requirements.filter((r) => !r.met);
  return missing.length ? `Requires ${missing.map((r) => `${r.label} ${r.display}`).join(" · ")}` : null;
}
''')

# ---------------------------------------------------------------- state wiring
replace_exact(
    "src/engine/state.ts",
    'import { initIPMarket, licensedRevenue, migrateIPMarket, tickIPMarket, ipById, playerAuctionAwardProof, type IPMarketState } from "./ip";',
    'import { initIPMarket, migrateIPMarket, tickIPMarket, ipById, playerAuctionAwardProof, type IPMarketState } from "./ip";\nimport { applyLicensedAdaptationOutcome } from "./licensedAdaptation";\nimport { officeRelocationBlockReason } from "./progression";',
)
replace_exact(
    "src/engine/state.ts",
    '  const unlocked = migrateUnlockedGenres(r.genresUnlocked);',
    '  const unlocked = migrateUnlockedGenres(r.genresUnlocked, r.castGenreV2 !== 2);',
)
replace_regex(
    "src/engine/state.ts",
    r'  /\* Licensed adaptations carry fan expectations and royalties\..*?\n  \}\n\n  /\* ---- the deal:',
    '''  /* Licensed adaptations share the exact genre-direction target with originals,
     then add source-material difficulty, expectation pressure, built-in audience,
     royalties and possible signed fan backlash on top. */
  const licensedIp = draft.licensedIpId ? ipById(draft.licensedIpId) : null;
  const licensedContract = draft.licensedIpId ? r.ipMarket.owned[draft.licensedIpId] : null;
  const licensedAwardProof = draft.licensedIpId ? playerAuctionAwardProof(r.ipMarket, draft.licensedIpId) : null;
  if (licensedIp && licensedContract) {
    result = applyLicensedAdaptationOutcome({
      ip: licensedIp,
      contract: licensedContract,
      draft,
      result,
      hype: extra.hype,
      genreIdeal: genreTargetFor(draft.genres).ideal,
    });
  }

  /* ---- the deal:''',
)
replace_exact(
    "src/engine/state.ts",
    '    if (c.amount > 0 || c.fans > 0)',
    '    if (c.amount !== 0 || c.fans !== 0)',
)
replace_exact(
    "src/engine/state.ts",
    '    if (wkIncome > 0 || wkFans > 0) {',
    '    if (wkIncome !== 0 || wkFans !== 0) {',
)
replace_regex(
    "src/engine/state.ts",
    r'export function relocateOffice\(r: RunState\): RunState \| null \{\n  const next = OFFICES\[r\.officeLevel \+ 1\];\n  if \(!next \|\| r\.cash < next\.cost\) return null;',
    '''export function relocateOffice(r: RunState): RunState | null {
  const next = OFFICES[r.officeLevel + 1];
  if (!next || officeRelocationBlockReason(r)) return null;''',
)

# ---------------------------------------------------------------- office UI
replace_exact(
    "src/components/Office.tsx",
    'import { cn } from "../utils/cn";',
    'import { cn } from "../utils/cn";\nimport { experimentalStudyPresentation } from "../engine/creativeDiscovery";\nimport { genreUnlockCost, officeRelocationBlockReason, officeRelocationRequirements, unlockGenreLicense } from "../engine/progression";\nimport { AWARD_CATEGORIES, awardQualificationText } from "../engine/awards";',
)
replace_regex(
    "src/components/Office.tsx",
    r'  const unlockGenre = \(g: GenreId, rd: number\) => \{.*?\n  \};\n  const relocate = \(\) => \{.*?\n  \};',
    '''  const unlockGenre = (g: GenreId) => {
    const cost = genreUnlockCost(run, g);
    if (!cost || run.rd < cost) return;
    sfx.fanfare();
    setRun((r) => unlockGenreLicense(r, g) ?? r);
  };
  const relocate = () => {
    if (!nextOffice || officeRelocationBlockReason(run)) return;
    sfx.fanfare();
    setModal(null);
    setRun((r) => relocateOffice(r) ?? r);
  };''',
)
replace_exact(
    "src/components/Office.tsx",
    '                    const block = researchBlockReason(run, u.id);\n                    return (',
    '                    const block = researchBlockReason(run, u.id);\n                    const displayResearch = experimentalStudyPresentation(u, owned);\n                    return (',
)
replace_exact("src/components/Office.tsx", '{u.name}</span>', '{displayResearch.name}</span>')
replace_exact("src/components/Office.tsx", '<div className="mt-0.5 text-[11px] text-paper/55">{u.desc}</div>', '<div className="mt-0.5 text-[11px] text-paper/55">{displayResearch.desc}</div>')
replace_exact(
    "src/components/Office.tsx",
    '              const Icon = g.icon;\n              return (',
    '              const Icon = g.icon;\n              const rdCost = genreUnlockCost(run, g.id);\n              return (',
)
replace_exact("src/components/Office.tsx", 'disabled={owned || run.rd < g.rd}', 'disabled={owned || run.rd < rdCost}')
replace_exact("src/components/Office.tsx", 'onClick={() => unlockGenre(g.id, g.rd)}', 'onClick={() => unlockGenre(g.id)}')
replace_exact("src/components/Office.tsx", 'run.rd >= g.rd ? "border-line bg-panel2 hover:border-gold"', 'run.rd >= rdCost ? "border-line bg-panel2 hover:border-gold"')
replace_exact("src/components/Office.tsx", 'owned ? "✓" : `${g.rd}`', 'owned ? "✓" : `${rdCost}`')
replace_exact(
    "src/components/Office.tsx",
    '''              <Btn variant="gold" className="mt-3 w-full" disabled={run.cash < nextOffice.cost} onClick={relocate}>
                MOVE IN — {formatGBP(nextOffice.cost)}
              </Btn>''',
    '''              <div className="mt-3 space-y-1 rounded-lg border border-line bg-panel2 p-2">
                {officeRelocationRequirements(run).map((req) => (
                  <div key={req.id} className={cn("flex items-center justify-between gap-2 text-[10px]", req.met ? "text-mint" : "text-paper/55")}>
                    <span>{req.met ? "✓" : "○"} {req.label}</span><b>{req.display}</b>
                  </div>
                ))}
              </div>
              <Btn variant="gold" className="mt-3 w-full" disabled={!!officeRelocationBlockReason(run)} onClick={relocate}>
                MOVE IN — {formatGBP(nextOffice.cost)}
              </Btn>''',
)
replace_exact(
    "src/components/Office.tsx",
    '<Modal title="LONDON ANIME AWARDS" onClose={() => setModal(null)}>\n          {run.awardsCeremony ? (',
    '''<Modal title="LONDON ANIME AWARDS" onClose={() => setModal(null)}>
          <div className="mb-3 rounded-xl border border-line bg-panel2 p-3">
            <div className="mb-2 text-[10px] font-black tracking-widest text-gold">CURRENT QUALIFICATION STANDARDS</div>
            <div className="grid gap-1 sm:grid-cols-2">
              {AWARD_CATEGORIES.map((award) => (
                <div key={award.id} className="flex items-start justify-between gap-2 text-[9px] text-paper/60">
                  <b className="text-paper/80">{award.name}</b><span className="text-right">{awardQualificationText(award.id, Math.floor(run.week / 48) + 1)}</span>
                </div>
              ))}
            </div>
          </div>
          {run.awardsCeremony ? (''',
)

# ---------------------------------------------------------------- awards qualifications and meaningful rewards
replace_exact(
    "src/engine/awards.ts",
    'const fansShort = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}k` : `${Math.round(v)}`);',
    '''const fansShort = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}k` : `${Math.round(v)}`);

const awardEra = (year: number) => year <= 2 ? 0 : year <= 5 ? 1 : year <= 8 ? 2 : 3;

export function awardQualificationText(id: AwardCategoryId, year: number): string {
  const era = awardEra(year);
  if (id === "aoty") return `${27 + era}/40 minimum review`;
  if (id === "shonen" || id === "shojo") return `${24 + era}/40 minimum review`;
  if (id === "writing") return `${20 + era}/40 overall · Writing ${28 + era * 2}+`;
  if (id === "animation") return `${20 + era}/40 overall · Animation ${28 + era * 2}+`;
  if (id === "score") return `${20 + era}/40 overall · Score ${28 + era * 2}+`;
  const audienceFloor = [3_000, 8_000, 20_000, 40_000][era];
  return `${18 + era}/40 overall · ${fansShort(audienceFloor)} audience`;
}

export function awardQualifies(id: AwardCategoryId, year: number, n: AwardNominee): boolean {
  const era = awardEra(year);
  if (id === "aoty") return n.score >= 27 + era;
  if (id === "shonen" || id === "shojo") return n.score >= 24 + era;
  if (id === "writing") return n.score >= 20 + era && n.story >= 28 + era * 2;
  if (id === "animation") return n.score >= 20 + era && n.art >= 28 + era * 2;
  if (id === "score") return n.score >= 20 + era && n.sound >= 28 + era * 2;
  return n.score >= 18 + era && n.audience >= [3_000, 8_000, 20_000, 40_000][era];
}

export function awardPayoutFor(def: AwardCategoryDef, year: number): { cash: number; fans: number } {
  const cashMult = Math.min(6, 1 + Math.max(0, year - 1) * 0.45);
  const fanMult = Math.min(1.35, 1 + Math.max(0, year - 1) * 0.03);
  return { cash: Math.round(def.cash * cashMult), fans: Math.round(def.fans * fanMult) };
}''',
)
for old, new in [
    ('fans: 1_500,', 'fans: 60_000,'),
    ('fans: 750,', 'fans: 40_000,'),
    ('fans: 250,', 'fans: 30_000,'),
    ('fans: 1_000,', 'fans: 45_000,'),
]:
    # fan 750 appears twice, fan 250 three times
    expected = 2 if old == 'fans: 750,' else 3 if old == 'fans: 250,' else 1
    replace_exact("src/engine/awards.ts", old, new, expected)
replace_exact(
    "src/engine/awards.ts",
    '    const pool = uniqueShows.filter((n) => def.eligible(n));',
    '    const pool = uniqueShows.filter((n) => def.eligible(n) && awardQualifies(def.id, year, n));',
)
replace_exact(
    "src/engine/awards.ts",
    '''    const ranked = rankFor(def, pool, year);
    const nominees = ranked.slice(0, NOMINEES_PER_CATEGORY);
    categories.push({''',
    '''    const ranked = rankFor(def, pool, year);
    const nominees = ranked.slice(0, NOMINEES_PER_CATEGORY);
    const payout = awardPayoutFor(def, year);
    categories.push({''',
)
replace_exact("src/engine/awards.ts", '      blurb: def.blurb,', '      blurb: `${def.blurb} · Qualification: ${awardQualificationText(def.id, year)}`,' )
replace_exact("src/engine/awards.ts", '      payout: { cash: def.cash, fans: def.fans },', '      payout,')

# ---------------------------------------------------------------- visible release failure
replace_exact(
    "src/App.tsx",
    '''      const out = releaseProject(run, shipId, { spent, hype });
      if (!out) return;''',
    '''      let out: ReturnType<typeof releaseProject>;
      try {
        out = releaseProject(run, shipId, { spent, hype });
      } catch (error) {
        console.error("Release failed", error);
        window.alert("RELEASE FAILED — this production could not be finalised. Your save has not been altered.");
        return;
      }
      if (!out) {
        window.alert("RELEASE FAILED — this production is not in a valid state to air. Your save has not been altered.");
        return;
      }''',
)

# ---------------------------------------------------------------- tests
write("src/engine/__tests__/playtest-plan.test.ts", '''import { describe, expect, it } from "vitest";
import { ARCS, PROTAGONISTS, SECONDARY, PETS, VILLAINS, arcCombosFor, type Draft, type GenreId } from "../data";
import { AUCTION_IPS, type IPContract } from "../ip";
import { makeProject } from "../projects";
import { initialRun, releaseProject } from "../state";
import { migrateDraftV2, migrateUnlockedGenres } from "../castV2Migration";
import { applyLicensedAdaptationOutcome } from "../licensedAdaptation";
import { genreTargetFor } from "../genreTargets";
import { RESEARCHABLE_SECRET_COMBOS, arcClashesFor, experimentalStudyPresentation } from "../creativeDiscovery";
import { genreUnlockCost, officeRelocationBlockReason, officeRelocationRequirements } from "../progression";
import type { ShowResult } from "../scoring";

const contractFor = (ipId: string): IPContract => ({
  ipId, acquiredWeek: 0, expiresWeek: 999, purchasePrice: 100_000,
  royaltyRate: 0.1, ownershipShare: 0.45, sequelRights: true, merchRights: true,
  internationalRights: true, adaptations: 1, bestScore: 0, discoveredArcs: [],
});

const licensedDraft = (ip = AUCTION_IPS[0], overrides: Partial<Draft> = {}): Draft => ({
  title: ip.title, medium: "tv", budget: "standard", scope: "standard", slot: "midnight",
  animeType: ip.animeType, genres: ip.genreTags.slice(0, 2), audience: ip.audience,
  protag: PROTAGONISTS[0].id, protagName: ip.characters[0].name,
  secondary: SECONDARY[0].id, secondaryName: ip.characters[1].name,
  pet: PETS[0].id, petName: ip.characters.find((c) => c.role === "mascot")?.name ?? "",
  villain: VILLAINS[0].id, villainName: ip.characters.find((c) => c.role === "antagonist")?.name ?? ip.characters[2].name,
  arcs: ["hook", "finale"], sliders: [50, 50, 50], season: 1,
  licensedIpId: ip.id, licensedArcId: ip.availableArcs[0].id, licensedCharacters: ip.characters.map((c) => c.name),
  ...overrides,
});

const baseResult = (total = 20): ShowResult => ({
  reviews: Array.from({ length: 4 }, (_, i) => ({ outlet: `R${i}`, focus: "test", score: Math.max(1, Math.min(10, Math.round(total / 4))), quote: "test" })),
  total, tier: "mixed", hallOfFame: false, points: { story: 100, art: 100, sound: 100 }, issues: 0,
  revenue: 100_000, fans: 8_000, costs: 50_000, rd: 0, sales: Array.from({ length: 16 }, () => 10_000),
  commercial: { id: "breakout", label: "BREAKOUT HIT", index: 2 }, breakdown: [], comboLevel: 0, newCombo: false,
  chemMult: 1, chemDiscovered: [], secretDiscovered: false, quality: 20, arcCombosDiscovered: [], arcClashes: [], genreSalesMult: 1,
});

describe("licensed adaptation boundary", () => {
  it("releases every current auction IP without treating its route as a normal ARCS entry", () => {
    expect(AUCTION_IPS.length).toBeGreaterThanOrEqual(80);
    for (const ip of AUCTION_IPS) {
      const draft = licensedDraft(ip);
      expect(draft.arcs.every((id) => ARCS.some((arc) => arc.id === id))).toBe(true);
      let project = makeProject(draft, 0, 0);
      project = { ...project, stage: "ready", points: { story: 180, art: 180, sound: 180 }, issues: 0 };
      const base = initialRun("IP Test", "steady");
      const run = {
        ...base, cash: 50_000_000, officeLevel: 4, projects: [project],
        ipMarket: { ...base.ipMarket, owned: { ...base.ipMarket.owned, [ip.id]: contractFor(ip.id) } },
      };
      const out = releaseProject(run, project.id, { spent: 0, hype: 35 });
      expect(out, ip.title).not.toBeNull();
      expect(Number.isFinite(out!.result.revenue), ip.title).toBe(true);
      expect(Number.isFinite(out!.result.fans), ip.title).toBe(true);
    }
  });

  it("repairs broken current-save licensed drafts and preserves recent random genre ownership", () => {
    const ip = AUCTION_IPS[0];
    const broken = licensedDraft(ip, { licensedArcId: undefined, arcs: [ip.availableArcs[0].id, "hook", "finale"] });
    const migrated = migrateDraftV2(broken);
    expect(migrated.licensedArcId).toBe(ip.availableArcs[0].id);
    expect(migrated.arcs).toEqual(["hook", "finale"]);
    expect(migrateUnlockedGenres(["kaiju", "romance"], false)).toEqual(["kaiju", "romance"]);
  });

  it("keeps licensed direction targets identical to the exact same original genre pair", () => {
    for (const ip of AUCTION_IPS.slice(0, 20)) {
      const original = genreTargetFor(ip.genreTags.slice(0, 2));
      const licensed = genreTargetFor(licensedDraft(ip).genres);
      expect(licensed.ideal).toEqual(original.ideal);
      expect(licensed.ratio).toEqual(original.ratio);
    }
  });

  it("lets a famous bad adaptation make money while producing real fan backlash", () => {
    const ip = [...AUCTION_IPS].sort((a, b) => b.fanbase - a.fanbase)[0];
    const draft = licensedDraft(ip, { medium: "tv", budget: "indie", scope: "short", sliders: [0, 0, 0] });
    const outcome = applyLicensedAdaptationOutcome({
      ip, contract: contractFor(ip.id), draft, result: baseResult(12), hype: 90,
      genreIdeal: genreTargetFor(draft.genres).ideal,
    });
    expect(outcome.revenue).toBeGreaterThan(0);
    expect(outcome.fans).toBeLessThan(8_000);
    expect(outcome.breakdown.some((row) => row.label.includes("backlash"))).toBe(true);
  });

  it("makes a well-resourced adaptation a larger fan and money opportunity", () => {
    const ip = [...AUCTION_IPS].sort((a, b) => b.fanbase - a.fanbase)[0];
    const poorDraft = licensedDraft(ip, { budget: "indie", scope: "short" });
    const strongDraft = licensedDraft(ip, { budget: "blockbuster", scope: "prestige" });
    const ideal = genreTargetFor(ip.genreTags.slice(0, 2)).ideal;
    const poor = applyLicensedAdaptationOutcome({ ip, contract: contractFor(ip.id), draft: poorDraft, result: baseResult(20), hype: 35, genreIdeal: ideal });
    const strong = applyLicensedAdaptationOutcome({ ip, contract: contractFor(ip.id), draft: strongDraft, result: baseResult(28), hype: 35, genreIdeal: ideal });
    expect(strong.total).toBeGreaterThan(poor.total);
    expect(strong.fans).toBeGreaterThan(poor.fans);
    expect(strong.revenue).toBeGreaterThan(poor.revenue);
  });
});

describe("research, arcs and progression", () => {
  it("conceals experimental pair labels until the study is completed", () => {
    for (const study of RESEARCHABLE_SECRET_COMBOS) {
      const hidden = experimentalStudyPresentation({ id: study.id, name: `Experimental Combination Study ${study.order}`, desc: "Investigate an unusual relationship between two genres." }, false);
      const shown = experimentalStudyPresentation({ id: study.id, name: "x", desc: "x" }, true);
      for (const genre of study.label.split(" × ")) expect(`${hidden.name} ${hidden.desc}`).not.toContain(genre);
      expect(shown.name).toContain(study.label);
    }
  });

  it("adds the requested ordered story structures and adjacency-aware clashes", () => {
    expect(arcCombosFor(["narr_betrayal", "narr_revenge"]).some((c) => c.id === "personal_vendetta")).toBe(true);
    expect(arcCombosFor(["narr_rivalintro", "narr_rescue", "narr_betrayal"]).some((c) => c.id === "retrieval_crisis")).toBe(true);
    expect(arcClashesFor(["narr_sacrifice", "narr_rescue"]).some((c) => c.id === "clash_sacrifice_undone")).toBe(true);
    expect(arcClashesFor(["narr_sacrifice", "hook", "narr_rescue"]).some((c) => c.id === "clash_sacrifice_undone")).toBe(false);
    expect(arcClashesFor(["redemption", "origin"]).some((c) => c.id === "clash_redemption_before_origin")).toBe(true);
  });

  it("escalates genre licence costs while preserving an affordable first expansion", () => {
    const ids = ARCS.length ? AUCTION_IPS[0].genreTags : (["slice"] as GenreId[]);
    const target = GENRE_IDS_FOR_TEST.find((id) => !ids.includes(id))!;
    const first = genreUnlockCost({ genresUnlocked: ["kaiju", "romance"] }, target);
    const mid = genreUnlockCost({ genresUnlocked: GENRE_IDS_FOR_TEST.slice(0, 12) }, target);
    const late = genreUnlockCost({ genresUnlocked: GENRE_IDS_FOR_TEST.slice(0, 25) }, target);
    expect(first).toBeLessThanOrEqual(12);
    expect(mid).toBeGreaterThan(first);
    expect(late).toBeGreaterThanOrEqual(60);
    expect(late).toBeLessThanOrEqual(95);
  });

  it("requires sustained studio growth for relocation, not cash alone", () => {
    const richButTiny = { cash: 50_000_000, officeLevel: 0, showsMade: 0, staff: [], fans: 0 };
    expect(officeRelocationBlockReason(richButTiny)).toContain("Productions aired");
    const ready = { cash: 500_000, officeLevel: 0, showsMade: 3, staff: [{}], fans: 3_000 };
    expect(officeRelocationBlockReason(ready)).toBeNull();
    expect(officeRelocationRequirements(ready).every((r) => r.met)).toBe(true);
  });
});

const GENRE_IDS_FOR_TEST = [
  "mecha", "isekai", "slice", "horror", "romance", "sports", "cyber", "fantasy", "idol", "mystery",
  "comedy", "cooking", "military", "supernatural", "space", "magical", "survival", "pirate", "martial", "mythology",
  "nordic", "samurai", "shinobi", "vampire", "grimdark", "monster_taming", "crime", "kaiju", "cosmic_horror", "arabia",
] as GenreId[];
''')

# Fix the progression test target to be a known unowned genre without importing GENRES.
replace_exact(
    "src/engine/__tests__/playtest-plan.test.ts",
    '''    const ids = ARCS.length ? AUCTION_IPS[0].genreTags : (["slice"] as GenreId[]);
    const target = GENRE_IDS_FOR_TEST.find((id) => !ids.includes(id))!;
    const first = genreUnlockCost({ genresUnlocked: ["kaiju", "romance"] }, target);''',
    '''    const target = "cosmic_horror" as GenreId;
    const first = genreUnlockCost({ genresUnlocked: ["kaiju", "romance"] }, target);''',
)

# Update old award reward assertions and make the single-show sweep craft-qualified.
for old, new, count in [
    ('expect(by.aoty.fans).toBe(1_500);', 'expect(by.aoty.fans).toBe(60_000);', 1),
    ('expect(by.shonen.fans).toBe(750);', 'expect(by.shonen.fans).toBe(40_000);', 1),
    ('expect(by.shojo.fans).toBe(750);', 'expect(by.shojo.fans).toBe(40_000);', 1),
    ('expect(by[id].fans).toBe(250);', 'expect(by[id].fans).toBe(30_000);', 1),
    ('expect(by.fanfav.fans).toBe(1_000);', 'expect(by.fanfav.fans).toBe(45_000);', 1),
    ('expect(win.fans).toBe(1_500);', 'expect(win.fans).toBe(60_000);', 1),
]:
    replace_exact("src/engine/__tests__/awards.test.ts", old, new, count)
replace_exact(
    "src/engine/__tests__/awards.test.ts",
    'const c = buildCeremony(1, [mk({ title: "Mine", player: true, studio: "Player Co", score: 39, audience: 999_999 })]);',
    'const c = buildCeremony(1, [mk({ title: "Mine", player: true, studio: "Player Co", score: 39, story: 40, art: 40, sound: 40, audience: 999_999 })]);',
)

# Add explicit award threshold/payout regression coverage.
replace_exact(
    "src/engine/__tests__/awards.test.ts",
    '  PRESENTATION_ORDER,\n  type AwardNominee,',
    '  PRESENTATION_ORDER,\n  awardPayoutFor,\n  awardQualifies,\n  type AwardNominee,',
)
replace_exact(
    "src/engine/__tests__/awards.test.ts",
    '''  it("presents Anime of the Year LAST as the super-finale", () => {''',
    '''  it("uses transparent rising qualification standards and meaningful fan rewards", () => {
    const aoty = AWARD_CATEGORIES.find((c) => c.id === "aoty")!;
    expect(awardQualifies("aoty", 1, mk({ score: 27 }))).toBe(true);
    expect(awardQualifies("aoty", 9, mk({ score: 29 }))).toBe(false);
    expect(awardPayoutFor(aoty, 1)).toEqual({ cash: 20_000, fans: 60_000 });
    expect(awardPayoutFor(aoty, 10).cash).toBeGreaterThan(20_000);
  });

  it("presents Anime of the Year LAST as the super-finale", () => {''',
)

print("Playtest implementation patch applied successfully.")
