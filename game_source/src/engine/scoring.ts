import {
  AIR_WEEKS,
  ARCS,
  AUDIENCES,
  GENRES,
  arcCombosFor,
  BUDGETS,
  CAST_WEIGHTS,
  MEDIUMS,
  PROTAGONISTS,
  REVIEWERS,
  SECRET_COMBOS,
  SLOTS,
  castById,
  castChemFor,
  affinityTier,
  comboKey,
  comboLevelBonus,
  comboMult,
  type CastRole,
  type CastMember,
  type Draft,
  type MediumId,
  type PointType,
} from "./data";
import {
  BUDGET_QUALITY_FACTOR,
  productionPointScore,
  reviewExpectationAdjustment,
} from "./production";
import { genreTargetFor } from "./genreTargets";
import { fanBaseSalesMultiplier } from "./difficulty";

export interface Points {
  story: number;
  art: number;
  sound: number;
}

export interface Review {
  outlet: string;
  focus: string;
  score: number; // out of 10
  quote: string;
}

export interface ShowResult {
  reviews: Review[];
  total: number; // out of 40
  tier: TierKey;
  hallOfFame: boolean;
  points: Points;
  issues: number;
  revenue: number;
  fans: number;
  costs: number;
  rd: number;
  sales: number[]; // weekly units (for fan web: weekly VIEWS — see WEB_ECONOMY)
  /** commercial-impact classification — separate from review tier.
   *  A Fan Web show is capped at CULT CLASSIC regardless of reviews. */
  commercial: { id: CommercialTierId; label: string; index: number };
  breakdown: { label: string; pts: string }[];
  comboLevel: number;
  newCombo: boolean;
  /** cast chemistry multipliers applied this show */
  chemMult: number;
  /** chemistry combos newly discovered by shipping this show */
  chemDiscovered: string[];
  /** a secret genre combo was discovered by shipping this show */
  secretDiscovered: boolean;
  /** raw quality (0..~42) — feeds the studio's all-time best and the
   *  slow rolling review expectation, NOT the review denominator */
  quality: number;
  /** arc synergies newly discovered by shipping this season */
  arcCombosDiscovered: string[];
  /** populated only by the release transaction, never by draft preview */
  castBreakthroughs?: { castId: string; name: string; genre: string }[];
}

export type TierKey = "masterpiece" | "hit" | "solid" | "mixed" | "flop";

/* --------------------------------------------- commercial impact
 * Reviews = artistic quality. Commercial impact = distribution/reach.
 * They are deliberately SEPARATE: a Fan Web show can review 10/10 and
 * still be stuck at CULT CLASSIC because it only reaches an open video
 * platform. A professional medium can climb all the way to a cultural
 * phenomenon. */
export type CommercialTierId = "obscure" | "niche" | "breakout" | "cult" | "mainstream" | "phenomenon";

export const COMMERCIAL_TIERS: { id: CommercialTierId; label: string; minRevenue: number }[] = [
  { id: "obscure", label: "OBSCURE", minRevenue: 0 },
  { id: "niche", label: "NICHE FOLLOWING", minRevenue: 20_000 },
  { id: "breakout", label: "BREAKOUT HIT", minRevenue: 60_000 },
  { id: "cult", label: "CULT CLASSIC", minRevenue: 100_000 },
  { id: "mainstream", label: "MAINSTREAM HIT", minRevenue: 450_000 },
  { id: "phenomenon", label: "CULTURAL PHENOMENON", minRevenue: 1_500_000 },
];

/** highest commercial tier a medium can reach. Fan Web is capped at
 *  CULT CLASSIC by the platform itself — never by review quality. */
export const COMMERCIAL_MAX_INDEX: Record<MediumId, number> = {
  fanweb: 3,
  ona: 5,
  tv: 5,
  ova: 5,
  special: 5,
  movie: 5,
};

