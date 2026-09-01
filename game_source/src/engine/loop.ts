/**
 * loop.ts — the career layer that sits on top of making a single show.
 *
 * The core loop (Create → Produce → Release) is a tight 30–90 second burst of
 * bubble popping. On its own it has nothing to pull the player forward, so
 * this module wraps it in the three outer loops that tycoon games live on:
 *
 *   season   (12 weeks) — the market moves; what is hot changes
 *   run      (a career) — objectives point at the next thing to do, the studio
 *                         climbs a visible rank ladder, staff grow and burn out
 *   meta     (forever)  — the hall of fame and high-score table
 *
 * Everything here is a pure function over RunState so it can be saved, and
 * nothing here is imported by state.ts (that would be a cycle) — App.tsx is
 * the orchestrator that calls in.
 */

import { GENRES, OFFICES, ROLE_POINT, staffPoint, type GenreId, type PointType, type Staff } from "./data";
import { initialRun, studioScore, type RunState } from "./state";

/* =================================================================== */
/*  studio rank — the long ladder                                      */
/* =================================================================== */

export interface StudioRank {
  tier: number;
  name: string;
  /** studio score needed to reach this rank */
  min: number;
  blurb: string;
  color: string;
}

export const RANKS: StudioRank[] = [
  { tier: 0, name: "Unknown", min: 0, blurb: "Nobody knows your name yet.", color: "#8b8aa0" },
  { tier: 1, name: "Whisper", min: 3_000, blurb: "A few forum threads about you.", color: "#9db4ff" },
  { tier: 2, name: "Buzz", min: 12_000, blurb: "Clips of your work are circulating.", color: "#5ef0c0" },
  { tier: 3, name: "Talked About", min: 32_000, blurb: "Reviewers know who you are.", color: "#3be1ff" },
  { tier: 4, name: "Acclaimed", min: 70_000, blurb: "Your studio is a mark of quality.", color: "#a78bfa" },
  { tier: 5, name: "Renowned", min: 140_000, blurb: "Fans queue for your next slate.", color: "#ffd166" },
  { tier: 6, name: "Powerhouse", min: 260_000, blurb: "You set the season's agenda.", color: "#ff8fc7" },
  { tier: 7, name: "Legendary", min: 460_000, blurb: "Textbooks will cover this era.", color: "#ff7a3d" },
  { tier: 8, name: "Immortal", min: 780_000, blurb: "The industry orbits your address.", color: "#ff4d8d" },
];

export interface RankView {
  rank: StudioRank;
  next: StudioRank | null;
  score: number;
  /** 0..1 progress toward the next rank */
  toNext: number;
}

export function rankOf(score: number): RankView {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (score >= RANKS[i].min) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  const span = next ? next.min - rank.min : 1;
  return { rank, next, score, toNext: next ? Math.min(1, (score - rank.min) / span) : 1 };
}

export const rankView = (run: RunState): RankView => rankOf(studioScore(run));

/** Revenue and fan multipliers earned purely by reputation. */
export const rankRevenueMult = (tier: number) => 1 + tier * 0.025;
export const rankFanMult = (tier: number) => 1 + tier * 0.045;
/** Better candidates show up as your reputation grows. */
export const rankScoutWeek = (tier: number) => tier * 10;

/* =================================================================== */
/*  the market — a season is 12 weeks, four to a year                   */
/* =================================================================== */

export const SEASON_WEEKS = 12;
export const SEASONS_PER_YEAR = 4;
export const SEASON_NAMES = ["WINTER", "SPRING", "SUMMER", "AUTUMN"] as const;

export interface Market {
  /** genres the audience is hungry for right now */
  hot: GenreId;
  warm: GenreId;
  /** what the audience is sick of */
  cold: GenreId;
}

export interface SeasonView {
  /** 1-based calendar year */
  year: number;
  /** 0..3, index into SEASON_NAMES */
  season: number;
  /** 0-based, counts seasons since the start of the career */
  index: number;
  /** weeks until the season rolls over */
  weeksLeft: number;
}

export function seasonView(week: number): SeasonView {
  const index = Math.floor(week / SEASON_WEEKS);
  const year = Math.floor(index / SEASONS_PER_YEAR) + 1;
  const season = index % SEASONS_PER_YEAR;
  return { year, season, index, weeksLeft: SEASON_WEEKS - (week % SEASON_WEEKS) };
}

