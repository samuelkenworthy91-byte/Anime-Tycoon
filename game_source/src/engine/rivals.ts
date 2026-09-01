/* ============================================================================
 *  RIVAL STUDIOS — a living anime industry
 *
 *  The six parody studios stop being random annual score generators and
 *  become persistent competitors: each has a personality, money/strength,
 *  reputation, preferred & specialist genres, a studio size, in-flight
 *  productions, franchises, a release history, awards and momentum.
 *
 *  They plan a slate on the same 48-week industry calendar the player uses,
 *  premiere shows week by week (flooding the market), grow franchises off
 *  their hits, drift up and down a shared ranking table, build rivalries
 *  with the player, poach elite staff, and — rarely — decline, restructure,
 *  get acquired, collapse and return under new management.
 *
 *  Everything is bounded (clamped ranges, capped histories) so a 12-year
 *  career stays light enough for mobile and never runs away numerically.
 * ========================================================================== */
import {
  GENRES,
  PUN_TITLES,
  RIVAL_STUDIOS,
  yearOfWeek,
  type BudgetId,
  type GenreId,
  type MediumId,
  type Staff,
  type StaffRole,
} from "./data";
import { ensureCareer } from "./careers";
import type { ReleaseRecord } from "./market";

/* ------------------------------------------------------------------ types */

export type RivalPersonaId =
  | "blockbuster"
  | "technical"
  | "experimental"
  | "prestige"
  | "volume"
  | "idol";

export type RivalStatus = "active" | "restructuring" | "acquired" | "collapsed" | "revived";

/** the kind of release a rival greenlights (mirrors the player's IP timeline) */
export type RivalEntryKind = "original" | "season" | "spinoff" | "movie" | "ova" | "reboot";

export interface RivalProduction {
  id: string;
  title: string;
  genres: GenreId[];
  medium: MediumId;
  budget: BudgetId;
  /** release week on the industry calendar */
  week: number;
  year: number;
  franchiseKey: string | null;
  kind: RivalEntryKind;
  /** review score /40 — computed at greenlight, revealed at premiere */
  score: number;
}

export interface RivalFranchise {
  key: string;
  baseTitle: string;
  genres: GenreId[];
  season: number;
  popularity: number; // 0..100
  bestScore: number;
  lastScore: number;
  lastEntryWeek: number;
  entries: number;
}

export interface RivalRelease {
  title: string;
  studioId: string;
  studio: string;
  score: number;
  week: number;
  year: number;
  genres: GenreId[];
  revenue: number;
  fans: number;
  kind: RivalEntryKind;
  hallOfFame: boolean;
}

/** a notable person at a rival studio the player can eventually poach back */
export interface RivalTalent {
  id: string;
  name: string;
  role: StaffRole;
  /** main discipline skill, 50..96 */
  skill: number;
  level: number;
  /** signing fee */
  cost: number;
  studioId: string;
  availableWeek: number;
}

export interface RivalStudio {
  id: string;
  name: string;
  persona: RivalPersonaId;
  /** strength tier 1..5 */
  tier: number;
  /** industry reputation 0..100 */
  reputation: number;
  preferred: GenreId[];
  specialist: GenreId[];
  /** studio size — roughly how many shows it can run at once (1..5) */
  size: number;
  /** −30..30 — hot streak vs cold spell */
  momentum: number;
  revenue: number; // lifetime, abstract
  fans: number; // lifetime, abstract
  awards: number;
  avgScore: number; // rolling average review
  releasesCount: number;
  hits: number; // score >= 27
  masterpieces: number; // score >= 32
  productions: RivalProduction[];
  franchises: RivalFranchise[];
  releases: RivalRelease[];
  prevRank: number;
  rank: number;
  status: RivalStatus;
  /** year the current status began (for collapse/revival timing) */
  statusYear: number;
  /** consecutive weak years — feeds decline detection */
  slumpYears: number;
  /** rivalry heat with the PLAYER, 0..100 */
  rivalry: number;
  talent: RivalTalent[];
}

export interface RivalWorld {
  studios: RivalStudio[];
  /** the calendar year the current slate belongs to */
  year: number;
  yearStartWeek: number;
  playerRank: number;
  playerPrevRank: number;
}

export interface RivalTickResult {
  world: RivalWorld;
  notices: string[];
  /** market saturation records for shows premiering this week */
  releaseRecords: ReleaseRecord[];
  /** trend nudges caused by blockbuster rival hits */
  trendShifts: { genre: GenreId; delta: number }[];
}

export interface RankingEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  score: number;
  revenue: number;
  fans: number;
  awards: number;
  avgScore: number;
  franchises: number;
  releases: number;
  tier: number;
  status: RivalStatus;
  /** rivalry heat with the player (0 for the player) */
  rivalry: number;
  persona: RivalPersonaId | null;
  rank: number;
  prevRank: number;
  movement: "up" | "down" | "same";
}

export interface RankingInput {
  name: string;
  fans: number;
  revenue: number;
  masterpieces: number;
  hits: number;
  releases: number;
  awards: number;
}

/* ------------------------------------------------------------ personas */

