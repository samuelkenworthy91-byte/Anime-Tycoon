/* ============================================================================
 *  THE LONDON ANIME AWARDS — ceremony engine
 *
 *  Once per 48-week industry year the whole calendar stops and the year's
 *  releases (player + every persistent rival studio) are judged across seven
 *  headline categories. This module is the pure, testable half:
 *
 *   AwardNominee      — one eligible show with every metric judging needs
 *   AWARD_CATEGORIES  — the seven category definitions, payouts + intent
 *   buildCeremony()   — deterministic nominee selection, winners, prizes
 *   rivalCraftFor()   — bounded persona-influenced craft strengths for a
 *                       rival production (writing / animation / soundtrack)
 *   playerCraftFor()  — craft strengths derived from REAL production data
 *
 *  Determinism: winners are picked by metric with stable, spelled-out
 *  tie-breakers — never by dice. Ties resolve by (1) overall score,
 *  (2) audience, (3) title, so the same slate always gives the same show.
 * ========================================================================== */
import type { AnimeType, Draft, GenreId } from "./data";
import type { RivalRelease } from "./rivals";

/* ----------------------------------------------------------------- types */

/** everything a category judge needs to know about one released show */
export interface AwardNominee {
  title: string;
  studio: string;
  /** true for the player's own production */
  player: boolean;
  animeType: AnimeType;
  genres: GenreId[];
  /** critic total /40 */
  score: number;
  /** bounded craft strengths on the same ~0.55×..1.9× score scale */
  story: number;
  art: number;
  sound: number;
  /** audience / fandom / reach (fans earned by the broadcast) */
  audience: number;
  /** stable production identity — prevents one release appearing twice in the same category */
  sourceId?: string | null;
  /** key art identity — rival poster manifest id for rivals */
  posterId?: string | null;
  /** frozen production identity used to reproduce the player show's exact official key visual */
  draft?: Draft | null;
  /** lead id retained for legacy saves / safe fallback poster rendering */
  protag?: string | null;
}

export type AwardCategoryId = "aoty" | "shonen" | "shojo" | "writing" | "animation" | "score" | "fanfav";

export interface AwardCategoryDef {
  id: AwardCategoryId;
  name: string;
  blurb: string;
  /** prestige tier: 3 = AOTY, 2 = Best Shonen/Shojo, 1 = craft + fan */
  tier: 1 | 2 | 3;
  cash: number;
  fans: number;
  eligible(n: AwardNominee): boolean;
  /** primary judging metric — highest wins */
  metric(n: AwardNominee): number;
  /** the metric label shown on nominee cards where tasteful */
  metricLabel?: (n: AwardNominee) => string | null;
}

export interface AwardCategory {
  id: AwardCategoryId;
  name: string;
  blurb: string;
  tier: 1 | 2 | 3;
  payout: { cash: number; fans: number };
  nominees: AwardNominee[];
  winner: AwardNominee;
}

export interface AwardCeremony {
  year: number;
  categories: AwardCategory[];
  playerAwards: number;
  /** the aggregated prize applied ONCE (never the old flat £25k×N) */
  playerCash: number;
  playerFans: number;
  /** order the ceremony presents categories in — Anime of the Year last */
  presentation: AwardCategoryId[];
  /** just the player's wins, for the summary board */
  playerWins: { category: AwardCategoryId; name: string; title: string; cash: number; fans: number }[];
}

/* ------------------------------------------------------- craft strengths */

const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** small deterministic hash — stable craft jitter per production */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** craft strength from an overall quality and a 0..1 craft share.
 *  share 1/3 (even) → 1.45× factor; share ≥ 1/2 (focused) → 1.9×;
 *  share → 0 (absent) → 0.55×. A masterpiece's weakest craft still outguns
 *  a flop's strongest, while craft FOCUS differentiates equals. */
const craftFromShare = (score: number, share: number) =>
  clampNum(score * (0.55 + 0.9 * clampNum(share * 3, 0, 1.5)), 1, 80);

/**
 * The player's REAL production output drives craft: each discipline's share
 * of the live development-point mix, scaled by the critic total. No invented
 * numbers — this is the actual Story/Art/Sound work the studio shipped.
 */
export function playerCraftFor(
  score: number,
  points: { story: number; art: number; sound: number }
): { story: number; art: number; sound: number } {
  const total = points.story + points.art + points.sound;
  const share = (v: number) => (total > 0 ? v / total : 1 / 3);
  return {
    story: Math.round(craftFromShare(score, share(points.story)) * 10) / 10,
    art: Math.round(craftFromShare(score, share(points.art)) * 10) / 10,
    sound: Math.round(craftFromShare(score, share(points.sound)) * 10) / 10,
  };
}