export function commercialTierOf(medium: MediumId, revenue: number): { id: CommercialTierId; label: string; index: number } {
  let index = 0;
  for (let i = COMMERCIAL_TIERS.length - 1; i >= 0; i -= 1) {
    if (revenue >= COMMERCIAL_TIERS[i].minRevenue) { index = i; break; }
  }
  index = Math.min(index, COMMERCIAL_MAX_INDEX[medium] ?? 5);
  const tier = COMMERCIAL_TIERS[index];
  return {
    id: tier.id,
    label: medium === "fanweb" && tier.id === "breakout" ? "BREAKOUT WEB HIT" : tier.label,
    index,
  };
}

/* ------------------------------------------------ web (fan) economy
 * Fan Web Series runs a deliberately different commercial model: it is
 * an ad/view platform, not a broadcaster — low money per view, a slow
 * climb, a very long tail, strong fan conversion and an almost-free
 * distribution deal. It generates fans, knowledge and proof of concept,
 * never millions. All knobs are isolated here for APK tuning.
 * `sales[]` stays the weekly audience array internally; the UI labels it
 * VIEWS for a fan work. */
export const WEB_ECONOMY = {
  /** peak weekly views for a perfect fan series (vs 44,000 broadcast units) */
  peak: 30_000,
  /** ad revenue per view (vs £2.6 per broadcast unit) */
  revenuePerView: 0.55,
  /** fan conversion per view — the platform's whole draw */
  fanPerView: 0.16,
  /** slower climb than broadcast (2.2) and a much longer tail (2.05) */
  rampA: 1.35,
  tailB: 3.4,
  /** the platform takes almost nothing */
  platformFee: 0.02,
};

export const TIERS: Record<TierKey, { label: string; color: string }> = {
  masterpiece: { label: "HALL OF FAME", color: "#ffd166" },
  hit: { label: "SMASH HIT", color: "#5ef0c0" },
  solid: { label: "SOLID", color: "#3be1ff" },
  mixed: { label: "MIXED", color: "#a78bfa" },
  flop: { label: "FLOP", color: "#ff4d8d" },
};

/** out of 40, Game Dev Story style */
export const tierOf = (total: number): TierKey =>
  total >= 32 ? "masterpiece" : total >= 27 ? "hit" : total >= 21 ? "solid" : total >= 15 ? "mixed" : "flop";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------ quality calibration
 * Kairosoft-first absolute quality. A production's decisions (points,
 * ratio, sliders, cast, arcs, notes) land on a bounded quality scale that
 * maps directly to reviewer scores:
 *
 *   quality 16 → ~4/10     quality 32 → ~8/10
 *   quality 20 → ~5/10     quality 36 → ~9/10
 *   quality 24 → ~6/10     quality 40+ → potential 10/10
 *   quality 28 → ~7/10
 *
 * Above 36 the curve soft-caps (40 → ~9.2): a 10 needs genuinely elite
 * quality plus a favourable critic roll, and a perfect 40/40 is truly
 * exceptional instead of routine for any high-point production.
 *
 * These are directional starting constants, exercised by the seeded
 * balance matrix (scripts/scoring-balance.test.ts) and tuned by audit +
 * playtesting. They are NOT magic numbers. */
export const RAW_QUALITY_BASE = 9;
export const RAW_QUALITY_FLOOR = 12;
export const RAW_QUALITY_CEILING = 40;
/** saturating point conversion (see production.ts) scaled into quality */
export const POINT_QUALITY_SCALE = 0.55;
/** soft-cap slope above quality 36 (keeps 10s rare, not impossible) */
export const TOP_QUALITY_SLOPE = 0.15;
/** low/mid-range craft lift: 150→2.6, 450→4.4, 1200→6.4 — keeps the
 *  early career meaningful while staying far flatter than the old curve */
export const CRAFT_LIFT = 2.6;
export const CRAFT_LIFT_DIVISOR = 160;
export const SLIDER_QUALITY_SCALE = 0.35;
export const ARC_QUALITY_SCALE = 0.22;
/** bounded negative floor: poor/anti-synergistic arcs can genuinely hurt,
 *  experimentation stays viable (never an abyss) */