export interface PersonaDef {
  id: RivalPersonaId;
  label: string;
  blurb: string;
  preferred: GenreId[];
  specialist: GenreId[];
  baseTier: number;
  baseSize: number;
  /** how wildly their scores swing from year to year */
  variance: number;
  /** flat quality bias added to every score */
  qualityBias: number;
  /** extra slate slots above/below their size */
  volumeBias: number;
  budget: BudgetId;
  medium: MediumId;
}

export const PERSONAS: Record<RivalPersonaId, PersonaDef> = {
  blockbuster: {
    id: "blockbuster",
    label: "Blockbuster Action House",
    blurb: "Big robots, bigger budgets, endless sequels.",
    preferred: ["shonen", "mecha", "sports", "military"],
    specialist: ["shonen", "mecha"],
    baseTier: 4,
    baseSize: 3,
    variance: 7,
    qualityBias: 0,
    volumeBias: 0,
    budget: "blockbuster",
    medium: "tv",
  },
  technical: {
    id: "technical",
    label: "Sakuga Atelier",
    blurb: "Obsessive animation craft. Fewer shows, flawless cuts.",
    preferred: ["mecha", "cyber", "space"],
    specialist: ["mecha", "cyber"],
    baseTier: 4,
    baseSize: 2,
    variance: 3,
    qualityBias: 3,
    volumeBias: -1,
    budget: "standard",
    medium: "tv",
  },
  experimental: {
    id: "experimental",
    label: "Experimental Atelier",
    blurb: "Weird, risky, occasionally genius.",
    preferred: ["horror", "mystery", "noir", "supernatural"],
    specialist: ["horror", "noir"],
    baseTier: 3,
    baseSize: 2,
    variance: 10,
    qualityBias: 1,
    volumeBias: 0,
    budget: "indie",
    medium: "ona",
  },
  prestige: {
    id: "prestige",
    label: "Prestige Drama Studio",
    blurb: "Awards-bait, one immaculate show at a time.",
    preferred: ["slice", "noir", "romance", "mystery"],
    specialist: ["noir", "mystery"],
    baseTier: 4,
    baseSize: 1,
    variance: 2,
    qualityBias: 4,
    volumeBias: -1,
    budget: "standard",
    medium: "movie",
  },
  volume: {
    id: "volume",
    label: "Cheap High-Volume Mill",
    blurb: "Four shows a year, quality optional.",
    preferred: ["comedy", "slice", "isekai"],
    specialist: ["comedy", "isekai"],
    baseTier: 2,
    baseSize: 4,
    variance: 6,
    qualityBias: -2,
    volumeBias: 2,
    budget: "indie",
    medium: "ona",
  },
  idol: {
    id: "idol",
    label: "Romance & Idol House",
    blurb: "Sparkles, songs and feelings — steady hits.",
    preferred: ["romance", "shojo", "idol", "magical"],
    specialist: ["idol", "romance"],
    baseTier: 3,
    baseSize: 2,
    variance: 4,
    qualityBias: 1,
    volumeBias: 0,
    budget: "standard",
    medium: "tv",
  },
};

export const personaOf = (id: RivalPersonaId): PersonaDef => PERSONAS[id];

/* the six parody studios and their fixed personalities (names never change) */
const ROSTER: Record<string, RivalPersonaId> = {
  "Toe-i Animation": "blockbuster",
  Sunnyrise: "technical",
  Boneworks: "experimental",
  "Kyo-Hani": "prestige",
  "Madcap House": "volume",
  "Turtle Line": "idol",
};

export const RIVAL_STATUS_LABEL: Record<RivalStatus, string> = {
  active: "Active",
  restructuring: "Restructuring",
  acquired: "Under new ownership",
  collapsed: "Collapsed",
  revived: "Revived",
};

/* --------------------------------------------------------------- utils */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clampPct = (v: number) => clamp(Math.round(v), 0, 100);

/** small deterministic PRNG so personalities survive save/load */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* ------------------------------------------------------------ talent */

const TALENT_FIRST = ["Rin", "Kaito", "Aya", "Haruto", "Nao", "Sora", "Miku", "Ren", "Yume", "Daichi", "Kaede", "Sho"];
const TALENT_LAST = ["Fujiwara", "Kobayashi", "Takano", "Shiraishi", "Matsuda", "Aoyama", "Iwasaki", "Hoshino", "Nishimura", "Oda"];

function genTalent(studio: RivalStudio, index: number, yearStartWeek: number): RivalTalent {
  const rand = rng(hashStr(`${studio.id}#${index}`));
  const roles: StaffRole[] = ["writer", "animator", "composer"];
  const role = roles[Math.floor(rand() * 3)];
  const skill = clamp(Math.round(48 + studio.tier * 6 + rand() * 22), 50, 96);
  const level = clamp(2 + studio.tier + Math.floor(rand() * 3), 2, 12);
  const name = `${TALENT_FIRST[Math.floor(rand() * TALENT_FIRST.length)]} ${TALENT_LAST[Math.floor(rand() * TALENT_LAST.length)]}`;
  const cost = Math.round((skill * 700 + level * 2500) / 500) * 500;
  /* most become poachable at some point in the year; some right away */
  const availableWeek = yearStartWeek + Math.floor(rand() * 48);
  return { id: `t_${studio.id}_${index}`, name, role, skill, level, cost, studioId: studio.id, availableWeek };
}

