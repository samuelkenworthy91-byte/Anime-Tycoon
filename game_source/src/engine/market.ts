import {
  GENRES,
  type AudienceId,
  type AnimeType,
  type Draft,
  type GenreId,
  type MediumId,
  type RivalShow,
} from "./data";

/* ====================================================================
   THE ANIME MARKET — trends, saturation, commissioners and deals.

   Review scores stay purely quality-driven: a brilliant show in an
   unfashionable genre still reviews brilliantly. The market only moves
   the MONEY — booming genres sell better, flooded ones sell worse, and
   a commission trades revenue share for guaranteed funding.
   ==================================================================== */

/* ------------------------------------------------------------- trends */
/** heat −2..+2 → oversaturated / declining / normal / healthy / booming */
export type Heat = -2 | -1 | 0 | 1 | 2;

export interface MarketState {
  genres: Record<GenreId, number>;
  audiences: Record<AudienceId, number>;
  mediums: Record<MediumId, number>;
}

export const HEAT_LABEL = ["OVERSATURATED", "DECLINING", "NORMAL", "HEALTHY", "BOOMING"];
export const HEAT_COLOR = ["#ff5e5e", "#ff9d5e", "#8b8fa3", "#5ef0c0", "#ffd166"];
/** revenue multiplier per effective heat level (index heat+2) */
export const GENRE_HEAT_MULT = [0.72, 0.87, 1.0, 1.12, 1.25];
export const SIDE_HEAT_MULT = [0.92, 1.0, 1.08]; // audiences & mediums, −1/0/+1

const GENRE_IDS = GENRES.map((g) => g.id);
const AUDIENCE_IDS: AudienceId[] = ["kids", "teens", "adults", "family"];
const MEDIUM_IDS: MediumId[] = ["tv", "ona", "movie"];

const clampHeat = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** a fresh market: mostly normal, a couple of things hot or cold */
export function initMarket(): MarketState {
  const genres = {} as Record<GenreId, number>;
  GENRE_IDS.forEach((g) => (genres[g] = 0));
  /* two random risers, two random fallers */
  const shuffled = [...GENRE_IDS].sort(() => Math.random() - 0.5);
  genres[shuffled[0]] = 2;
  genres[shuffled[1]] = 1;
  genres[shuffled[2]] = -1;
  genres[shuffled[3]] = -2;
  const audiences = {} as Record<AudienceId, number>;
  AUDIENCE_IDS.forEach((a) => (audiences[a] = 0));
  audiences[AUDIENCE_IDS[Math.floor(Math.random() * AUDIENCE_IDS.length)]] = 1;
  const mediums = {} as Record<MediumId, number>;
  MEDIUM_IDS.forEach((m) => (mediums[m] = 0));
  return { genres, audiences, mediums };
}

/** one seasonal drift: gradual steps with the occasional surprise swing */
export function driftMarket(m: MarketState): { market: MarketState; notices: string[] } {
  const notices: string[] = [];
  const genres = { ...m.genres };
  for (const g of GENRE_IDS) {
    const roll = Math.random();
    let d = 0;
    if (roll < 0.22) d = 1;
    else if (roll < 0.44) d = -1;
    else if (roll < 0.48) d = 2; // surprise boom
    else if (roll < 0.52) d = -2; // surprise crash
    if (d === 0) continue;
    const before = genres[g] ?? 0;
    const after = clampHeat(before + d, -2, 2);
    genres[g] = after;
    const label = GENRES.find((x) => x.id === g)?.label ?? g;
    if (after === 2 && before < 2) notices.push(`📈 ${label} is BOOMING this season.`);
    if (after === -2 && before > -2) notices.push(`📉 The ${label} bubble bursts — the market is oversaturated.`);
  }
  const audiences = { ...m.audiences };
  for (const a of AUDIENCE_IDS) {
    const roll = Math.random();
    if (roll < 0.25) audiences[a] = clampHeat((audiences[a] ?? 0) + 1, -1, 1);
    else if (roll < 0.5) audiences[a] = clampHeat((audiences[a] ?? 0) - 1, -1, 1);
  }
  const mediums = { ...m.mediums };
  for (const md of MEDIUM_IDS) {
    const roll = Math.random();
    if (roll < 0.22) mediums[md] = clampHeat((mediums[md] ?? 0) + 1, -1, 1);
    else if (roll < 0.44) mediums[md] = clampHeat((mediums[md] ?? 0) - 1, -1, 1);
  }
  return { market: { genres, audiences, mediums }, notices };
}