const pickGenre = (exclude: GenreId[] = []): GenreId => {
  const pool = GENRES.filter((g) => !exclude.includes(g.id));
  const list = pool.length ? pool : GENRES;
  return list[Math.floor(Math.random() * list.length)].id;
};

export function rollMarket(_week: number): Market {
  const hot = pickGenre();
  const warm = pickGenre([hot]);
  const cold = pickGenre([hot, warm]);
  return { hot, warm, cold };
}

export interface MarketBonus {
  revenue: number;
  fans: number;
  kind: "hot" | "warm" | "cold" | "none";
  label: string;
}

/** What the current season thinks of a show's genres. */
export function marketBonus(genres: GenreId[], market: Market | null | undefined): MarketBonus {
  if (!market) return { revenue: 1, fans: 1, kind: "none", label: "" };
  const g = GENRES.find((x) => x.id === market.hot)?.label ?? "?";
  if (genres.includes(market.hot)) return { revenue: 1.2, fans: 1.28, kind: "hot", label: `${g} is burning up the charts` };
  if (genres.includes(market.warm)) return { revenue: 1.08, fans: 1.1, kind: "warm", label: `${g} is doing well` };
  if (genres.includes(market.cold)) return { revenue: 0.88, fans: 0.86, kind: "cold", label: `audiences are tired of ${g}` };
  return { revenue: 1, fans: 1, kind: "none", label: "" };
}

/* =================================================================== */
/*  objectives — always three on the board                              */
/* =================================================================== */

export type ObjTier = "short" | "season" | "career";

/** counters captured when the objective is handed out, so progress is a delta */
export interface ObjBase {
  showsMade: number;
  totalRevenue: number;
  fans: number;
  rd: number;
  awards: number;
  hits: number;
  hof: number;
  research: number;
  staff: number;
  officeLevel: number;
}

export interface ObjectiveState {
  def: string;
  target: number;
  /** rolled genre / rank name / whatever the instance is about */
  focus?: string;
  base: ObjBase;
  /** event-counted progress (shows delivered, contracts signed…) */
  count: number;
  done: boolean;
}

export interface ObjectiveView {
  state: ObjectiveState;
  tier: ObjTier;
  text: string;
  progress: number;
  target: number;
  done: boolean;
  reward: { cash: number; rd: number; fans: number };
  hint: string;
}

export interface ShowEvent {
  genres: GenreId[];
  score: number;
  revenue: number;
  fans: number;
  hit: boolean;
  hallOfFame: boolean;
}

export type ObjEvent =
  | ({ t: "show" } & ShowEvent)
  | { t: "contract" }
  | { t: "award"; n: number }
  | { t: "hire" }
  | { t: "train" };

const gbpShort = (n: number) =>
  n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : `£${Math.round(n / 1000)}k`;

const snap = (run: RunState): ObjBase => ({
  showsMade: run.showsMade,
  totalRevenue: run.totalRevenue,
  fans: run.fans,
  rd: run.rd,
  awards: run.awards,
  hits: run.hits,
  hof: run.hallOfFame.length,
  research: run.research.length,
  staff: run.staff.length,
  officeLevel: run.officeLevel,
});

interface ObjDef {
  id: string;
  tier: ObjTier;
  /** only offered when this passes */
  available?: (run: RunState) => boolean;
  roll: (run: RunState) => { target: number; focus?: string };
  text: (o: ObjectiveState) => string;
  /** current progress; `count` is used for event-driven objectives */
  progress: (o: ObjectiveState, run: RunState) => number;
  /** which event feeds the counter */
  on?: ObjEvent["t"];
  /** for show events, whether this one counts */
  match?: (o: ObjectiveState, ev: ShowEvent) => boolean;
  reward: (o: ObjectiveState, run: RunState) => { cash: number; rd: number; fans: number };
  hint: string;
}

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** pick a genre the player can actually make right now */
const ownedGenre = (run: RunState): GenreId =>
  run.genresUnlocked[Math.floor(Math.random() * run.genresUnlocked.length)] ?? "shonen";