/* ------------------------------------------------------ studio creation */

function baseTierOf(persona: RivalPersonaId, index: number): number {
  /* deterministic little jitter so every run has a slightly different field */
  const rand = rng(hashStr(`${persona}@${index}`));
  const p = PERSONAS[persona];
  return clamp(p.baseTier + (rand() < 0.4 ? -1 : rand() < 0.5 ? 0 : 1), 1, 5);
}

export function ensureStudio(raw: unknown, name: string, index: number, yearStartWeek: number): RivalStudio {
  const partial = (raw ?? {}) as Partial<RivalStudio>;
  const persona = ROSTER[name] ?? "experimental";
  const p = PERSONAS[persona];
  const tier = typeof partial.tier === "number" ? clamp(partial.tier, 1, 5) : baseTierOf(persona, index);
  const studio: RivalStudio = {
    id: partial.id ?? name,
    name,
    persona: partial.persona ?? persona,
    tier,
    reputation: clampPct(partial.reputation ?? 42 + tier * 8 + Math.floor(Math.random() * 8)),
    preferred: [...p.preferred],
    specialist: [...p.specialist],
    size: clamp(partial.size ?? p.baseSize, 1, 5),
    momentum: clamp(partial.momentum ?? Math.floor(Math.random() * 13) - 6, -30, 30),
    revenue: partial.revenue ?? 0,
    fans: partial.fans ?? 0,
    awards: partial.awards ?? 0,
    avgScore: partial.avgScore ?? 20 + tier,
    releasesCount: partial.releasesCount ?? 0,
    hits: partial.hits ?? 0,
    masterpieces: partial.masterpieces ?? 0,
    productions: Array.isArray(partial.productions) ? partial.productions : [],
    franchises: Array.isArray(partial.franchises) ? partial.franchises : [],
    releases: Array.isArray(partial.releases) ? partial.releases.slice(-60) : [],
    prevRank: partial.prevRank ?? index + 1,
    rank: partial.rank ?? index + 1,
    status: partial.status ?? "active",
    statusYear: partial.statusYear ?? yearOfWeek(yearStartWeek),
    slumpYears: partial.slumpYears ?? 0,
    rivalry: clampPct(partial.rivalry ?? 0),
    talent: Array.isArray(partial.talent) && partial.talent.length
      ? partial.talent
      : [0, 1].map((i) => genTalent({ id: name, name, persona, tier } as RivalStudio, i, yearStartWeek)),
  };
  return studio;
}

/* ------------------------------------------------------- world lifecycle */

export function initRivalWorld(week: number): RivalWorld {
  const yearStartWeek = Math.floor(week / 48) * 48;
  const year = yearOfWeek(week);
  const studios = RIVAL_STUDIOS.map((name, i) => ensureStudio(undefined, name, i, yearStartWeek));
  const world: RivalWorld = { studios, year, yearStartWeek, playerRank: 1, playerPrevRank: 1 };
  return planRivalYear(world, year, yearStartWeek).world;
}

/** bring an old save's rival state up to the current shape */
export function migrateRivalWorld(raw: unknown, week: number): RivalWorld {
  if (Array.isArray(raw)) {
    /* legacy: a flat list of pre-rolled rival shows */
    const yearStartWeek = Math.floor(week / 48) * 48;
    const year = yearOfWeek(week);
    const studios = RIVAL_STUDIOS.map((name, i) => ensureStudio(undefined, name, i, yearStartWeek));
    const world: RivalWorld = { studios, year, yearStartWeek, playerRank: 1, playerPrevRank: 1 };
    /* preserve anything still upcoming from the old slate */
    const upcoming = raw
      .filter((rv) => typeof rv?.week === "number" && rv.week > week)
      .map((rv, i) => ({
        id: `legacy_${week}_${i}`,
        title: String(rv.title ?? PUN_TITLES[i % PUN_TITLES.length]),
        genres: (Array.isArray(rv.genre) ? rv.genre : rv.genre ? [rv.genre as GenreId] : ["shonen"]),
        medium: "tv" as MediumId,
        budget: "standard" as BudgetId,
        week: rv.week,
        year: yearOfWeek(rv.week),
        franchiseKey: null,
        kind: "original" as RivalEntryKind,
        score: clamp(Math.round(rv.score ?? 20), 4, 39),
      }));
    if (upcoming.length) {
      world.studios = world.studios.map((s) => {
        const mine = upcoming.filter((u) => (rvOf(raw, u.week) as { studio?: string })?.studio === s.name);
        return mine.length ? { ...s, productions: [...s.productions, ...mine] } : s;
      });
    }
    return world;
  }
  const w = raw as Partial<RivalWorld> & { studios?: unknown[] };
  const yearStartWeek = typeof w.yearStartWeek === "number" ? w.yearStartWeek : Math.floor(week / 48) * 48;
  const year = typeof w.year === "number" ? w.year : yearOfWeek(week);
  const studios = RIVAL_STUDIOS.map((name, i) => {
    const existing = Array.isArray(w.studios)
      ? (w.studios.find((s) => (s as { id?: string })?.id === name || (s as { name?: string })?.name === name) as Partial<RivalStudio> | undefined)
      : undefined;
    return ensureStudio(existing, name, i, yearStartWeek);
  });
  return {
    year,
    yearStartWeek,
    studios,
    playerRank: typeof w.playerRank === "number" ? w.playerRank : 1,
    playerPrevRank: typeof w.playerPrevRank === "number" ? w.playerPrevRank : 1,
  };
}