/* --------------------------------------------------------- saturation */
export interface ReleaseRecord {
  genre: GenreId;
  week: number;
  /** player releases weigh double */
  weight: number;
}
export const SATURATION_WINDOW = 36; // weeks a release keeps flooding its genre

export const pruneReleases = (recs: ReleaseRecord[], week: number): ReleaseRecord[] =>
  recs.filter((x) => week - x.week <= SATURATION_WINDOW);

export function saturationOf(recs: ReleaseRecord[], genre: GenreId, week: number): number {
  return pruneReleases(recs, week)
    .filter((x) => x.genre === genre)
    .reduce((a, x) => a + x.weight, 0);
}

/** how many heat steps the flooding knocks off: 4+ weight = 1, 8+ = 2 */
export const saturationPenalty = (sat: number) => (sat >= 8 ? 2 : sat >= 4 ? 1 : 0);

/** trend heat minus flooding — what the label & multiplier actually use */
export function effectiveHeat(m: MarketState, recs: ReleaseRecord[], genre: GenreId, week: number): Heat {
  return clampHeat((m.genres[genre] ?? 0) - saturationPenalty(saturationOf(recs, genre, week)), -2, 2) as Heat;
}

/* ------------------------------------------------- the money multiplier */
/** market demand multiplier for a draft (revenue only, never reviews) */
export function marketMult(m: MarketState, recs: ReleaseRecord[], d: Draft, week: number): number {
  const gm =
    d.genres.length === 0
      ? 1
      : d.genres.reduce((a, g) => a + GENRE_HEAT_MULT[effectiveHeat(m, recs, g, week) + 2], 0) / d.genres.length;
  const am = SIDE_HEAT_MULT[clampHeat(m.audiences[d.audience] ?? 0, -1, 1) + 1];
  const mm = SIDE_HEAT_MULT[clampHeat(m.mediums[d.medium] ?? 0, -1, 1) + 1];
  return Math.max(0.6, Math.min(1.5, gm * am * mm));
}

/** each extra show you have on air splits the audience's attention */
export const attentionMult = (airingCount: number) => Math.max(0.8, 1 - 0.07 * airingCount);

/* --------------------------------------------------------- distributors */
export interface Partner {
  id: string;
  name: string;
  style: string;
  color: string;
  blurb: string;
  likesGenres: GenreId[];
  likesAudiences: AudienceId[];
  mediums: MediumId[];
  /** scale of the money involved */
  size: number; // advance multiplier
  /** their default cut of revenue (0..1) */
  baseShare: number;
  /** how demanding their quality bar is */
  fussiness: number; // added to minQuality
  /** deadline generosity in weeks beyond the plan */
  slack: number;
}

export const PARTNERS: Partner[] = [
  {
    id: "ntv8",
    name: "NTV-8",
    style: "Major TV network",
    color: "#3be1ff",
    blurb: "Prime-time money, prime-time expectations.",
    likesGenres: ["sports", "mecha", "comedy", "martial", "pirate"],
    likesAudiences: ["teens", "family"],
    mediums: ["tv"],
    size: 1.35,
    baseShare: 0.55,
    fussiness: 2,
    slack: 4,
  },
  {
    id: "zero",
    name: "Channel Zero",
    style: "Prestige late-night",
    color: "#a78bfa",
    blurb: "Small audience, immaculate taste.",
    likesGenres: ["survival", "mystery", "horror", "supernatural", "cyber"],
    likesAudiences: ["adults"],
    mediums: ["tv", "ona"],
    size: 0.8,
    baseShare: 0.4,
    fussiness: 6,
    slack: 6,
  },
  {
    id: "sunny",
    name: "SunnyKids",
    style: "Family broadcaster",
    color: "#ffd166",
    blurb: "Wholesome hits and merchandising empires.",
    likesGenres: ["magical", "cooking", "comedy", "sports", "idol"],
    likesAudiences: ["kids", "family"],
    mediums: ["tv"],
    size: 1.0,
    baseShare: 0.5,
    fussiness: 0,
    slack: 5,
  },
  {
    id: "streamline",
    name: "Streamline",
    style: "Global streamer",
    color: "#ff4d8d",
    blurb: "Day-one worldwide. The algorithm is hungry.",
    likesGenres: ["isekai", "fantasy", "cyber", "space", "horror"],
    likesAudiences: ["teens", "adults"],
    mediums: ["ona", "tv"],
    size: 1.6,
    baseShare: 0.6,
    fussiness: 3,
    slack: 2,
  },
  {
    id: "otakumax",
    name: "OtakuMax",
    style: "Niche anime service",
    color: "#5ef0c0",
    blurb: "Three hundred thousand subscribers who watch everything twice.",
    likesGenres: ["mecha", "idol", "isekai", "slice", "magical", "mystery"],
    likesAudiences: ["adults", "teens"],
    mediums: ["ona"],
    size: 0.65,
    baseShare: 0.35,
    fussiness: 0,
    slack: 7,
  },
  {
    id: "silverscope",
    name: "Silverscope",
    style: "Theatrical distributor",
    color: "#f0b95e",
    blurb: "Red carpets or nothing.",
    likesGenres: ["fantasy", "romance", "space", "supernatural"],
    likesAudiences: ["family", "adults"],
    mediums: ["movie"],
    size: 2.1,
    baseShare: 0.5,
    fussiness: 8,
    slack: 5,
  },
];

