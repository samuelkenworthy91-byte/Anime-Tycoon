/* ============================================================================
 *  FRANCHISE ENGINE — long-term IP management
 *  Every released show becomes an IP record with a timeline, cast popularity,
 *  fan expectations, fatigue, cult followings and merchandising.
 * ========================================================================== */
import type { AnimeType, AudienceId, Draft, GenreId, MediumId } from "./data";
import { inferAnimeType, migrateGenreList } from "./castV2Migration";
import type { Project } from "./projects";

/* ------------------------------------------------------------ entry kinds */
export type EntryKind =
  | "original"
  | "season"
  | "movie"
  | "ova"
  | "side"
  | "prequel"
  | "spinoff"
  | "reboot"
  | "crossover";

/** one release in an IP's timeline */
export interface FranchiseEntry {
  kind: EntryKind;
  title: string;
  score: number; // /40
  revenue: number; // the studio's net take
  fans: number;
  week: number;
  animeType?: AnimeType;
  /** what the fans expected going in (continuations only) */
  expected?: number;
  disappointment?: boolean;
  hallOfFame?: boolean;
}

/** popularity of one major cast member, 0..100 */
export interface FranchiseChar {
  role: "protag" | "secondary" | "pet" | "villain";
  id: string;
  name: string;
  popularity: number;
}