/* helper to re-find the legacy record for a week (used above) */
function rvOf(raw: unknown[], week: number): Record<string, unknown> {
  return (raw.find((r) => (r as { week?: number })?.week === week) ?? {}) as Record<string, unknown>;
}

/* ----------------------------------------------------- title generation */

const SEQUEL_SUB = ["Return", "Re:Ignition", "Awakening", "Requiem", "Storm", "Ascension", "Vengeance", "Redemption", "Infinity", "Genesis"];
const SPINOFF_SUB = ["Gaiden", "Origins", "Side Story", "Another Story", "After Story", "Zero"];
const MOVIE_SUB = ["The Movie", "The Final Act", "Film", "Rebellion"];

let rivalProdSeq = 0;

function makeTitle(fr: RivalFranchise, kind: RivalEntryKind): string {
  switch (kind) {
    case "season":
      return Math.random() < 0.5 ? `${fr.baseTitle} ${fr.season + 1}` : `${fr.baseTitle}: ${pick(SEQUEL_SUB)}`;
    case "spinoff":
      return `${fr.baseTitle}: ${pick(SPINOFF_SUB)}`;
    case "movie":
      return `${fr.baseTitle} ${pick(MOVIE_SUB)}`;
    case "ova":
      return `${fr.baseTitle} Special`;
    case "reboot":
      return `${fr.baseTitle} Re:`;
    default:
      return pick(PUN_TITLES);
  }
}

/* ------------------------------------------------------ yearly planning */

/** decide what one studio greenlights this year */
function planStudioYear(studio: RivalStudio, year: number, yearStartWeek: number): RivalProduction[] {
  if (studio.status === "collapsed") return [];
  const p = PERSONAS[studio.persona];
  let count = clamp(Math.round(studio.size + p.volumeBias + (Math.random() * 2 - 1)), 1, 5);
  if (studio.status === "restructuring" || studio.status === "acquired") count = Math.max(1, count - 1);
  if (studio.momentum < -20) count = Math.max(1, count - 1);
  if (studio.momentum >= 15) count = Math.min(5, count + 1);

  /* spread release weeks across the year, roughly in production order */
  const weeks: number[] = [];
  const span = 39;
  for (let i = 0; i < count; i++) {
    const w = yearStartWeek + 8 + Math.floor((span * (i + Math.random() * 0.55)) / Math.max(1, count));
    weeks.push(clamp(w, yearStartWeek + 4, yearStartWeek + 46));
  }
  weeks.sort((a, b) => a - b);

  const usedTitles = new Set<string>();
  const productions: RivalProduction[] = [];
  for (let i = 0; i < count; i++) {
    /* franchise first: a studio with a warm IP keeps feeding it */
    const fr = maybeContinue(studio);
    let kind: RivalEntryKind;
    let title: string;
    let genres: GenreId[];
    let franchiseKey: string | null;
    if (fr) {
      const roll = Math.random();
      if (roll < 0.58) kind = "season";
      else if (roll < 0.78) kind = "spinoff";
      else if (roll < 0.9) kind = "ova";
      else kind = "movie";
      title = makeTitle(fr, kind);
      genres = [...fr.genres];
      franchiseKey = fr.key;
    } else {
      kind = "original";
      title = makeTitle({ key: "", baseTitle: "", genres: [], season: 0, popularity: 0, bestScore: 0, lastScore: 0, lastEntryWeek: 0, entries: 0 }, "original");
      while (usedTitles.has(title) || studio.franchises.some((f) => f.baseTitle === title)) title = `${title} 2`;
      usedTitles.add(title);
      genres = pickGenres(studio);
      franchiseKey = null;
    }
    const medium: MediumId = Math.random() < 0.8 ? p.medium : pick(["tv", "ona", "movie"] as MediumId[]);
    const budget: BudgetId = Math.random() < 0.75 ? p.budget : pick(["indie", "standard", "blockbuster"] as BudgetId[]);
    const score = computeScore(studio, { genres, franchiseKey, kind });
    productions.push({
      id: `rp${++rivalProdSeq}_${year}_${i}`,
      title,
      genres,
      medium,
      budget,
      week: weeks[i],
      year,
      franchiseKey,
      kind,
      score,
    });
  }
  return productions;
}

function maybeContinue(studio: RivalStudio): RivalFranchise | null {
  const warm = studio.franchises.filter((f) => f.popularity >= 45);
  if (!warm.length) return null;
  /* studios with momentum double down on their IPs */
  const chance = clamp(0.35 + studio.momentum * 0.01, 0.2, 0.7);
  if (Math.random() > chance) return null;
  return [...warm].sort((a, b) => b.popularity - a.popularity)[0];
}