export const partnerById = (id: string): Partner => PARTNERS.find((p) => p.id === id)!;

/** reputation → deal sweetener. 45 is neutral. */
export const repAdvanceMult = (rep: number) => 1 + Math.max(-0.2, Math.min(0.3, (rep - 45) / 150));
export const repShareDelta = (rep: number) => Math.max(-0.08, Math.min(0.06, (45 - rep) / 400));

export type PartnerTierId = "unknown" | "trusted" | "preferred" | "strategic";
export interface PartnerTier { id: PartnerTierId; label: string; slack: number; desc: string; }
export function partnerTier(rep: number): PartnerTier {
  if (rep < 40) return { id: "unknown", label: "UNKNOWN", slack: 0, desc: "They will hear the pitch, but nothing is guaranteed." };
  if (rep < 60) return { id: "trusted", label: "TRUSTED", slack: 0, desc: "Regular calls and fair terms." };
  if (rep < 80) return { id: "preferred", label: "PREFERRED", slack: 1, desc: "Extra deadline flexibility and stronger deal flow." };
  return { id: "strategic", label: "STRATEGIC PARTNER", slack: 2, desc: "They plan around your studio and protect your delivery windows." };
}

/* ---------------------------------------------------------- commissions */
export interface Commission {
  id: string;
  partnerId: string;
  genre: GenreId;
  audience: AudienceId;
  medium: MediumId;
  /** a disclosed creative preference, not a binding acceptance condition */
  preferredAnimeType?: AnimeType;
  /** cash paid the moment production starts */
  advance: number;
  /** the partner's cut of release revenue, 0..1 */
  share: number;
  /** minimum review score (out of 40) they expect */
  minQuality: number;
  /** paid on release if score ≥ minQuality + 6 */
  bonus: number;
  /** weeks from greenlight to the contracted delivery date */
  maxWeeks: number;
  expiresWeek: number;
  restriction: string;
  negotiated?: boolean;
  emergency?: boolean;
  /** manga adaptations start with a built-in fanbase */
  hypeBonus?: number;
}

let commissionSeq = 0;