/** persona craft lean — a technically focused studio trends to animation, a
 *  prestige house to writing, an idol house to soundtrack. Row sums differ
 *  on purpose: overall score stays the anchor, lean picks the SHAPE. */
export const PERSONA_CRAFT_LEAN: Record<string, [number, number, number]> = {
  blockbuster: [0.9, 1.3, 1.1],
  technical: [0.8, 1.55, 0.9],
  experimental: [1.25, 1.2, 0.85],
  prestige: [1.5, 0.95, 0.9],
  volume: [0.95, 0.85, 1.0],
  idol: [0.85, 0.9, 1.5],
};

/**
 * Bounded craft strengths for a rival production — persona-shaped, with a
 * small deterministic jitter per production (never just score × 3 copies).
 */
export function rivalCraftFor(
  persona: string,
  score: number,
  productionId: string
): { story: number; art: number; sound: number } {
  const lean = PERSONA_CRAFT_LEAN[persona] ?? [1, 1, 1];
  const h = hashStr(productionId);
  const jitter = (i: number) => 0.92 + (((h >>> (i * 7)) & 0x3f) / 63) * 0.16; // ±8%
  const sum = lean[0] + lean[1] + lean[2];
  return {
    story: Math.round(craftFromShare(score, (lean[0] / sum) * jitter(3)) * 10) / 10,
    art: Math.round(craftFromShare(score, (lean[1] / sum) * jitter(5)) * 10) / 10,
    sound: Math.round(craftFromShare(score, (lean[2] / sum) * jitter(9)) * 10) / 10,
  };
}

/* ------------------------------------------------------------- nominees */

/** a rival release becomes a full awards nominee (release carries its own
 *  craft strengths, locked at greenlight — never re-rolled) */
export function rivalNominee(r: RivalRelease): AwardNominee {
  return {
    title: r.title,
    studio: r.studio,
    player: false,
    animeType: r.animeType,
    genres: [...r.genres],
    score: r.score,
    story: r.craft.story,
    art: r.craft.art,
    sound: r.craft.sound,
    audience: r.fans,
    sourceId: `${r.studioId}:${r.week}:${r.title}`,
    posterId: r.posterId ?? null,
    draft: null,
    protag: null,
  };
}

/* ----------------------------------------------------------- categories */