function pickGenres(studio: RivalStudio): GenreId[] {
  const primary = pick(studio.preferred);
  const genres = [primary];
  if (Math.random() < 0.4) {
    const other = studio.preferred.filter((g) => g !== primary);
    if (other.length) genres.push(pick(other));
  } else if (Math.random() < 0.12) {
    const outside = GENRES.map((g) => g.id).filter((g) => !studio.preferred.includes(g));
    if (outside.length) genres.push(pick(outside));
  }
  return genres;
}

/** score a rival greenlight — bounded and personality-driven */
function computeScore(studio: RivalStudio, prod: { genres: GenreId[]; franchiseKey: string | null; kind: RivalEntryKind }): number {
  const p = PERSONAS[studio.persona];
  let s = 12 + studio.tier * 2.4 + studio.reputation * 0.07 + p.qualityBias;
  if (prod.genres.some((g) => studio.specialist.includes(g))) s += 3;
  else if (prod.genres.some((g) => studio.preferred.includes(g))) s += 1;
  if (prod.franchiseKey) {
    const fr = studio.franchises.find((f) => f.key === prod.franchiseKey);
    if (fr) s += clamp((fr.popularity - 40) / 12, -3, 3);
  }
  s += studio.momentum * 0.08;
  s += (Math.random() * 2 - 1) * p.variance;
  return clamp(Math.round(s), 4, 39);
}

/** yearly status transitions: decline, restructure, acquisition, collapse, revival */
function yearTransition(studio: RivalStudio, year: number): { studio: RivalStudio; notice: string | null } {
  let st = studio;

  if (st.status === "restructuring" || st.status === "acquired") {
    return { studio: { ...st, status: "active" }, notice: `${st.name} is back to full production after restructuring.` };
  }
  if (st.status === "collapsed") {
    const gone = year - st.statusYear;
    if (gone >= 1 + Math.floor(Math.random() * 2) && Math.random() < 0.7) {
      return {
        studio: {
          ...st,
          status: "revived",
          statusYear: year,
          tier: clamp(Math.round(st.tier * 0.8 + 1), 2, 4),
          reputation: 40,
          momentum: 0,
        },
        notice: `🔄 ${st.name} returns under new management — smaller, hungrier, back in the game.`,
      };
    }
    return { studio: st, notice: null };
  }
  if (st.status === "revived") return { studio: { ...st, status: "active" }, notice: null };

  /* decline detection: two consecutive weak years + cold momentum */
  const thisYear = st.releases.filter((r) => r.year === year - 1);
  const avg = thisYear.length ? thisYear.reduce((a, r) => a + r.score, 0) / thisYear.length : st.avgScore;
  if (thisYear.length >= 1 && avg < 16 && st.tier >= 1 && Math.random() < 0.5) {
    st = { ...st, slumpYears: st.slumpYears + 1 };
  } else if (avg >= 18) {
    st = { ...st, slumpYears: 0 };
  }

  if (st.slumpYears >= 2 && st.momentum < -10) {
    const roll = Math.random();
    st = { ...st, slumpYears: 0 };
    if (roll < 0.5) {
      return {
        studio: { ...st, status: "restructuring", statusYear: year, momentum: -5, tier: Math.max(1, st.tier - 1), reputation: clampPct(st.reputation - 8) },
        notice: `🔧 ${st.name} restructures after a run of misses — slimmer, cheaper, hoping to reset.`,
      };
    }
    if (roll < 0.85) {
      return {
        studio: { ...st, status: "acquired", statusYear: year, momentum: 0, reputation: clampPct(60) },
        notice: `🏢 ${st.name} is acquired by a production committee. Fresh money, same name.`,
      };
    }
    return {
      studio: { ...st, status: "collapsed", statusYear: year, productions: [], momentum: -30 },
      notice: `💀 ${st.name} collapses — the doors close. Whether it ever returns is anyone's guess.`,
    };
  }
  return { studio: st, notice: null };
}

export function planRivalYear(world: RivalWorld, year: number, yearStartWeek: number): { world: RivalWorld; notices: string[] } {
  const notices: string[] = [];
  const studios = world.studios.map((st) => {
    const t = yearTransition(st, year);
    if (t.notice) notices.push(t.notice);
    const next = t.studio;
    const slate = planStudioYear(next, year, yearStartWeek);
    return { ...next, productions: slate };
  });
  return { world: { ...world, studios, year, yearStartWeek }, notices };
}

/* --------------------------------------------------------- weekly tick */

function rivalRevenueFans(score: number, medium: MediumId, budget: BudgetId): { revenue: number; fans: number } {
  const medReach = medium === "movie" ? 1.5 : medium === "ona" ? 0.7 : 1.0;
  const budgetF = budget === "blockbuster" ? 1.5 : budget === "indie" ? 0.6 : 1.0;
  const appeal = Math.pow(score / 40, 2.1) * medReach * budgetF;
  const revenue = Math.round(900_000 * appeal);
  const tierFan = score >= 32 ? 1.5 : score >= 27 ? 1.2 : score >= 21 ? 1 : score >= 15 ? 0.62 : 0.3;
  const fans = Math.round(revenue * 0.05 * tierFan);
  return { revenue, fans };
}