export interface Franchise {
  key: string;
  baseTitle: string;
  genres: GenreId[];
  animeType: AnimeType;
  /** archived labels from a pre-V2 franchise; display only */
  legacyGenres?: string[];
  audience: AudienceId;
  cast: FranchiseChar[];
  /** original release week */
  createdWeek: number;
  entries: FranchiseEntry[];
  /** highest season number shipped (the original counts as season 1) */
  season: number;
  totalRevenue: number;
  lifetimeFans: number;
  bestScore: number;
  lastScore: number;
  lastEntryWeek: number;
  /** current excitement 0..100 — drives revenue and merch */
  popularity: number;
  /** overexposure 0..100 — rises with each entry, recovers with rest */
  fatigue: number;
  /** estimated merchandise value, £ */
  merchValue: number;
  /** a devoted underground following found it years later */
  cult: boolean;
  /** merch product id → week it can be launched again */
  merchCooldown: Record<string, number>;
  /** parent IP if this line was spun off another */
  spunFrom?: string;
  /** legacy flag kept for older saves/UI */
  alive: boolean;
  /** external licensed property this franchise originated from; optional for old saves */
  licensedIpId?: string;
  /** irreversible sale of the original IP to an outside buyer */
  soldTo?: { id: string; name: string; kind: "network" | "rival"; week: number; price: number };
  /** permanent cultural prestige once an entry is named to the era's Big Three */
  bigThree?: boolean;
  /** promotion can temporarily hold attention rather than letting popularity cool */
  zeitgeistFreezeUntil?: number;
  /** per-campaign cooldowns; kept on the franchise because campaigns are IP-specific */
  campaignCooldown?: Record<string, number>;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const clampPct = (v: number) => clamp(Math.round(v), 0, 100);

const ZEITGEIST_EXPOSURE_CURVE: readonly [number, number][] = [
  [0, 0.92],
  [15, 1.00],
  [35, 1.08],
  [50, 1.00],
  [65, 0.88],
  [80, 0.68],
  [95, 0.42],
  [100, 0.30],
];

function curveValue(points: readonly [number, number][], x: number): number {
  const value = clamp(x, points[0][0], points[points.length - 1][0]);
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    if (value <= x2) {
      const t = x2 === x1 ? 0 : (value - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t;
    }
  }
  return points[points.length - 1][1];
}

/** Cultural relevance right now: high popularity is strongest when exposure is
 *  neither dormant nor exhausted. This is intentionally a bell-ish curve. */
export function zeitgeistOf(fr: Pick<Franchise, "popularity" | "fatigue">): number {
  return clampPct(fr.popularity * curveValue(ZEITGEIST_EXPOSURE_CURVE, fr.fatigue));
}

export function zeitgeistRevenueMult(fr: Pick<Franchise, "popularity" | "fatigue">): number {
  const z = zeitgeistOf(fr);
  if (z < 25) return 0.80;
  if (z < 50) return 0.95;
  if (z < 70) return 1.10;
  if (z < 85) return 1.25;
  return 1.40;
}

export function zeitgeistFanMult(fr: Pick<Franchise, "popularity" | "fatigue">): number {
  const z = zeitgeistOf(fr);
  if (z < 25) return 0.85;
  if (z < 50) return 0.95;
  if (z < 70) return 1.05;
  if (z < 85) return 1.15;
  return 1.25;
}

export function zeitgeistLabel(fr: Pick<Franchise, "popularity" | "fatigue">): string {
  const z = zeitgeistOf(fr);
  if (z >= 85) return "CULTURAL PHENOMENON";
  if (z >= 70) return "HOT";
  if (z >= 50) return "CURRENT";
  if (z >= 25) return "COOLING";
  return "OUT OF THE CONVERSATION";
}

/* ------------------------------------------------------------ derived stats */
export const countKind = (fr: Franchise, kind: EntryKind) =>
  fr.entries.filter((e) => e.kind === kind).length;
export const seasonsOf = (fr: Franchise) => countKind(fr, "original") + countKind(fr, "season") + countKind(fr, "reboot");
export const filmsOf = (fr: Franchise) => countKind(fr, "movie");
export const ovasOf = (fr: Franchise) => countKind(fr, "ova");
export const spinoffsOf = (fr: Franchise) => countKind(fr, "spinoff");

export const topCharacter = (fr: Franchise): FranchiseChar | null =>
  fr.cast.length ? [...fr.cast].sort((a, b) => b.popularity - a.popularity)[0] : null;

/** estimated merchandise value — fans buy what they love right now */
export function merchValueOf(fr: Franchise): number {
  const top = topCharacter(fr);
  /* Consumer products are now a real second business. Following, critical
     pedigree and proven franchise revenue all contribute to the addressable
     merchandise market; current zeitgeist determines how much converts now. */
  const base = fr.lifetimeFans * 1.8 + fr.bestScore * 16_000 + fr.totalRevenue * 0.025;
  const zeitgeistF = 0.55 + zeitgeistOf(fr) / 100;
  const charF = 1 + (top ? top.popularity : 0) / 300;
  const cultF = fr.cult ? 1.25 : 1;
  const bigThreeF = fr.bigThree ? 1.6 : 1;
  return Math.round((base * zeitgeistF * charF * cultF * bigThreeF) / 1_000) * 1_000;
}

/* ======================================================== continuations */
export interface ContinuationDef {
  kind: Exclude<EntryKind, "original">;
  label: string;
  desc: string;
  /** locks the draft's format (null = player's choice) */
  medium: MediumId | null;
  /** flat extra fee at greenlight (rights, remastering, lawyers) */
  fee: number;
  /** added to fatigue when the entry ships */
  fatigueAdd: number;
  /** how strongly fan expectations bind (1 = full weight) */
  expectMult: number;
  /** revenue appetite of this format */
  revMult: number;
  risk: string;
}

export const CONTINUATIONS: ContinuationDef[] = [
  {
    kind: "season",
    label: "New Season",
    desc: "The main story continues. Full expectations, full reward.",
    medium: "tv",
    fee: 0,
    fatigueAdd: 16,
    expectMult: 1,
    revMult: 1,
    risk: "Fans expect it to match the last entry.",
  },
  {
    kind: "movie",
    label: "Sequel Film",
    desc: "A theatrical event. Bigger spectacle, bigger stakes.",
    medium: "movie",
    fee: 40_000,
    fatigueAdd: 12,
    expectMult: 1.08,
    revMult: 1.45,
    risk: "Expectations run even higher than a season.",
  },
  {
    kind: "ova",
    label: "OVA Special",
    desc: "A bonus episode for the faithful. Cheap, low pressure.",
    medium: "ona",
    fee: 0,
    fatigueAdd: 5,
    expectMult: 0.7,
    revMult: 0.6,
    risk: "Modest earnings, but fans are forgiving.",
  },
  {
    kind: "side",
    label: "Side Story",
    desc: "A detour with the same cast. Room to experiment.",
    medium: null,
    fee: 0,
    fatigueAdd: 8,
    expectMult: 0.75,
    revMult: 0.85,
    risk: "Smaller audience than the main line.",
  },
  {
    kind: "prequel",
    label: "Prequel",
    desc: "How it all began. Lore pays, continuity bites.",
    medium: null,
    fee: 20_000,
    fatigueAdd: 10,
    expectMult: 0.9,
    revMult: 0.95,
    risk: "Continuity nitpicks — a weak prequel stings.",
  },
  {
    kind: "spinoff",
    label: "Spin-off",
    desc: "A popular character gets their own show — a brand-new IP.",
    medium: null,
    fee: 25_000,
    fatigueAdd: 6,
    expectMult: 0.65,
    revMult: 0.9,
    risk: "Lives or dies on the featured character's popularity.",
  },
  {
    kind: "reboot",
    label: "Reboot",
    desc: "Start over with today's craft. Resets fatigue, reignites interest.",
    medium: "tv",
    fee: 60_000,
    fatigueAdd: 0,
    expectMult: 0.8,
    revMult: 1.1,
    risk: "Expensive; purists compare it to the best entry ever.",
  },
  {
    kind: "crossover",
    label: "Crossover",
    desc: "Two of your IPs collide. Ruinously expensive, potentially enormous.",
    medium: null,
    fee: 120_000,
    fatigueAdd: 14,
    expectMult: 1,
    revMult: 1.6,
    risk: "Costs a fortune and tires BOTH franchises.",
  },
];

export const continuationDef = (kind: EntryKind): ContinuationDef | null =>
  CONTINUATIONS.find((c) => c.kind === kind) ?? null;

export const SEQUEL_SCORE_THRESHOLD = 32;

/** why a continuation can't be made right now (null = allowed) */
export function continuationBlock(
  fr: Franchise,
  kind: Exclude<EntryKind, "original">,
  opts: {
    week: number;
    franchiseCount: number;
    officeLevel: number;
    /** in-flight productions — used to stop the same next season being made twice */
    projects?: Project[];
  }
): string | null {
  if (fr.soldTo) return `IP sold to ${fr.soldTo.name} — your studio no longer controls new productions`;
  if (fr.lastScore < SEQUEL_SCORE_THRESHOLD && kind !== "spinoff" && kind !== "reboot") {
    return `Sequel rights require ${SEQUEL_SCORE_THRESHOLD}/40 on the latest entry (currently ${fr.lastScore}/40). Below that mark, only a spin-off or reboot can continue the IP.`;
  }
  if (kind === "season") {
    /* one next-season per franchise on the floor at a time: the previous
       season can be mid-broadcast without blocking anything, but two
       productions of the SAME season number would corrupt the timeline */
    const next = fr.season + 1;
    const dupe = (opts.projects ?? []).find(
      (p) =>
        p.stage !== "done" &&
        p.stage !== "airing" &&
        p.draft.franchiseKey === fr.key &&
        p.draft.continuation === "season" &&
        p.draft.season === next
    );
    if (dupe) return `Season ${next} is already in production (“${dupe.draft.title}”)`;
  }
  if (kind === "reboot" && fr.lastScore >= SEQUEL_SCORE_THRESHOLD) {
    if (fr.entries.length < 2) return "Needs at least 2 entries to reboot";
    if (fr.fatigue < 40 && opts.week - fr.lastEntryWeek < 96)
      return "Only worth it once the IP is tired (fatigue 40+) or long dormant (2+ years)";
  }
  if (kind === "spinoff") {
    const top = topCharacter(fr);
    if (!top || top.popularity < 45) return "Needs a character with 45+ popularity";
  }
  if (kind === "crossover") {
    if (opts.franchiseCount < 2) return "Needs a second franchise to cross over with";
    if (opts.officeLevel < 2) return "Needs a bigger studio (office level 2+)";
    if (fr.popularity < 35) return "This IP is too cold (popularity 35+ needed)";
  }
  return null;
}

/* -------------------------------------------------- revenue multiplier */
/** how much the market cares about this continuation right now.
 *  Popularity sells, fatigue repels, format sets the ceiling. */
export function franchiseBoost(fr: Franchise | null, d: Draft, partner?: Franchise | null): number {
  if (!fr || !d.continuation) {
    const base = d.franchiseKey ? 1 + 0.12 * Math.max(0, d.season - 1) : 1;
    return fr?.bigThree ? Math.round(base * 1.4 * 100) / 100 : base;
  }
  const def = continuationDef(d.continuation);
  if (!def) return 1;
  const seasonMult = d.continuation === "season" ? 1 + 0.12 * Math.max(0, d.season - 1) : 1;
  /* Zeitgeist replaces the old linear popularity/fatigue pair. It peaks when
     the property is both popular and visible without being exhausted. */
  let mult = seasonMult * zeitgeistRevenueMult(fr) * def.revMult;
  if (d.continuation === "spinoff") {
    const feat = fr.cast.find((c) => c.id === d.spinChar) ?? topCharacter(fr);
    mult *= 0.8 + (feat ? feat.popularity : 30) / 150;
  }
  if (d.continuation === "crossover" && partner) {
    mult *= 0.85 + (zeitgeistOf(fr) + zeitgeistOf(partner)) / 250;
  }
  const bounded = clamp(mult, 0.5, 3);
  const bigThreeHalo = fr.bigThree
    ? (d.continuation === "spinoff" || d.continuation === "crossover" ? 1.2 : 1.4)
    : 1;
  return Math.round(bounded * bigThreeHalo * 100) / 100;
}

/* ----------------------------------------------------- fan expectations */
/** what the fans expect this entry to score, /40 */
export function expectedScore(fr: Franchise, kind: EntryKind): number {
  const def = continuationDef(kind);
  const anchor = kind === "reboot" ? fr.bestScore : fr.lastScore * 0.6 + fr.bestScore * 0.4;
  return clamp(Math.round(anchor * (def?.expectMult ?? 1)), 8, 38);
}

export interface ExpectationVerdict {
  expected: number;
  gap: number;
  verdict: "delight" | "fine" | "disappointment";
  /** applied to this release's fan gain */
  fanMult: number;
  popDelta: number;
  fatigueExtra: number;
}

export function judgeExpectations(fr: Franchise, kind: EntryKind, total: number): ExpectationVerdict {
  const expected = expectedScore(fr, kind);
  const gap = total - expected;
  const cultureFans = zeitgeistFanMult(fr);
  if (gap >= 4)
    return { expected, gap, verdict: "delight", fanMult: (1.15 * cultureFans), popDelta: 10 + Math.min(8, gap - 4), fatigueExtra: 0 };
  if (gap > -4) return { expected, gap, verdict: "fine", fanMult: cultureFans, popDelta: 4, fatigueExtra: 0 };
  /* the higher they flew, the harder the fall */
  return {
    expected,
    gap,
    verdict: "disappointment",
    fanMult: Math.max(0.55, (1 + gap / 40) * cultureFans),
    popDelta: -Math.min(30, Math.round(-gap * 1.8)),
    fatigueExtra: 8,
  };
}

/* ------------------------------------------------------ record releases */
export interface CastSeed {
  protag: string;
  protagName: string;
  secondary: string;
  secondaryName: string;
  pet: string;
  petName: string;
  villain: string;
  villainName: string;
}

function seedCast(seed: CastSeed, total: number): FranchiseChar[] {
  const base = clampPct(18 + total * 1.3);
  const mk = (role: FranchiseChar["role"], id: string, name: string, offset: number): FranchiseChar => ({
    role,
    id,
    name,
    popularity: clampPct(base + offset + Math.floor(Math.random() * 9)),
  });
  return [
    mk("protag", seed.protag, seed.protagName, 8),
    mk("secondary", seed.secondary, seed.secondaryName, 2),
    mk("pet", seed.pet, seed.petName, -4),
    mk("villain", seed.villain, seed.villainName, 0),
  ].filter((c) => c.id && c.id !== "none");
}

/** create a brand-new IP from an original release */
export function createFranchise(
  key: string,
  d: Draft,
  seed: CastSeed,
  result: { total: number; revenue: number; fans: number; hallOfFame: boolean },
  week: number,
  spunFrom?: string
): Franchise {
  const fr: Franchise = {
    key,
    baseTitle: d.title,
    genres: [...d.genres],
    animeType: d.animeType,
    audience: d.audience,
    cast: seedCast(seed, result.total),
    createdWeek: week,
    entries: [
      {
        kind: "original",
        title: d.title,
        score: result.total,
        revenue: result.revenue,
        fans: result.fans,
        week,
        animeType: d.animeType,
        hallOfFame: result.hallOfFame,
      },
    ],
    season: 1,
    totalRevenue: result.revenue,
    lifetimeFans: result.fans,
    bestScore: result.total,
    lastScore: result.total,
    lastEntryWeek: week,
    popularity: clampPct(18 + result.total * 1.6 + (result.hallOfFame ? 10 : 0)),
    fatigue: 10,
    merchValue: 0,
    cult: false,
    merchCooldown: {},
    licensedIpId: d.licensedIpId,
    spunFrom,
    alive: result.hallOfFame,
  };
  fr.merchValue = merchValueOf(fr);
  return fr;
}

/** append a continuation to an existing IP; returns the verdict for notices */
export function recordContinuation(
  fr: Franchise,
  d: Draft,
  result: { total: number; revenue: number; fans: number; hallOfFame: boolean },
  week: number,
  opts?: { fatigueAdd?: number; fatigueMult?: number }
): { franchise: Franchise; verdict: ExpectationVerdict } {
  const kind = (d.continuation ?? "season") as EntryKind;
  const def = continuationDef(kind);
  const verdict = judgeExpectations(fr, kind, result.total);
  const fans = Math.round(result.fans * verdict.fanMult);

  const charDelta = verdict.verdict === "delight" ? 8 : verdict.verdict === "fine" ? 4 : -6;
  const latestBilling: Record<FranchiseChar["role"], { id: string; name?: string }> = {
    protag: { id: d.protag, name: d.protagName },
    secondary: { id: d.secondary, name: d.secondaryName },
    pet: { id: d.pet, name: d.petName },
    villain: { id: d.villain, name: d.villainName },
  };
  const cast = fr.cast.map((c) => {
    const billing = latestBilling[c.role];
    return {
      ...c,
      id: billing.id || c.id,
      name: billing.name?.trim() || c.name,
      popularity: clampPct(c.popularity + charDelta),
    };
  });

  let popularity = clampPct(fr.popularity + verdict.popDelta);
  let fatigue = clampPct(fr.fatigue + ((def?.fatigueAdd ?? 12) + verdict.fatigueExtra + (opts?.fatigueAdd ?? 0)) * (opts?.fatigueMult ?? 1));
  if (kind === "reboot") {
    fatigue = 12;
    popularity = clampPct(Math.max(popularity, 30 + result.total));
  }

  const next: Franchise = {
    ...fr,
    cast,
    entries: [
      ...fr.entries,
      {
        kind,
        title: d.title,
        score: result.total,
        revenue: result.revenue,
        fans,
        week,
        animeType: d.animeType,
        expected: verdict.expected,
        disappointment: verdict.verdict === "disappointment",
        hallOfFame: result.hallOfFame,
      },
    ],
    season: kind === "season" || kind === "reboot" ? Math.max(fr.season, d.season) : fr.season,
    totalRevenue: fr.totalRevenue + result.revenue,
    lifetimeFans: fr.lifetimeFans + fans,
    bestScore: Math.max(fr.bestScore, result.total),
    lastScore: result.total,
    lastEntryWeek: week,
    popularity,
    fatigue,
    alive: fr.alive || result.hallOfFame,
  };
  next.merchValue = merchValueOf(next);
  return { franchise: next, verdict };
}

/* --------------------------------------------------------- weekly drift */
export const CULT_CHANCE = 0.05;
export const CULT_MIN_REST = 24; // weeks dormant before a cult can form
export const CULT_MAX_SCORE = 26; // only overlooked shows get cults

/** called every 4 weeks: rest heals fatigue, hype cools, cults may form */
export function tickFranchise(
  fr: Franchise,
  week: number,
  opts?: { restMult?: number }
): { franchise: Franchise; notice: string | null } {
  const rested = week - fr.lastEntryWeek;
  let fatigue = Math.max(0, fr.fatigue - (rested > 8 ? 3 : 1) * (opts?.restMult ?? 1));
  let popularity = fr.popularity;
  const floor = fr.cult ? 45 : 12;
  const attentionHeld = (fr.zeitgeistFreezeUntil ?? 0) > week;
  if (!attentionHeld && popularity > floor) popularity -= 1;
  let cult = fr.cult;
  let notice: string | null = null;
  if (
    !cult &&
    week % 12 === 0 &&
    fr.bestScore <= CULT_MAX_SCORE &&
    rested >= CULT_MIN_REST &&
    Math.random() < CULT_CHANCE
  ) {
    cult = true;
    popularity = Math.max(popularity, 55);
    notice = `🕯️ “${fr.baseTitle}” has quietly grown a cult following — fans are begging for more.`;
  }
  const next = { ...fr, fatigue, popularity, cult };
  next.merchValue = merchValueOf(next);
  return { franchise: next, notice };
}

/* ------------------------------------------------ zeitgeist campaigns */
export interface FranchiseCampaign {
  id: string;
  label: string;
  cost: number;
  popularity: number;
  fatigue: number;
  freezeWeeks: number;
  cooldown: number;
  description: string;
}

export const FRANCHISE_CAMPAIGNS: FranchiseCampaign[] = [
  { id: "streaming_push", label: "Streaming Push", cost: 75_000, popularity: 6, fatigue: 9, freezeWeeks: 8, cooldown: 16, description: "Platform placement and rewatch promotion hold the title in conversation." },
  { id: "convention_circuit", label: "Convention Circuit", cost: 150_000, popularity: 10, fatigue: 14, freezeWeeks: 8, cooldown: 20, description: "Cast appearances and fan events create a visible burst of attention." },
  { id: "brand_blitz", label: "Merch / Brand Blitz", cost: 225_000, popularity: 12, fatigue: 17, freezeWeeks: 12, cooldown: 24, description: "Retail collaborations push the franchise everywhere at once." },
  { id: "anniversary", label: "Anniversary Campaign", cost: 350_000, popularity: 16, fatigue: 22, freezeWeeks: 16, cooldown: 48, description: "A major anniversary keeps an established property culturally present." },
  { id: "remaster", label: "Remaster / Re-release", cost: 600_000, popularity: 20, fatigue: 27, freezeWeeks: 16, cooldown: 60, description: "A restored re-release reaches old fans and a new audience." },
  { id: "saturation", label: "Cultural Saturation Campaign", cost: 1_200_000, popularity: 28, fatigue: 38, freezeWeeks: 20, cooldown: 72, description: "An enormous push can dominate attention now and leave the audience exhausted later." },
];

export function franchiseCampaignBlock(fr: Franchise, campaign: FranchiseCampaign, week: number, cash: number): string | null {
  if (fr.soldTo) return `IP sold to ${fr.soldTo.name}`;
  if (cash < campaign.cost) return "Not enough cash";
  const ready = fr.campaignCooldown?.[campaign.id] ?? 0;
  if (week < ready) return `Available again in ${ready - week} wk`;
  if (fr.fatigue >= 95) return "Audience burnout is too severe — rest or reboot the property";
  return null;
}

export function applyFranchiseCampaign(fr: Franchise, campaign: FranchiseCampaign, week: number): Franchise {
  const next: Franchise = {
    ...fr,
    popularity: clampPct(fr.popularity + campaign.popularity),
    fatigue: clampPct(fr.fatigue + campaign.fatigue),
    zeitgeistFreezeUntil: Math.max(fr.zeitgeistFreezeUntil ?? 0, week + campaign.freezeWeeks),
    campaignCooldown: { ...(fr.campaignCooldown ?? {}), [campaign.id]: week + campaign.cooldown },
  };
  next.merchValue = merchValueOf(next);
  return next;
}

/* -------------------------------------------------------- merchandising */
/** Research still establishes the Merch Division itself; individual SKUs are no longer separate studies. */
export const MERCH_CAPABILITY_RESEARCH = "merch";

export type MerchTier = 1 | 2 | 3 | 4;
export interface MerchTierDef {
  tier: MerchTier;
  id: string;
  name: string;
  cost: number;
  upkeep: number;
  description: string;
}
export const MERCH_TIERS: MerchTierDef[] = [
  { tier: 1, id: "merch_tier_1", name: "Domestic Merch", cost: 250_000, upkeep: 4_000, description: "Basic consumer products and direct-to-fan fulfilment." },
  { tier: 2, id: "merch_tier_2", name: "Premium Products", cost: 1_500_000, upkeep: 15_000, description: "Premium manufacturing, collectors' goods and specialist partners." },
  { tier: 3, id: "merch_tier_3", name: "Fan Ecosystem", cost: 8_000_000, upkeep: 45_000, description: "Trading cards, pop-up retail and event commerce." },
  { tier: 4, id: "merch_tier_4", name: "Global Consumer Products", cost: 35_000_000, upkeep: 120_000, description: "Worldwide licensing, mobile games and global premium ranges." },
];

export interface MerchProduct {
  id: string;
  label: string;
  desc: string;
  cost: number;
  weeks: number;
  mult: number;
  minPop: number;
  minScore: number;
  charDriven: boolean;
  tier: MerchTier;
  popularityGain?: number;
  fatigueAdd?: number;
  freezeWeeks?: number;
}

export const MERCH_PRODUCTS: MerchProduct[] = [
  { id: "ost", label: "Soundtrack", desc: "Physical/digital soundtrack campaign.", cost: 40_000, weeks: 16, mult: 0.55, minPop: 0, minScore: 0, charDriven: false, tier: 1 },
  { id: "plush", label: "Plushies", desc: "Character-led plush manufacturing run.", cost: 65_000, weeks: 20, mult: 0.80, minPop: 20, minScore: 0, charDriven: true, tier: 1 },
  { id: "acrylic", label: "Acrylics & Prints", desc: "Low-risk fan goods with fast turnaround.", cost: 50_000, weeks: 14, mult: 0.70, minPop: 15, minScore: 0, charDriven: true, tier: 1 },
  { id: "apparel", label: "Apparel Drop", desc: "Streetwear and character fashion collaboration.", cost: 90_000, weeks: 20, mult: 0.95, minPop: 35, minScore: 0, charDriven: false, tier: 1 },
  { id: "figures", label: "Scale Figures", desc: "Premium figure manufacturing and pre-orders.", cost: 250_000, weeks: 28, mult: 1.40, minPop: 35, minScore: 0, charDriven: true, tier: 2 },
  { id: "artbook", label: "Production Artbook", desc: "High-margin art and production archive.", cost: 180_000, weeks: 18, mult: 1.10, minPop: 30, minScore: 26, charDriven: false, tier: 2 },
  { id: "collectors", label: "Collector's Edition", desc: "Deluxe box set, extras and limited packaging.", cost: 350_000, weeks: 16, mult: 1.60, minPop: 45, minScore: 28, charDriven: false, tier: 2 },
  { id: "tcg", label: "Trading Card Game", desc: "Launch a collectible card ecosystem with organised play.", cost: 650_000, weeks: 36, mult: 3.40, minPop: 55, minScore: 28, charDriven: true, tier: 3, popularityGain: 8, fatigueAdd: 14, freezeWeeks: 12 },
  { id: "popup", label: "Pop-up Stores & Café", desc: "Temporary themed retail and event-exclusive goods.", cost: 500_000, weeks: 20, mult: 1.80, minPop: 50, minScore: 0, charDriven: true, tier: 3, popularityGain: 4, fatigueAdd: 8, freezeWeeks: 6 },
  { id: "mobile", label: "Mobile Game Licence", desc: "A high-risk, high-reach global mobile spin-off.", cost: 2_500_000, weeks: 48, mult: 4.20, minPop: 65, minScore: 30, charDriven: true, tier: 4, popularityGain: 6, fatigueAdd: 12, freezeWeeks: 8 },
  { id: "global_collection", label: "Worldwide Collector Range", desc: "Coordinated premium launch across major markets.", cost: 1_400_000, weeks: 32, mult: 2.80, minPop: 60, minScore: 32, charDriven: true, tier: 4, popularityGain: 5, fatigueAdd: 10, freezeWeeks: 8 },
];

export const MERCH_COOLDOWN = 40;

export const merchProductById = (id: string): MerchProduct | null =>
  MERCH_PRODUCTS.find((p) => p.id === id) ?? null;

export function merchBlock(fr: Franchise, product: MerchProduct, week: number, cash: number, tierOrLegacy: number | readonly string[] = 4): string | null {
  const tier = typeof tierOrLegacy === "number" ? tierOrLegacy : 4;
  if (fr.soldTo) return `IP sold to ${fr.soldTo.name} — merchandising rights left with the buyer`;
  if (tier < product.tier) return `Requires Merch Tier ${product.tier}: ${MERCH_TIERS[product.tier - 1].name}`;
  if (cash < product.cost) return "Not enough cash";
  if (fr.popularity < product.minPop) return `Needs popularity ${product.minPop}+ (now ${fr.popularity})`;
  if (fr.bestScore < product.minScore) return `Needs a ${product.minScore}+/40 entry on record`;
  const readyAt = fr.merchCooldown[product.id] ?? 0;
  if (week < readyAt) return `Line refreshes in ${readyAt - week} wk`;
  return null;
}

export function merchReturn(fr: Franchise, product: MerchProduct): number {
  const top = topCharacter(fr);
  const charF = product.charDriven ? 1 + (top ? top.popularity : 0) / 250 : 1;
  return Math.round((fr.merchValue * product.mult * charF) / 500) * 500;
}

/* ------------------------------------------------------------ migration */
interface LegacyFranchise {
  baseTitle?: string;
  season?: number;
  lastScore?: number;
  alive?: boolean;
}

/** upgrade a pre-library save's franchise record to a full IP profile */
export function migrateFranchise(key: string, raw: unknown, week: number): Franchise {
  const maybe = raw as Franchise & LegacyFranchise;
  if (Array.isArray(maybe.entries)) {
    /* already the new shape — just backfill anything missing */
    const fr: Franchise = {
      ...maybe,
      genres: migrateGenreList(maybe.genres),
      animeType: inferAnimeType(maybe.animeType, maybe.legacyGenres ?? maybe.genres, maybe.cast?.find((c) => c.role === "protag")?.id),
      legacyGenres: maybe.legacyGenres ?? (maybe.genres as unknown as string[]),
      entries: maybe.entries.map((entry) => ({ ...entry, animeType: entry.animeType ?? inferAnimeType(undefined, maybe.legacyGenres ?? maybe.genres, maybe.cast?.find((c) => c.role === "protag")?.id) })),
      merchCooldown: maybe.merchCooldown ?? {},
      cast: maybe.cast ?? [],
      cult: !!maybe.cult,
    };
    fr.merchValue = merchValueOf(fr);
    return fr;
  }
  const season = maybe.season ?? 1;
  const lastScore = maybe.lastScore ?? 20;
  const fr: Franchise = {
    key,
    baseTitle: maybe.baseTitle ?? key,
    genres: [],
    animeType: "shonen",
    legacyGenres: [],
    audience: "teens",
    cast: [],
    createdWeek: Math.max(0, week - 48 * season),
    entries: Array.from({ length: season }, (_, i) => ({
      kind: (i === 0 ? "original" : "season") as EntryKind,
      title: i === 0 ? maybe.baseTitle ?? key : `${maybe.baseTitle ?? key} S${i + 1}`,
      score: lastScore,
      revenue: 0,
      fans: 0,
      week: Math.max(0, week - 48 * (season - i)),
      animeType: "shonen",
    })),
    season,
    totalRevenue: 0,
    lifetimeFans: 0,
    bestScore: lastScore,
    lastScore,
    lastEntryWeek: week,
    popularity: clampPct(15 + lastScore * 1.5),
    fatigue: 20,
    merchValue: 0,
    cult: false,
    merchCooldown: {},
    alive: !!maybe.alive,
  };
  fr.merchValue = merchValueOf(fr);
  return fr;
}