export const OBJ_DEFS: ObjDef[] = [
  /* ---------------------------------------------------------- short term */
  {
    id: "s-shows",
    tier: "short",
    roll: () => ({ target: rand(1, 2) }),
    text: (o) => `Ship ${o.target} show${o.target > 1 ? "s" : ""}`,
    progress: (o) => o.count,
    on: "show",
    reward: (o) => ({ cash: 22_000 * o.target, rd: 4 * o.target, fans: 300 * o.target }),
    hint: "Finish production and air the show.",
  },
  {
    id: "s-genre",
    tier: "short",
    roll: (run) => ({ target: 1, focus: ownedGenre(run) }),
    text: (o) => `Air a ${GENRES.find((g) => g.id === o.focus)?.label ?? "?"} show`,
    progress: (o) => o.count,
    on: "show",
    match: (o, ev) => ev.genres.includes(o.focus as GenreId),
    reward: () => ({ cash: 45_000, rd: 8, fans: 700 }),
    hint: "Pick the genre when you pitch the show.",
  },
  {
    id: "s-score",
    tier: "short",
    roll: (run) => ({ target: Math.min(34, 22 + Math.floor(run.bestScore / 8)) }),
    text: (o) => `Air a show rated ${o.target}/40 or better`,
    progress: (o) => o.count,
    on: "show",
    match: (o, ev) => ev.score >= o.target,
    reward: (o) => ({ cash: 60_000, rd: 10 + Math.max(0, o.target - 24), fans: 900 }),
    hint: "Match the genre's ideal sliders and keep the crew rested.",
  },
  {
    id: "s-revenue",
    tier: "short",
    roll: (run) => ({ target: Math.round((200_000 + run.showsMade * 90_000) / 10_000) * 10_000 }),
    text: (o) => `Earn ${gbpShort(o.target)} from a single show`,
    progress: (o) => o.count,
    on: "show",
    match: (o, ev) => ev.revenue >= o.target,
    reward: (o) => ({ cash: Math.round(o.target * 0.12), rd: 12, fans: 1_200 }),
    hint: "Bigger budgets and a hot genre both lift revenue.",
  },
  {
    id: "s-contract",
    tier: "short",
    roll: () => ({ target: rand(1, 2) }),
    text: (o) => `Deliver ${o.target} contract job${o.target > 1 ? "s" : ""}`,
    progress: (o) => o.count,
    on: "contract",
    reward: (o) => ({ cash: 18_000 * o.target, rd: 7 * o.target, fans: 150 }),
    hint: "Contract work is in the CONTRACTS panel.",
  },
  {
    id: "s-hire",
    tier: "short",
    available: (run) => run.staff.length < OFFICES[run.officeLevel].maxStaff,
    roll: (run) => ({ target: Math.min(2, OFFICES[run.officeLevel].maxStaff - run.staff.length) }),
    text: (o) => `Sign ${o.target} new staff`,
    progress: (o) => o.count,
    on: "hire",
    reward: (o) => ({ cash: 20_000 * o.target, rd: 5, fans: 100 }),
    hint: "Recruitment ads are in the STAFF ROOM.",
  },
  {
    id: "s-train",
    tier: "short",
    available: (run) => run.staff.length > 0,
    roll: () => ({ target: 1 }),
    text: () => `Send a staff member on a workshop`,
    progress: (o) => o.count,
    on: "train",
    reward: () => ({ cash: 16_000, rd: 6, fans: 100 }),
    hint: "Workshops are in the STAFF ROOM.",
  },

  /* --------------------------------------------------------- season term */
  {
    id: "m-fans",
    tier: "season",
    roll: (run) => ({ target: Math.max(600, Math.round((run.fans * 0.18 + 900) / 100) * 100) }),
    text: (o) => `Gain ${o.target.toLocaleString("en-GB")} new fans`,
    progress: (o, run) => run.fans - o.base.fans,
    reward: (o) => ({ cash: 70_000, rd: 12, fans: Math.round(o.target * 0.2) }),
    hint: "Hits and awards are the fastest route to new fans.",
  },
  {
    id: "m-cash",
    tier: "season",
    roll: (run) => ({ target: Math.round((400_000 + run.week * 6_000) / 50_000) * 50_000 }),
    text: (o) => `Hold ${gbpShort(o.target)} in the bank`,
    progress: (_o, run) => run.cash,
    reward: (o) => ({ cash: Math.round(o.target * 0.08), rd: 14, fans: 400 }),
    hint: "Every year-end wage bill is taken at once — save for it.",
  },
  {
    id: "m-rd",
    tier: "season",
    roll: (run) => ({ target: Math.round((50 + run.week * 0.5) / 5) * 5 }),
    text: (o) => `Bank ${o.target} research data`,
    progress: (_o, run) => run.rd,
    reward: () => ({ cash: 90_000, rd: 18, fans: 300 }),
    hint: "Contracts and editing notes both pay research data.",
  },
  {
    id: "m-crew",
    tier: "season",
    available: (run) => run.staff.length < OFFICES[run.officeLevel].maxStaff,
    roll: (run) => ({ target: Math.min(OFFICES[run.officeLevel].maxStaff, run.staff.length + rand(1, 2)) }),
    text: (o) => `Grow the crew to ${o.target}`,
    progress: (_o, run) => run.staff.length,
    reward: () => ({ cash: 110_000, rd: 15, fans: 250 }),
    hint: "A bigger office means room for more desks.",
  },
  {
    id: "m-research",
    tier: "season",
    available: (run) => run.research.length < 10,
    roll: (run) => ({ target: Math.min(10, run.research.length + rand(2, 3)) }),
    text: (o) => `Complete ${o.target} R&D projects`,
    progress: (_o, run) => run.research.length,
    reward: () => ({ cash: 130_000, rd: 20, fans: 400 }),
    hint: "R&D permanently upgrades how the studio works.",
  },
  {
    id: "m-shows",
    tier: "season",
    roll: () => ({ target: rand(2, 3) }),
    text: (o) => `Ship ${o.target} shows`,
    progress: (o) => o.count,
    on: "show",
    reward: (o) => ({ cash: 60_000 * o.target, rd: 10 * o.target, fans: 800 }),
    hint: "Keep the slate moving.",
  },
  {
    id: "m-office",
    tier: "season",
    available: (run) => run.officeLevel < OFFICES.length - 1,
    roll: (run) => ({ target: run.officeLevel + 1 }),
    text: () => `Relocate to a bigger studio`,
    progress: (_o, run) => run.officeLevel,
    reward: () => ({ cash: 250_000, rd: 25, fans: 2_000 }),
    hint: "Save up — the MOVE button lists the next studio.",
  },

  /* --------------------------------------------------------- career term */
  {
    id: "c-award",
    tier: "career",
    roll: () => ({ target: 1 }),
    text: () => `Win an award at the London Anime Awards`,
    progress: (o) => o.count,
    on: "award",
    reward: () => ({ cash: 400_000, rd: 40, fans: 8_000 }),
    hint: "Awards are judged at the end of every year.",
  },
  {
    id: "c-hof",
    tier: "career",
    roll: (run) => ({ target: run.hallOfFame.length + rand(1, 2) }),
    text: (o) => `Land ${o.target} show${o.target > 1 ? "s" : ""} in the Hall of Fame`,
    progress: (_o, run) => run.hallOfFame.length,
    reward: () => ({ cash: 500_000, rd: 45, fans: 10_000 }),
    hint: "Score 32/40 or better to enter the Hall of Fame.",
  },
  {
    id: "c-hits",
    tier: "career",
    roll: (run) => ({ target: run.hits + rand(3, 5) }),
    text: (o) => `Score ${o.target} hit shows`,
    progress: (_o, run) => run.hits,
    reward: () => ({ cash: 300_000, rd: 35, fans: 6_000 }),
    hint: "Hits and Hall of Fame shows both count.",
  },
  {
    id: "c-rank",
    tier: "career",
    roll: (run) => {
      const v = rankView(run);
      const next = v.next ?? RANKS[RANKS.length - 1];
      return { target: next.min, focus: next.name };
    },
    text: (o) => `Reach ${o.focus ?? "the next"} studio rank`,
    progress: (_o, run) => studioScore(run),
    reward: () => ({ cash: 450_000, rd: 40, fans: 9_000 }),
    hint: "Studio score grows with fans, revenue, hits and awards.",
  },
  {
    id: "c-revenue",
    tier: "career",
    roll: (run) => ({ target: Math.round((run.totalRevenue + 6_000_000) / 1_000_000) * 1_000_000 }),
    text: (o) => `Earn ${gbpShort(o.target)} in lifetime revenue`,
    progress: (_o, run) => run.totalRevenue,
    reward: (o) => ({ cash: Math.round(o.target * 0.05), rd: 50, fans: 7_000 }),
    hint: "Every broadcast week adds to the lifetime total.",
  },
];