export const ARC_QUALITY_FLOOR = -12;
export const ISSUE_QUALITY_COST = 0.6;
export const SLOT_QUALITY_POINTS = 0.8;
/** combo/refinement multipliers are real but bounded — decisions matter
 *  without letting one discovered multiplier drown everything else */
export const COMBO_QUALITY_WEIGHT = 0.5;
export const CHEM_QUALITY_WEIGHT = 0.6;
/** per-critic variance. Wide enough that four simultaneous 10s are rare
 *  even for an elite master, tight enough that 9s are repeatable. */
export const REVIEW_NOISE_RANGE = 0.70;

export const CAST_BASE_QUALITY = 0.5;
export const VISIBLE_CAST_QUALITY = 0.6;
export const VISIBLE_CAST_SALES = 0.025;
export const HIDDEN_AFFINITY_MULTIPLIER = 2;
export const TYPE_MATCH_MULTIPLIER = 1.1;

export interface CastContribution {
  tier: 0 | 1 | 2;
  typeModifier: number;
  baseQuality: number;
  affinityQuality: number;
  salesBonus: number;
  totalQuality: number;
}

/** One bounded role contribution. Discovery is intentionally absent. */
export function castContribution(member: CastMember, role: CastRole, draft: Pick<Draft, "genres" | "animeType">): CastContribution {
  const tier = affinityTier(member, draft.genres);
  const typeModifier = member.legacyPlaceholder || member.type !== draft.animeType ? 1 : TYPE_MATCH_MULTIPLIER;
  const weight = member.legacyPlaceholder ? 0 : CAST_WEIGHTS[role];
  const baseQuality = weight * CAST_BASE_QUALITY * typeModifier;
  const affinityQuality = weight * VISIBLE_CAST_QUALITY * tier * typeModifier;
  const salesBonus = weight * VISIBLE_CAST_SALES * tier * typeModifier;
  return { tier, typeModifier, baseQuality, affinityQuality, salesBonus, totalQuality: baseQuality + affinityQuality };
}

/** deterministic LCG used by the seeded balance harness; normal gameplay
 *  keeps Math.random (the optional rng is test-only) */
export function seededRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