export interface RivalTickCtx {
  /** genres of the player's currently-airing shows (for head-to-head rivalry) */
  playerAiringGenres: Set<GenreId>;
}

/** advance the industry one calendar week: premieres land, hits franchise, market floods */
export function tickRivalWeek(world: RivalWorld, week: number, ctx: RivalTickCtx): RivalTickResult {
  const notices: string[] = [];
  const releaseRecords: ReleaseRecord[] = [];
  const trendShifts: { genre: GenreId; delta: number }[] = [];

  let studios = world.studios.map((st) => {
    let studio = { ...st, productions: [...st.productions] };

    /* a hot studio with an empty calendar may greenlight one surprise show */
    if (
      studio.status === "active" &&
      studio.momentum >= 12 &&
      studio.productions.every((p) => p.week <= week) &&
      week - world.yearStartWeek >= 20 &&
      week - world.yearStartWeek <= 40 &&
      Math.random() < 0.3
    ) {
      const fr = maybeContinue(studio);
      const genres = fr ? [...fr.genres] : pickGenres(studio);
      const kind: RivalEntryKind = fr ? "season" : "original";
      let title = fr ? makeTitle(fr, kind) : pick(PUN_TITLES);
      if (!fr) while (studio.franchises.some((f) => f.baseTitle === title)) title = `${title} 2`;
      studio.productions.push({
        id: `rp${++rivalProdSeq}_surp_${week}`,
        title,
        genres,
        medium: PERSONAS[studio.persona].medium,
        budget: PERSONAS[studio.persona].budget,
        week: week + 4 + Math.floor(Math.random() * 8),
        year: yearOfWeek(week),
        franchiseKey: fr ? fr.key : null,
        kind,
        score: computeScore(studio, { genres, franchiseKey: fr ? fr.key : null, kind }),
      });
      notices.push(`📣 Surprise announcement: ${studio.name} greenlights “${title}” out of nowhere!`);
    }

    const premiering = studio.productions.filter((p) => p.week === week);
    if (!premiering.length) return studio;

    const remaining = studio.productions.filter((p) => p.week !== week);
    let franchises = [...studio.franchises];
    let releases = [...studio.releases];
    let momentum = studio.momentum;
    let reputation = studio.reputation;
    let rivalry = studio.rivalry;
    let avgScore = studio.avgScore;
    let releasesCount = studio.releasesCount;
    let hits = studio.hits;
    let masterpieces = studio.masterpieces;
    let revenue = studio.revenue;
    let fans = studio.fans;

    for (const prod of premiering) {
      const { revenue: rev, fans: f } = rivalRevenueFans(prod.score, prod.medium, prod.budget);
      revenue += rev;
      fans += f;
      releasesCount += 1;
      if (prod.score >= 32) masterpieces += 1;
      if (prod.score >= 27) hits += 1;
      avgScore = Math.round(((avgScore * (releasesCount - 1) + prod.score) / releasesCount) * 10) / 10;
      momentum = clamp(momentum + (prod.score - 22) / 3, -30, 30);
      reputation = clampPct(reputation + (prod.score - 22) / 4);

      releases.push({
        title: prod.title,
        studioId: studio.id,
        studio: studio.name,
        score: prod.score,
        week,
        year: yearOfWeek(week),
        genres: [...prod.genres],
        revenue: rev,
        fans: f,
        kind: prod.kind,
        hallOfFame: prod.score >= 32,
      });
      releases = releases.slice(-60);

      /* franchise ledger — hits persist and spawn sequels/spin-offs */
      {
        const isSpin = prod.kind === "spinoff";
        const parent = prod.franchiseKey
          ? franchises.find((f) => f.key === prod.franchiseKey)
          : !isSpin
            ? franchises.find((f) => f.baseTitle === prod.title)
            : null;
        if (parent && !isSpin) {
          franchises = franchises.map((f) => {
            if (f.key !== parent.key) return f;
            const isSeason = prod.kind === "season" || prod.kind === "reboot";
            return {
              ...f,
              season: isSeason ? Math.max(f.season, f.season + 1) : f.season,
              entries: f.entries + 1,
              popularity: clampPct(f.popularity + (prod.score >= 27 ? 6 : prod.score < 15 ? -10 : 0)),
              bestScore: Math.max(f.bestScore, prod.score),
              lastScore: prod.score,
              lastEntryWeek: week,
            };
          });
        } else {
          /* a brand-new line (or a spin-off breaking out as its own IP) */
          franchises.push({
            key: prod.title,
            baseTitle: prod.title,
            genres: [...prod.genres],
            season: 1,
            popularity: clampPct((isSpin && parent ? parent.popularity * 0.8 : 18 + prod.score * 1.6) + (prod.score >= 32 ? 10 : 0)),
            bestScore: prod.score,
            lastScore: prod.score,
            lastEntryWeek: week,
            entries: 1,
          });
          if (isSpin && parent) {
            franchises = franchises.map((f) => (f.key === parent.key ? { ...f, entries: f.entries + 1, lastEntryWeek: week } : f));
          }
        }
      }

      /* market flood — rivals saturate genres like everyone else */
      prod.genres.forEach((g) => releaseRecords.push({ genre: g, week, weight: prod.budget === "blockbuster" ? 2 : 1 }));

      /* a genuine smash ignites the genre */
      if (prod.score >= 30 && Math.random() < 0.4) {
        trendShifts.push({ genre: prod.genres[0], delta: 1 });
      }

      /* head-to-head with the player's airing slate */
      const clash = prod.genres.some((g) => ctx.playerAiringGenres.has(g));
      if (clash) {
        rivalry = clampPct(rivalry + 3);
        notices.push(`⚔️ ${studio.name} premieres “${prod.title}” the same season you're airing ${genreWord(prod.genres[0])} — a head-to-head.`);
      }

      const tierWord = prod.score >= 32 ? "a masterpiece" : prod.score >= 27 ? "a smash hit" : prod.score >= 21 ? "solid" : prod.score >= 15 ? "mixed" : "a flop";
      notices.push(`${studio.name} premieres “${prod.title}” — critics call it ${tierWord} (${prod.score}/40).`);
    }

    return { ...studio, productions: remaining, franchises, releases, momentum, reputation, rivalry, avgScore, releasesCount, hits, masterpieces, revenue, fans };
  });

  return { world: { ...world, studios }, notices, releaseRecords, trendShifts };
}