export const OBJ_BY_ID: Record<string, ObjDef> = Object.fromEntries(OBJ_DEFS.map((d) => [d.id, d]));

export function rollObjective(run: RunState, tier: ObjTier): ObjectiveState {
  const pool = OBJ_DEFS.filter((d) => d.tier === tier && (d.available ? d.available(run) : true));
  const def = (pool.length ? pool : OBJ_DEFS.filter((d) => d.tier === tier))[0];
  const rolled = def.roll(run);
  return {
    def: def.id,
    target: Math.max(1, rolled.target),
    focus: rolled.focus,
    base: snap(run),
    count: 0,
    done: false,
  };
}

export function objectiveView(o: ObjectiveState, run: RunState): ObjectiveView {
  const def = OBJ_BY_ID[o.def];
  if (!def) {
    return { state: o, tier: "short", text: "Objective", progress: 0, target: 1, done: o.done, reward: { cash: 0, rd: 0, fans: 0 }, hint: "" };
  }
  const progress = def.on ? o.count : def.progress(o, run);
  return {
    state: o,
    tier: def.tier,
    text: def.text(o),
    progress: Math.max(0, progress),
    target: o.target,
    done: o.done || progress >= o.target,
    reward: def.reward(o, run),
    hint: def.hint,
  };
}