export function computeResult(opts: {
  draft: Draft;
  points: Points;
  issues: number;
  hype: number;
  research: string[];
  showrunner: string;
  genreIdeal: [number, number, number];
  genreRatio: [number, number, number];
  comboLevel: number;
  newCombo: boolean;
  /** whether this genre pairing has been shipped before (secret combos need discovery) */
  comboDiscovered: boolean;
  /** cast chemistry ids already discovered this run */
  castCombos: string[];
  /** arc synergy ids already discovered this run */
  arcCombos: string[];
  /** best raw quality the studio has ever shipped — kept as a RECORD only.
   *  Reviews are absolute-quality based and no longer divided by it. */
  studioTop: number;
  /** slow rolling studio expectation (EMA of past quality) — mild effect only */
  reviewExpectation?: number;
  franchiseMult: number;
  costs: number;
  fanBase: number;
  /** dynasty-era audience expectations — mildly raises the review bar */
  audienceBar?: number;
  /** knowledge affects explanation only; never affinity mechanics */
  castAffinityDiscovered?: string[];
  /** deterministic reviewer RNG (tests); default Math.random */
  rng?: () => number;
}): ShowResult {
  const {
    draft,
    points,
    issues,
    hype,
    research,
    showrunner,
    genreIdeal,
    genreRatio,
    comboLevel,
    newCombo,
    comboDiscovered,
    castCombos,
    arcCombos,
    reviewExpectation,
    franchiseMult,
    costs,
    fanBase,
    audienceBar,
    castAffinityDiscovered = [],
    rng,
  } = opts;
  const roll = rng ?? Math.random;

  const totalPts = points.story + points.art + points.sound;

  /* ---- how well the point mix matches what the genre wants (GDT tech/design) */
  const mix: [number, number, number] = totalPts
    ? [points.story / totalPts, points.art / totalPts, points.sound / totalPts]
    : [0.34, 0.33, 0.33];
  const drift = Math.abs(mix[0] - genreRatio[0]) + Math.abs(mix[1] - genreRatio[1]) + Math.abs(mix[2] - genreRatio[2]);
  const ratioMatch = clamp(1.05 - drift * 0.85, 0.5, 1.05);

  /* ---- slider focus vs the director's memo */
  let sliderPart = 0;
  const perPhase: number[] = [];
  const sliderFits: number[] = [];
  for (let p = 0; p < 3; p++) {
    const diff = Math.abs(draft.sliders[p] - genreIdeal[p]);
    const pts = clamp(4 - (diff / 100) * 4 * 2.1, 0, 4);
    perPhase.push(pts);
    sliderPart += pts;
    sliderFits.push(
      diff <= 4 ? 1.04 :
      diff <= 8 ? 1.00 :
      diff <= 14 ? 0.92 :
      diff <= 22 ? 0.80 :
      diff <= 32 ? 0.68 : 0.56
    );
  }
  const sliderFitMult = sliderFits.reduce((a, b) => a + b, 0) / Math.max(1, sliderFits.length);

  /* ---- casting: lead + supporting + pet + villain each contribute */
  const protag = castById(draft.protag);
  const sec = castById(draft.secondary);
  const pet = castById(draft.pet);
  const vil = castById(draft.villain);
  const castSlots: [CastRole, CastMember][] = [
    ["protag", protag], ["secondary", sec], ["pet", pet], ["villain", vil],
  ];
  const licensed = !!draft.licensedIpId;
  const castParts = castSlots.map(([role, member]) => licensed
    ? { role, member, totalQuality: 0, baseQuality: 0, salesBonus: 0, typeModifier: 1, tier: 1 as 0|1|2 }
    : { role, member, ...castContribution(member, role, draft) });
  const casting = castParts.reduce((sum, part) => sum + part.totalQuality, 0);
  const zeroAffinityRoles = castParts.filter((part) => part.tier === 0).length;
  const wrongTypeRoles = castParts.filter((part) => !part.member.legacyPlaceholder && part.member.type !== draft.animeType).length;
  /* Bad casting now hurts the WHOLE production instead of merely missing a tiny bonus.
     Four completely unsuitable roles can cut raw quality by roughly a third. */
  const castFitMult = clamp(1 - zeroAffinityRoles * 0.075 - wrongTypeRoles * 0.035, 0.62, 1.02);
  const castSalesMultiplier = 1 + castParts.reduce((sum, part) => sum + part.salesBonus, 0);
  const publicTier = (part: typeof castParts[number]): 0 | 1 | 2 => {
    if (castAffinityDiscovered.includes(part.member.id) && draft.genres.includes(part.member.hiddenAff)) return 2;
    return part.member.visibleAff.some((genre) => draft.genres.includes(genre)) ? 1 : 0;
  };
  const publicCasting = castParts.reduce(
    (sum, part) => sum + part.baseQuality
      + CAST_WEIGHTS[part.role] * VISIBLE_CAST_QUALITY * publicTier(part) * part.typeModifier,
    0,
  );
  const publicSalesMultiplier = 1 + castParts.reduce(
    (sum, part) => sum
      + CAST_WEIGHTS[part.role] * VISIBLE_CAST_SALES * publicTier(part) * part.typeModifier,
    0,
  );

  /* ---- arcs (greater impact: cast synergy + bigger finale payoff) */
  let arcQ = 0;
  let arcsF = 0;
  const castOf = (role: CastRole) => castById(draft[role]);
  draft.arcs.forEach((id, idx) => {
    const arc = ARCS.find((a) => a.id === id)!;
    arcQ += arc.q;
    arcsF += arc.f;
    if (arc.syn?.some((s) => draft.genres.includes(s))) {
      arcQ += arc.synQ ?? 0;
      arcsF += arc.synF ?? 0;
      if (showrunner === "vision" && (arc.id === "twist" || arc.id === "lore")) arcQ += 2;
    }
    if (arc.anti?.some((s) => draft.genres.includes(s))) {
      arcQ += arc.antiQ ?? -2;
      arcsF += arc.antiF ?? -0.01;
    }
    /* arcs that shine with the right cast member */
    if (arc.cast && arc.castQ) {
      const m = castOf(arc.cast);
      if (m && m.visibleAff.some((genre) => draft.genres.includes(genre))) {
        arcQ += arc.castQ;
        arcsF += 0.02;
      }
    }
    if (arc.id === "finale" && idx === draft.arcs.length - 1) {
      if (draft.arcs.length >= 6) arcQ += 6;
      else if (draft.arcs.length >= 4) arcQ += 4;
    }
  });

  /* ---- hidden arc synergies: the right arcs together pay off (shipped to discover) */
  const arcCombosHit = arcCombosFor(draft.arcs);
  const arcComboQ = arcCombosHit.reduce((a, c) => a + c.q, 0);
  const arcComboF = arcCombosHit.reduce((a, c) => a + c.f, 0);
  arcQ += arcComboQ;
  arcsF += arcComboF;
  const arcCombosDiscovered = arcCombosHit.filter((c) => !arcCombos.includes(c.id)).map((c) => c.id);

  const slot = SLOTS[draft.slot];
  const slotFit = slot.best.some((g) => draft.genres.includes(g)) ? 1 : 0;

  /* ---- raw quality on a diminishing-return curve. Production points
     matter strongly but asymptote; every decision below has real weight. */
  const pointScore = productionPointScore(totalPts, draft);
  const budgetFactor = BUDGET_QUALITY_FACTOR[draft.budget];
  const arcQuality = clamp(arcQ, ARC_QUALITY_FLOOR, 50) * ARC_QUALITY_SCALE;
  const craft = CRAFT_LIFT * Math.log(1 + totalPts / CRAFT_LIFT_DIVISOR);
  let raw = RAW_QUALITY_BASE
    + (pointScore * POINT_QUALITY_SCALE + craft) * ratioMatch * budgetFactor
    + sliderPart * SLIDER_QUALITY_SCALE
    + casting
    + arcQuality
    + slotFit * SLOT_QUALITY_POINTS;
  const comboFactor =
    1 + (comboMult(draft.genres, comboDiscovered) - 1) * COMBO_QUALITY_WEIGHT
    + (comboLevelBonus(comboLevel) - 1) * COMBO_QUALITY_WEIGHT;
  /* Direction, pairing and casting are now hard gates. Great raw craft cannot
     completely rescue a production whose creative brief is badly wrong. */
  raw *= sliderFitMult;
  raw *= genreTargetFor(draft.genres).comboQualityMult;
  raw *= castFitMult;
  raw *= comboFactor;
  raw -= issues * ISSUE_QUALITY_COST;

  /* ---- hidden cast chemistry (discovered by experimenting) */
  const matchingChems = licensed ? [] : castChemFor(draft);
  const chemMult = matchingChems.reduce((a, c) => a * c.mult, 1);
  const chemDiscovered = matchingChems.filter((c) => !castCombos.includes(c.id)).map((c) => c.id);
  const secretDiscovered = !comboDiscovered && draft.genres.length === 2 && comboKey(draft.genres) in SECRET_COMBOS;

  const chemFactor = 1 + (chemMult - 1) * CHEM_QUALITY_WEIGHT;
  const quality = clamp(raw * chemFactor, RAW_QUALITY_FLOOR, RAW_QUALITY_CEILING);

  /* ---- four critics, each out of 10.
     Absolute quality provides most of the score; the studio's all-time
     best is a record only. A slow EMA expectation nudges reviewers a
     little (≤ ±0.75) so unchanged mastery slowly feels less special
     without ever poisoning future releases. */
  /* Hard mode has a humane critic floor: disastrous work bottoms out around 4/10,
     but getting above that now demands correct direction, pairing and casting. */
  const floor = 4;
  const expectationAdj = reviewExpectationAdjustment(reviewExpectation);
  const audienceAdj = -Math.max(0, audienceBar ?? 0) * 0.07;
  /* absolute-quality mapping with a soft cap above quality 36
     (36 → ~9.0, 40 → ~9.5). A 10 requires elite quality AND critic
     agreement — elite work lands 9s regularly, 10s occasionally. */
  const base = (quality <= 36 ? quality * 0.25 : 9 + (quality - 36) * TOP_QUALITY_SLOPE)
    + expectationAdj + audienceAdj;
  const reviews: Review[] = REVIEWERS.map((r) => {
    let s = base;
    if (r.bias === "story") s += (perPhase[0] - 2) * 0.25 + (mix[0] - genreRatio[0]) * 2.5 + (roll() - 0.5) * REVIEW_NOISE_RANGE * 2;
    if (r.bias === "hype") s += (hype / 100) * 0.55 + (roll() - 0.5) * REVIEW_NOISE_RANGE * 2;
    if (r.bias === "harsh") s += -0.5 - issues * 0.12 + (roll() - 0.5) * REVIEW_NOISE_RANGE * 2;
    if (r.bias === "tech") s += (mix[1] - genreRatio[1]) * 2.5 - issues * 0.18 + (roll() - 0.5) * REVIEW_NOISE_RANGE * 2;
    s = Math.round(clamp(s, floor, 10));
    const tier = tierOf(s * 4);
    const pool = r.quotes[tier];
    return { outlet: r.name, focus: r.focus, score: s, quote: pool[Math.floor(roll() * pool.length)] };
  });

  const total = reviews.reduce((a, r) => a + r.score, 0);
  const tier = tierOf(total);
  const hallOfFame = total >= 32;

  /* ---- sales: a weekly curve like the Game Dev Story chart */
  const medium = MEDIUMS[draft.medium];
  const aud = AUDIENCES[draft.audience];
  const audFit = draft.genres.length
    ? draft.genres.reduce((a, g) => a + (aud.fit[g] ?? 1), 0) / draft.genres.length
    : 1;
  const merch = research.includes("merch2") ? 1.3 : research.includes("merch") ? 1.18 : 1;
  const local = research.includes("local") ? 1.12 : 1;
  const budgetScope = BUDGETS[draft.budget].scope;
  /* reviews use an absolute-quality scale now (a good show is ~5.5–7.5/10,
     not 8–10 like the old curve), so the review→sales curve is softened
     from ^2.1 to ^1.2: a decent show keeps pre-overhaul revenue, is not
     auto-rich, and excellence still pays ~1.8× more. */
  const appeal =
    Math.pow(total / 40, 1.2) *
    slot.reach *
    medium.reach *
    aud.mult *
    audFit *
    budgetScope *
    (1 + arcsF * 1.5) *
    (1 + hype / 90) *
    franchiseMult *
    merch *
    local *
    fanBaseSalesMultiplier(fanBase);

  /* Game Dev Tycoon bell curve: a slow build (early adopters), a decisive
     peak, then a long tail of re-runs and word of mouth. The gamma-ish
     shape ramps with t^a and decays exponentially, normalised so the peak
     week lands exactly at `peak` units. A fan (web) work uses the same
     shape but a slower climb, a much longer tail and a much lower peak. */
  const web = draft.medium === "fanweb" ? WEB_ECONOMY : null;
  const peak = (web ? web.peak : 44_000) * appeal * castSalesMultiplier;
  const rampA = web ? web.rampA : 2.2; // how steeply the show climbs
  const tailB = web ? web.tailB : 2.05; // how long the tail lasts
  const rawShape: number[] = [];
  for (let i = 0; i < AIR_WEEKS; i++) {
    const t = i + 1;
    rawShape.push(Math.pow(t, rampA) * Math.exp(-t / tailB));
  }
  const shapeMax = Math.max(...rawShape);
  const sales = rawShape.map((s) =>
    Math.max(0, Math.round(peak * (s / shapeMax) * (0.9 + roll() * 0.2)))
  );
  const units = sales.reduce((a, b) => a + b, 0);
  const revenue = web
    ? Math.round(units * web.revenuePerView * (1 - web.platformFee))
    : Math.round(units * 2.6);

  const tierFan = { masterpiece: 1.5, hit: 1.2, solid: 1, mixed: 0.62, flop: 0.3 }[tier];
  const fans = Math.round(units * (web ? web.fanPerView : 0.09) * tierFan);
  const rd = Math.max(2, Math.round(total * 0.55 + issues * 0.4));
  const commercial = commercialTierOf(draft.medium, revenue);

  const breakdown = [
    { label: `Development points (${Math.round(totalPts)})`, pts: `+${pointScore.toFixed(1)} (capped curve)` },
    { label: `Genre focus match (${Math.round(ratioMatch * 100)}%)`, pts: `×${ratioMatch.toFixed(2)}` },
    { label: "Direction sliders", pts: `+${(sliderPart * SLIDER_QUALITY_SCALE).toFixed(1)}` },
    licensed
      ? { label: `Canonical IP cast · ${(draft.licensedCharacters ?? []).join(" + ")}`, pts: "Property characters (no studio casting)" }
      : { label: `Known casting contribution · ${protag.name} + ${sec.name} + ${pet.name} + ${vil.name}`, pts: `+${publicCasting.toFixed(1)}` },
    { label: "Story arcs", pts: `${arcQ >= 0 ? "+" : ""}${arcQuality.toFixed(1)}` },
    { label: slotFit ? "Time-slot fit" : "Time-slot mismatch", pts: slotFit ? `+${SLOT_QUALITY_POINTS.toFixed(1)}` : "+0.0" },
    { label: `Genre combo ×${comboMult(draft.genres, comboDiscovered).toFixed(2)} (Lv${comboLevel})`, pts: `×${comboFactor.toFixed(2)}` },
    { label: `Unresolved editing notes (${issues})`, pts: `−${(issues * ISSUE_QUALITY_COST).toFixed(1)}` },
    { label: `Hype`, pts: `${Math.round(hype)}%` },
    { label: "Established audience", pts: `×${fanBaseSalesMultiplier(fanBase).toFixed(2)} sales (cap ×1.80)` },
    { label: "Commercial impact", pts: commercial.label },
  ];
  if (chemFactor !== 1) breakdown.push({ label: `Cast chemistry ×${chemMult.toFixed(2)}`, pts: `×${chemFactor.toFixed(2)}` });
  if (arcCombosHit.length > 0)
    breakdown.push({ label: `Arc synergy: ${arcCombosHit.map((c) => c.name).join(", ")}`, pts: `${arcComboQ >= 0 ? "+" : ""}${arcComboQ} Q` });
  const affNotes: string[] = [];
  for (const m of [protag, sec, pet, vil]) {
    const visibleHit = m.visibleAff.filter((g) => draft.genres.includes(g));
    const knownHidden = castAffinityDiscovered.includes(m.id) && draft.genres.includes(m.hiddenAff) ? [m.hiddenAff] : [];
    const hit = [...new Set([...visibleHit, ...knownHidden])];
    if (hit.length) affNotes.push(`${m.name} ↔ ${hit.map((g) => `${GENRES.find((x) => x.id === g)!.label}${knownHidden.includes(g) ? " ✦" : ""}`).join("/")}`);
  }
  if (affNotes.length) breakdown.push({ label: "Known cast fit", pts: affNotes.join(" · ") });
  if (castParts.some((part) => part.typeModifier === TYPE_MATCH_MULTIPLIER))
    breakdown.push({ label: "Anime Type casting", pts: "Matching traditions strengthen individual cast contributions" });
  if (publicSalesMultiplier > 1)
    breakdown.push({ label: "Known Correct Cast commercial lift", pts: `×${publicSalesMultiplier.toFixed(3)} sales` });
  if (secretDiscovered) breakdown.push({ label: "Secret combo discovered!", pts: "✦" });

  return {
    reviews,
    total,
    tier,
    hallOfFame,
    points,
    issues,
    revenue,
    fans,
    costs,
    rd,
    sales,
    commercial,
    breakdown,
    comboLevel,
    newCombo,
    chemMult,
    chemDiscovered,
    secretDiscovered,
    quality,
    arcCombosDiscovered,
  };
}

export const POINT_ORDER: PointType[] = ["story", "art", "sound"];
export type { CastRole };
export { PROTAGONISTS };