export function rollCommission(
  week: number,
  partners: Record<string, number>,
  market: MarketState
): Commission {
  /* partners you have burned stop calling */
  const pool = PARTNERS.filter((p) => (partners[p.id] ?? 45) >= 25);
  const partner = (pool.length ? pool : PARTNERS)[Math.floor(Math.random() * (pool.length || PARTNERS.length))];
  const rep = partners[partner.id] ?? 45;
  const tier = partnerTier(rep);

  /* they mostly want what they like — with a bias toward whatever is hot */
  const hot = partner.likesGenres.filter((g) => (market.genres[g] ?? 0) >= 1);
  const genre = (hot.length && Math.random() < 0.55 ? hot : partner.likesGenres)[
    Math.floor(Math.random() * (hot.length && Math.random() < 0.55 ? hot.length : partner.likesGenres.length))
  ] ?? partner.likesGenres[0];
  const audience = partner.likesAudiences[Math.floor(Math.random() * partner.likesAudiences.length)];
  const medium = partner.mediums[Math.floor(Math.random() * partner.mediums.length)];
  const preferredAnimeType = Math.random() < 0.5 ? (Math.random() < 0.5 ? "shonen" : "shojo") : undefined;

  const baseAdvance = medium === "movie" ? 420_000 : medium === "tv" ? 220_000 : 150_000;
  const advance =
    Math.round((baseAdvance * partner.size * repAdvanceMult(rep) * (0.85 + Math.random() * 0.3)) / 5_000) * 5_000;
  const share = Math.round((partner.baseShare + repShareDelta(rep) + (Math.random() * 0.06 - 0.03)) * 100) / 100;
  const minQuality = Math.max(14, Math.min(30, 16 + partner.fussiness + Math.floor(Math.random() * 5)));
  const planWeeks = medium === "movie" ? 19 : medium === "tv" ? 15 : 12; // typical pipeline length
  const maxWeeks = planWeeks + partner.slack + tier.slack + Math.floor(Math.random() * 3) - 1;

  return {
    id: `com${++commissionSeq}_${week}`,
    partnerId: partner.id,
    genre,
    audience,
    medium,
    preferredAnimeType,
    advance,
    share,
    minQuality,
    bonus: Math.round((advance * 0.25) / 5_000) * 5_000,
    maxWeeks,
    expiresWeek: week + 10,
    restriction: `Must star the ${audience} audience · ${medium.toUpperCase()} only · ${GENRES.find((g) => g.id === genre)?.label ?? genre} required${preferredAnimeType ? ` · ${preferredAnimeType.toUpperCase()} preferred` : ""}`,
  };
}

/* ------------------------------------------------------- market events */
export type MarketEventKind =
  | "emergency"
  | "bidding"
  | "adaptation"
  | "overseas"
  | "sponsor"
  | "gamelicence"
  | "collab";

export interface MarketEvent {
  id: string;
  kind: MarketEventKind;
  week: number;
  expiresWeek: number;
  /** headline + concrete terms, rendered verbatim */
  text: string;
  accept: string;
  decline: string;
  amount: number;
  partnerId?: string;
  projectId?: string;
  /** franchise-targeted offers (game licences, collab campaigns) */
  franchiseKey?: string;
}

let eventSeq = 0;

export function rollMarketEvent(
  week: number,
  _partners: Record<string, number>,
  readyProjectId: string | null,
  lateStageProjectId: string | null,
  topFranchise?: { key: string; title: string; popularity: number } | null
): MarketEvent | null {
  const kinds: MarketEventKind[] = ["emergency", "adaptation", "overseas"];
  if (readyProjectId) kinds.push("bidding");
  if (lateStageProjectId) kinds.push("sponsor");
  if (topFranchise) kinds.push("gamelicence", "collab");
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const id = `mev${++eventSeq}_${week}`;

  switch (kind) {
    case "emergency": {
      const p = PARTNERS.filter((x) => x.id !== "silverscope")[Math.floor(Math.random() * 5)];
      return {
        id,
        kind,
        week,
        expiresWeek: week + 4,
        partnerId: p.id,
        amount: 0,
        text: `${p.name} has an emergency slot: a show fell through. They will pay over the odds for a fast turnaround.`,
        accept: "TAKE THE SLOT (fat advance, brutal deadline)",
        decline: "PASS",
      };
    }
    case "bidding":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        projectId: readyProjectId!,
        amount: 180_000,
        text: "Two streamers are in a bidding war over your finished master. £180,000 cash now — but the winner takes 50% of its revenue.",
        accept: "SELL THE EXCLUSIVE (+£180,000, −50% revenue)",
        decline: "KEEP FULL RIGHTS",
      };
    case "adaptation":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 5,
        amount: 0,
        text: "A manga publisher wants an adaptation studio for a hit series. Big advance, built-in fanbase — their editors watch everything.",
        accept: "PITCH FOR IT (adaptation commission)",
        decline: "DECLINE",
      };
    case "overseas":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 5,
        amount: 40_000,
        text: "An overseas distributor offers a 24-week licensing deal: £40,000 fee, +15% revenue on everything you release while it runs.",
        accept: "SIGN (−£40,000, +15% revenue for 24 wk)",
        decline: "DECLINE",
      };
    case "sponsor":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        projectId: lateStageProjectId!,
        amount: 60_000,
        text: "A sponsor offers £60,000 if you re-edit your upcoming show to be family friendly. Marketing hates it; accounting loves it.",
        accept: "TAKE THE MONEY (+£60,000, −8 hype, +2 issues)",
        decline: "PROTECT THE CUT",
      };
    case "gamelicence": {
      const amount = Math.round((60_000 + topFranchise!.popularity * 2_200) / 5_000) * 5_000;
      return {
        id,
        kind,
        week,
        expiresWeek: week + 5,
        franchiseKey: topFranchise!.key,
        amount,
        text: `A games publisher wants to license “${topFranchise!.title}” for a video game. £${amount.toLocaleString("en-GB")} up front — but a mediocre tie-in wears the brand out a little.`,
        accept: `LICENSE IT (+£${amount.toLocaleString("en-GB")}, +4 popularity, +8 fatigue)`,
        decline: "PROTECT THE BRAND",
      };
    }
    case "collab": {
      const amount = Math.round((30_000 + topFranchise!.popularity * 1_400) / 5_000) * 5_000;
      return {
        id,
        kind,
        week,
        expiresWeek: week + 4,
        franchiseKey: topFranchise!.key,
        amount,
        text: `A snack brand proposes a collaboration campaign with “${topFranchise!.title}” — limited packaging, TV spots, a themed café. £${amount.toLocaleString("en-GB")} plus a wave of attention.`,
        accept: `RUN THE CAMPAIGN (+£${amount.toLocaleString("en-GB")}, +8 popularity, +6 fatigue)`,
        decline: "PASS",
      };
    }
  }
}