function genreWord(id: GenreId): string {
  return GENRES.find((g) => g.id === id)?.label ?? id;
}

/* ------------------------------------------------------------ rankings */

/** one shared ranking formula for the player and every rival studio */
export function studioRankScore(v: { fans: number; revenue: number; masterpieces: number; hits: number; releases: number; awards: number }): number {
  return Math.round(
    v.fans * 1.5 +
      v.revenue / 400 +
      v.masterpieces * 2200 +
      v.hits * 700 +
      v.releases * 200 +
      v.awards * 3000
  );
}

export function computeRankings(world: RivalWorld, player: RankingInput): RankingEntry[] {
  const rows: RankingEntry[] = world.studios.map((st) => {
    const movement = st.prevRank > 0 && st.rank > 0 ? (st.rank < st.prevRank ? "up" : st.rank > st.prevRank ? "down" : "same") : "same";
    return {
      id: st.id,
      name: st.name,
      isPlayer: false,
      score: studioRankScore({ fans: st.fans, revenue: st.revenue, masterpieces: st.masterpieces, hits: st.hits, releases: st.releasesCount, awards: st.awards }),
      revenue: st.revenue,
      fans: st.fans,
      awards: st.awards,
      avgScore: st.avgScore,
      franchises: st.franchises.length,
      releases: st.releasesCount,
      tier: st.tier,
      status: st.status,
      rivalry: st.rivalry,
      persona: st.persona,
      rank: st.rank,
      prevRank: st.prevRank,
      movement,
    };
  });
  const playerMovement = world.playerPrevRank > 0 && world.playerRank > 0 ? (world.playerRank < world.playerPrevRank ? "up" : world.playerRank > world.playerPrevRank ? "down" : "same") : "same";
  rows.push({
    id: "player",
    name: player.name,
    isPlayer: true,
    score: studioRankScore({ fans: player.fans, revenue: player.revenue, masterpieces: player.masterpieces, hits: player.hits, releases: player.releases, awards: player.awards }),
    revenue: player.revenue,
    fans: player.fans,
    awards: player.awards,
    avgScore: 0,
    franchises: 0,
    releases: player.releases,
    tier: 0,
    status: "active",
    rivalry: 0,
    persona: null,
    rank: world.playerRank,
    prevRank: world.playerPrevRank,
    movement: playerMovement,
  });
  return rows.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
}

/** year-end: lock in rankings for movement arrows and run rivalry beats */
export function finalizeYear(world: RivalWorld, player: RankingInput): { world: RivalWorld; notices: string[] } {
  const ranked = computeRankings(world, player);
  const notices: string[] = [];
  const studios = world.studios.map((st) => {
    const entry = ranked.find((r) => r.id === st.id);
    return { ...st, prevRank: st.rank || (entry?.rank ?? 1), rank: entry?.rank ?? 1 };
  });
  const playerEntry = ranked.find((r) => r.id === "player");
  return {
    world: {
      ...world,
      studios,
      playerPrevRank: world.playerRank || (playerEntry?.rank ?? 1),
      playerRank: playerEntry?.rank ?? 1,
    },
    notices,
  };
}

/* ------------------------------------------------------------- rivalry */

/** choose which studio is poaching right now — hot rivals and strong studios lead */
export function pickPoacher(world: RivalWorld): RivalStudio | null {
  const active = world.studios.filter((s) => s.status !== "collapsed");
  if (!active.length) return null;
  const total = active.reduce((a, s) => a + Math.max(1, s.tier * 2 + s.rivalry), 0);
  let roll = Math.random() * total;
  for (const s of active) {
    roll -= Math.max(1, s.tier * 2 + s.rivalry);
    if (roll <= 0) return s;
  }
  return active[active.length - 1];
}

export function bumpRivalry(world: RivalWorld, studioId: string, amount: number): RivalWorld {
  return {
    ...world,
    studios: world.studios.map((s) => (s.id === studioId ? { ...s, rivalry: clampPct(s.rivalry + amount) } : s)),
  };
}