export const objectiveViews = (run: RunState): ObjectiveView[] =>
  (run.objectives ?? []).map((o) => objectiveView(o, run));

/** Feed an event to every objective that listens for it. */
export function bumpObjectives(run: RunState, ev: ObjEvent): RunState {
  const list = run.objectives ?? [];
  if (!list.length) return run;
  let changed = false;
  const next = list.map((o) => {
    const def = OBJ_BY_ID[o.def];
    if (!def || def.on !== ev.t) return o;
    if (ev.t === "show" && def.match && !def.match(o, ev)) return o;
    if (ev.t === "award" && def.on === "award") {
      changed = true;
      return { ...o, count: o.count + ev.n };
    }
    changed = true;
    return { ...o, count: o.count + 1 };
  });
  return changed ? { ...run, objectives: next } : run;
}

export interface Settled {
  run: RunState;
  completed: { text: string; reward: { cash: number; rd: number; fans: number } }[];
}

/**
 * Check the board: pay out anything that is finished and hand out a fresh
 * objective of the same tier so there are always three to chase.
 */
export function settleObjectives(run: RunState): Settled {
  const list = run.objectives ?? [];
  if (!list.length) return { run, completed: [] };

  const completed: Settled["completed"] = [];
  let cash = 0;
  let rd = 0;
  let fans = 0;
  const notices = [...run.notices];

  const next = list.map((o) => {
    const view = objectiveView(o, run);
    if (o.done || !view.done) return o;
    const def = OBJ_BY_ID[o.def];
    cash += view.reward.cash;
    rd += view.reward.rd;
    fans += view.reward.fans;
    completed.push({ text: view.text, reward: view.reward });
    notices.push(`Objective complete: ${view.text} (+${gbpShort(view.reward.cash)}, +${view.reward.rd} RD)`);
    return rollObjective(run, def?.tier ?? "short");
  });

  if (!completed.length) return { run, completed };
  return {
    run: {
      ...run,
      objectives: next,
      cash: run.cash + cash,
      rd: run.rd + rd,
      fans: run.fans + fans,
      notices: notices.slice(-40),
    },
    completed,
  };
}

/* =================================================================== */
/*  production floor — what a producer's skill is worth                 */
/* =================================================================== */

export interface DeskStats {
  /** points each bubble is worth (1..5) */
  power: number;
  /** ms between bubbles at this desk */
  rate: number;
  /** 0..3, drives how bright the bubble looks */
  tier: number;
  /** multiplier on how many editing notes this desk files */
  bugMult: number;
  /** chance a bubble is a great idea */
  starChance: number;
}

const OUTPUT_WORDS = ["Faltering", "Steady", "Sharp", "Brilliant", "Masterful"];

/**
 * A producer's skill is the whole personality of their desk: it sets how much
 * each bubble is worth, how fast they make them, how often they make mistakes
 * and how often they strike gold.
 */
export function deskStats(skill: number): DeskStats {
  const s = Math.max(0, Math.min(99, skill));
  return {
    power: 1 + Math.floor(s / 20),
    rate: Math.max(680, 2_450 - s * 15),
    tier: Math.min(3, Math.floor(s / 25)),
    bugMult: Math.max(0.5, 1.3 - s / 190),
    starChance: 0.018 + s / 1_100,
  };
}

export const deskOutputLabel = (skill: number) =>
  OUTPUT_WORDS[Math.max(0, Math.min(4, Math.floor(skill / 20)))] ?? "Steady";

/* =================================================================== */
/*  staff — morale, growth, workshops                                   */
/* =================================================================== */