/** the emergency-slot commission an accepted emergency event creates */
export function emergencyCommission(week: number, partnerId: string, partners: Record<string, number>, market: MarketState): Commission {
  const base = rollCommission(week, partners, market);
  const partner = partnerById(partnerId);
  const planWeeks = base.medium === "movie" ? 19 : base.medium === "tv" ? 15 : 12;
  return {
    ...base,
    id: `com${++commissionSeq}_${week}e`,
    partnerId,
    medium: partner.mediums[0],
    advance: Math.round((base.advance * 1.6) / 5_000) * 5_000,
    maxWeeks: planWeeks - 1, // one week LESS than a comfortable plan
    expiresWeek: week + 4,
    emergency: true,
    restriction: `EMERGENCY SLOT · deliver in ${planWeeks - 1} weeks or burn the bridge`,
  };
}

/** the manga-adaptation commission an accepted adaptation event creates */
export function adaptationCommission(week: number, partners: Record<string, number>, market: MarketState): Commission {
  const base = rollCommission(week, partners, market);
  return {
    ...base,
    id: `com${++commissionSeq}_${week}a`,
    advance: Math.round((base.advance * 1.3) / 5_000) * 5_000,
    minQuality: base.minQuality + 3,
    hypeBonus: 10,
    restriction: `Manga adaptation — starts with +10 hype · editors demand ${base.minQuality + 3}/40 minimum`,
  };
}

/* ----------------------------------------------------------- reputation */
export const REP_START = 45;
export const REP_DELIVERED = 8; // met the quality bar
export const REP_EXCELLENT = 4; // extra, beat it by 6+
export const REP_MISSED_QUALITY = -10;
export const REP_LATE = -8;

export function repLabel(rep: number): string {
  if (rep >= 80) return "beloved";
  if (rep >= 60) return "trusted";
  if (rep >= 40) return "neutral";
  if (rep >= 25) return "strained";
  return "burned";
}

/* ---------------------------------------------------------- negotiation */
/** one shot per offer: push the advance or the share. Success scales with rep. */
export const negotiationChance = (rep: number) => Math.min(0.8, 0.25 + rep / 150);
export const NEGOTIATE_ADVANCE_MULT = 1.25;
export const NEGOTIATE_SHARE_DELTA = -0.08;

/* ----------------------------------------------------- rival saturation */
export function rivalPremieres(rivals: RivalShow[], week: number): ReleaseRecord[] {
  return rivals
    .filter((r) => r.week === week && r.genre)
    .map((r) => ({ genre: r.genre!, week, weight: 1 }));
}