/* ------------------------------------------------------ rivalry events */

export type RivalryEventKind = "bidwar" | "spat" | "smear" | "crown";

export interface RivalryEvent {
  studioId: string;
  studioName: string;
  kind: RivalryEventKind;
  text: string;
}

/** strong rivalries occasionally boil over into industry events */
export function rollRivalryEvents(world: RivalWorld, year: number): RivalryEvent[] {
  const hot = world.studios
    .filter((s) => s.status !== "collapsed" && s.rivalry >= 40)
    .sort((a, b) => b.rivalry - a.rivalry);
  const out: RivalryEvent[] = [];
  for (const s of hot.slice(0, 2)) {
    if (Math.random() > 0.6) continue;
    const kind = pick<RivalryEventKind>(["bidwar", "spat", "smear", "crown"]);
    switch (kind) {
      case "bidwar":
        out.push({ studioId: s.id, studioName: s.name, kind, text: `💸 ${s.name} outbids you on a plum commission — a broadcaster now eyes ${year}'s champion warily.` });
        break;
      case "spat":
        out.push({ studioId: s.id, studioName: s.name, kind, text: `🗞️ ${s.name}'s fans and yours are trading insults online. Some of your followers drift away.` });
        break;
      case "smear":
        out.push({ studioId: s.id, studioName: s.name, kind, text: `🕵️ ${s.name} spreads a rumour about your production floor. The press has a field day.` });
        break;
      case "crown":
        out.push({ studioId: s.id, studioName: s.name, kind, text: `👑 ${s.name} declares itself the true king of anime and dares you to disagree. The rivalry burns brighter.` });
        break;
    }
  }
  return out;
}

/** a rival studio wins an industry award */
export function creditAward(world: RivalWorld, studioId: string): RivalWorld {
  return {
    ...world,
    studios: world.studios.map((s) =>
      s.id === studioId
        ? { ...s, awards: s.awards + 1, reputation: clampPct(s.reputation + 6), momentum: clamp(s.momentum + 6, -30, 30) }
        : s
    ),
  };
}

/** a poach succeeded — the studio walks away stronger and the grudge grows */
export function creditPoach(world: RivalWorld, studioId: string | undefined): RivalWorld {
  if (!studioId) return world;
  return {
    ...world,
    studios: world.studios.map((s) =>
      s.id === studioId
        ? { ...s, momentum: clamp(s.momentum + 5, -30, 30), rivalry: clampPct(s.rivalry + 6), reputation: clampPct(s.reputation + 2) }
        : s
    ),
  };
}

/* --------------------------------------------------------- rival talent */

export function rivalTalentById(world: RivalWorld, talentId: string): RivalTalent | null {
  for (const s of world.studios) {
    const t = s.talent.find((x) => x.id === talentId);
    if (t) return t;
  }
  return null;
}

export function rivalTalentAvailable(world: RivalWorld, week: number): RivalTalent[] {
  const out: RivalTalent[] = [];
  for (const s of world.studios) {
    if (s.status === "collapsed") continue;
    for (const t of s.talent) if (t.availableWeek <= week) out.push(t);
  }
  return out;
}

export function removeRivalTalent(world: RivalWorld, talentId: string): RivalWorld {
  return {
    ...world,
    studios: world.studios.map((s) => ({ ...s, talent: s.talent.filter((t) => t.id !== talentId) })),
  };
}

/** turn a poached rival notable into a full player Staff with a career */
export function rivalTalentToStaff(t: RivalTalent, week: number): Staff {
  const base: Staff = {
    id: `hire_${t.id}`,
    name: t.name,
    role: t.role,
    story: t.role === "writer" ? t.skill : Math.round(t.skill * 0.55),
    art: t.role === "animator" ? t.skill : Math.round(t.skill * 0.55),
    sound: t.role === "composer" ? t.skill : Math.round(t.skill * 0.55),
    level: t.level,
    salary: Math.round((280 + t.skill * 13 + t.level * 140) / 10) * 10,
    cost: 0, // signing fee already paid by hireRivalTalent
    stamina: 100,
    portrait: Math.floor(Math.random() * 16),
    look: Math.floor(Math.random() * 10),
  };
  return ensureCareer(base, week);
}

/* ---------------------------------------------------------- public API */

/** a premiere shown on the market screen's upcoming list */
export interface UpcomingPremiere {
  title: string;
  studio: string;
  genres: GenreId[];
  week: number;
  year: number;
}

/** upcoming rival premieres for the market screen */
export function upcomingPremieres(world: RivalWorld, week: number, n: number): UpcomingPremiere[] {
  return world.studios
    .flatMap((s) => s.productions.map((p) => ({ title: p.title, studio: s.name, genres: p.genres, week: p.week, year: p.year })))
    .filter((p) => p.week > week)
    .sort((a, b) => a.week - b.week)
    .slice(0, n);
}

/** a studio's releases for a given calendar year (for the awards ceremony) */
export function yearRivalReleases(world: RivalWorld, year: number): RivalRelease[] {
  return world.studios.flatMap((s) => s.releases.filter((r) => r.year === year));
}

export const activeStudioCount = (world: RivalWorld) => world.studios.filter((s) => s.status !== "collapsed").length;