export type Mood = "inspired" | "happy" | "flat" | "burnt";

export interface MoodView {
  mood: Mood;
  label: string;
  color: string;
  /** short reason shown under the name */
  note: string;
}

export function staffMood(s: Staff): MoodView {
  const morale = s.morale ?? 70;
  const stam = s.stamina ?? 100;
  const drive = morale * 0.6 + stam * 0.4;
  if (drive >= 88) return { mood: "inspired", label: "Inspired", color: "#ffd166", note: "Working at full stretch" };
  if (drive >= 62) return { mood: "happy", label: "Happy", color: "#5ef0c0", note: "Comfortable" };
  if (drive >= 38) return { mood: "flat", label: "Flat", color: "#3be1ff", note: "Needs a break soon" };
  return { mood: "burnt", label: "Burnt out", color: "#ff4d8d", note: "Morale and energy are shot" };
}

/**
 * What a staff member actually delivers on the floor right now.
 * Skill drives it, but morale and stamina swing it by about ±25%, which is
 * what makes resting and workshops worth paying for.
 */
export function staffOutput(s: Staff, t: PointType): number {
  const base = staffPoint(s, t);
  const morale = (s.morale ?? 70) / 100;
  const stam = (s.stamina ?? 100) / 100;
  const mult = 0.58 + 0.26 * morale + 0.26 * stam; // 0.58 .. 1.10
  return Math.max(4, Math.min(99, Math.round(base * mult)));
}

/** Every 10 XP nudges the staff member's own discipline up by one. */
export const XP_PER_TICK = 10;

export function growStaff(s: Staff, opts: { hit?: boolean; flop?: boolean; weeks?: number } = {}): Staff {
  const main = ROLE_POINT[s.role] as PointType;
  let xp = (s.xp ?? 0) + (opts.hit ? 5 : 3);
  let next = { ...s };
  while (xp >= XP_PER_TICK) {
    xp -= XP_PER_TICK;
    next = { ...next, [main]: Math.min(99, (next[main] as number) + 1) } as Staff;
  }
  const morale = clamp01to100(
    (s.morale ?? 70) - 13 + (opts.hit ? 12 : 0) - (opts.flop ? 8 : 0) + (opts.weeks ? opts.weeks * 2 : 0)
  );
  return { ...next, xp, morale };
}

function clamp01to100(n: number) {
  return Math.max(0, Math.min(100, n));
}

/** Workshops cost cash (a money sink) and get pricier as they stack up. */
export function trainCost(s: Staff): number {
  const main = staffPoint(s, ROLE_POINT[s.role]);
  const times = s.trained ?? 0;
  return Math.round((12_000 + main * 700) * Math.pow(1.85, times) / 500) * 500;
}

export function applyTraining(s: Staff): Staff {
  const main = ROLE_POINT[s.role] as PointType;
  const bump = 3 + Math.floor(Math.random() * 4);
  return {
    ...s,
    [main]: Math.min(99, (staffPoint(s, main) as number) + bump),
    morale: clamp01to100((s.morale ?? 70) + 26),
    stamina: clamp01to100((s.stamina ?? 100) + 18),
    trained: (s.trained ?? 0) + 1,
  } as Staff;
}

/* =================================================================== */
/*  career start / advance                                              */
/* =================================================================== */

/** A fresh career, with the market rolled and the objective board filled. */
export function newCareer(studio: string, showrunner: string): RunState {
  const base = initialRun(studio, showrunner);
  return {
    ...base,
    market: rollMarket(0),
    objectives: [rollObjective(base, "short"), rollObjective(base, "season"), rollObjective(base, "career")],
    seasonLog: [],
  };
}

/** Called after the calendar moves: rolls the market when the season turns. */
export function rollSeasonIfNeeded(before: RunState, after: RunState): RunState {
  if (seasonView(before.week).index === seasonView(after.week).index) return after;
  const market = rollMarket(after.week);
  const v = seasonView(after.week);
  const hot = GENRES.find((g) => g.id === market.hot)?.label ?? "?";
  const cold = GENRES.find((g) => g.id === market.cold)?.label ?? "?";
  return {
    ...after,
    market,
    seasonLog: [...(after.seasonLog ?? []), after.week].slice(-24),
    notices: [
      ...after.notices,
      `${SEASON_NAMES[v.season]} ${v.year} — ${hot} is the talk of the season, nobody wants ${cold}.`,
    ].slice(-40),
  };
}