const fansShort = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}k` : `${Math.round(v)}`);

export const AWARD_CATEGORIES: AwardCategoryDef[] = [
  {
    id: "aoty",
    name: "Anime of the Year",
    blurb: "The show that defined the year. The industry's highest honour.",
    tier: 3,
    cash: 20_000,
    fans: 1_500,
    eligible: () => true,
    metric: (n) => n.score,
    metricLabel: (n) => `${n.score}/40`,
  },
  {
    id: "shonen",
    name: "Best Shonen",
    blurb: "The finest shonen production of the year.",
    tier: 2,
    cash: 12_500,
    fans: 750,
    eligible: (n) => n.animeType === "shonen",
    metric: (n) => n.score,
    metricLabel: (n) => `${n.score}/40`,
  },
  {
    id: "shojo",
    name: "Best Shojo",
    blurb: "The finest shojo production of the year.",
    tier: 2,
    cash: 12_500,
    fans: 750,
    eligible: (n) => n.animeType === "shojo",
    metric: (n) => n.score,
    metricLabel: (n) => `${n.score}/40`,
  },
  {
    id: "writing",
    name: "Best Writing",
    blurb: "Story craft: structure, character, dialogue and pay-off.",
    tier: 1,
    cash: 5_000,
    fans: 250,
    eligible: () => true,
    metric: (n) => n.story,
    metricLabel: (n) => `Writing ${Math.round(n.story)}`,
  },
  {
    id: "animation",
    name: "Best Animation",
    blurb: "Visual craft: art direction, sakuga, consistency and polish.",
    tier: 1,
    cash: 5_000,
    fans: 250,
    eligible: () => true,
    metric: (n) => n.art,
    metricLabel: (n) => `Animation ${Math.round(n.art)}`,
  },
  {
    id: "score",
    name: "Best Original Score",
    blurb: "Music: composition, sound design, voice and theme.",
    tier: 1,
    cash: 5_000,
    fans: 250,
    eligible: () => true,
    metric: (n) => n.sound,
    metricLabel: (n) => `Score ${Math.round(n.sound)}`,
  },
  {
    id: "fanfav",
    name: "Fan Favourite",
    blurb: "Audience, fandom and reach — the crowd's own award.",
    tier: 1,
    cash: 5_000,
    fans: 1_000,
    eligible: () => true,
    metric: (n) => n.audience,
    metricLabel: (n) => `${fansShort(n.audience)} fans`,
  },
];

export const awardCategoryById = (id: AwardCategoryId): AwardCategoryDef =>
  AWARD_CATEGORIES.find((c) => c.id === id)!;

/** the ceremony's running order: craft awards first, genre tops next,
 *  Anime of the Year alone at the climax. */
export const PRESENTATION_ORDER: AwardCategoryId[] = [
  "writing",
  "animation",
  "score",
  "fanfav",
  "shonen",
  "shojo",
  "aoty",
];

/* -------------------------------------------------------------- judging */

/** stable, deterministic ordering for one category:
 *  1. primary metric   2. overall score   3. audience   4. title (a-z)
 *  Winner = first. No dice anywhere. */
function rankFor(def: AwardCategoryDef, pool: AwardNominee[]): AwardNominee[] {
  return [...pool].sort((a, b) => {
    const m = def.metric(b) - def.metric(a);
    if (m !== 0) return m;
    if (b.score !== a.score) return b.score - a.score;
    if (b.audience !== a.audience) return b.audience - a.audience;
    return a.title.localeCompare(b.title);
  });
}

const NOMINEES_PER_CATEGORY = 4;

/**
 * Judge a full awards year. `shows` = the year's eligible slate (player
 * shows already in nominee shape + rival nominees). Every category ranks
 * the same independent slate — a show CAN be nominated in several
 * categories and can win several awards, exactly like a real awards night.
 */
export function awardNomineeKey(n: AwardNominee): string {
  const source = n.sourceId?.trim();
  if (source) return source;
  return `${n.player ? "player" : "rival"}|${n.studio.trim().toLowerCase()}|${n.title.trim().toLowerCase()}`;
}

/** Old saves and edge-case simulation paths can hand the ceremony the same
 * release more than once. Collapse those duplicates before any category is
 * ranked so a production can never occupy two nominee slots in one award. */
export function dedupeAwardSlate(shows: AwardNominee[]): AwardNominee[] {
  const seen = new Set<string>();
  return shows.filter((show) => {
    const key = awardNomineeKey(show);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildCeremony(year: number, shows: AwardNominee[]): AwardCeremony {
  const uniqueShows = dedupeAwardSlate(shows);
  const categories: AwardCategory[] = [];
  for (const def of AWARD_CATEGORIES) {
    const pool = uniqueShows.filter((n) => def.eligible(n));
    if (!pool.length) continue;
    const ranked = rankFor(def, pool);
    const nominees = ranked.slice(0, NOMINEES_PER_CATEGORY);
    categories.push({
      id: def.id,
      name: def.name,
      blurb: def.blurb,
      tier: def.tier,
      payout: { cash: def.cash, fans: def.fans },
      nominees,
      winner: nominees[0],
    });
  }
  const byId = (id: AwardCategoryId) => categories.find((c) => c.id === id);
  const playerWins = PRESENTATION_ORDER.flatMap((id) => {
    const cat = byId(id);
    return cat && cat.winner.player
      ? [{ category: id, name: cat.name, title: cat.winner.title, cash: cat.payout.cash, fans: cat.payout.fans }]
      : [];
  });
  return {
    year,
    categories,
    playerAwards: playerWins.length,
    playerCash: playerWins.reduce((a, w) => a + w.cash, 0),
    playerFans: playerWins.reduce((a, w) => a + w.fans, 0),
    presentation: PRESENTATION_ORDER.filter((id) => !!byId(id)),
    playerWins,
  };
}

/** archive-friendly rows for the summary board, in presentation order */
export function ceremonySummaryRows(c: AwardCeremony): { id: AwardCategoryId; name: string; winner: AwardNominee }[] {
  return c.presentation.flatMap((id) => {
    const cat = c.categories.find((x) => x.id === id);
    return cat ? [{ id, name: cat.name, winner: cat.winner }] : [];
  });
}

/** what the player's studio actually banks from a ceremony (idempotent view) */
export function ceremonyPlayerPrize(c: AwardCeremony): { cash: number; fans: number } {
  return { cash: c.playerCash, fans: c.playerFans };
}
