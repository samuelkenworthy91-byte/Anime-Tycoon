/* ============================================================================
 *  LEGACY & DYNASTY — the late game beyond the twelve-year career.
 *
 *  Year 12 ends the CAMPAIGN, not the studio. The retrospective here scores
 *  the career against the whole industry, hands out a rank, and opens the
 *  door to Dynasty Mode: an endless run where the industry gets stronger
 *  around you, long-serving staff mentor the next generation, and money
 *  finds its way into enormous optional investments and industry records.
 *
 *  Everything is deterministic from the run state (and bounded), so it
 *  survives save/load and stays light enough for a 20+ year save.
 * ========================================================================== */
import {
  CAREER_WEEKS,
  GENRES,
  ROLE_LABEL,
  formatGBP,
  formatNum,
  yearOfWeek,
  type GenreId,
  type Staff,
  type StaffRole,
} from "./data";
import { gainXp, type LegendRec } from "./careers";
import type { RunState } from "./state";

/* ------------------------------------------------------------ dynasty state */

export type IndustryRecordId = "grossing" | "movie" | "franchise" | "awarded" | "fanbase";

/** one all-time industry record — the player competes with rivals for each */
export interface IndustryRecord {
  id: IndustryRecordId;
  label: string;
  /** studio currently holding the record */
  holder: string;
  /** the raw value being compared */
  value: number;
  /** the show that set it (grossing / movie records) */
  title: string | null;
  year: number;
  /** does the player hold it right now? */
  player: boolean;
}

/** a retired long-server who passed their craft on before leaving */
export interface LegacyRec extends LegendRec {
  /** the junior they mentored (null if nobody was left to mentor) */
  mentored: string | null;
}

export interface DynastyInvestment {
  id: string;
  boughtWeek: number;
}

export interface DynastyState {
  /** the week dynasty mode began (normally CAREER_WEEKS) */
  startedWeek: number;
  investments: DynastyInvestment[];
  /** the all-time industry records, refreshed each year end */
  records: IndustryRecord[];
  /** long-serving staff who retired into a legacy during dynasty */
  legacies: LegacyRec[];
}

/** backfill an old save's dynasty block (additive, non-destructive) */
export function migrateDynasty(raw: unknown, week: number): DynastyState | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Partial<DynastyState>;
  return {
    startedWeek: typeof d.startedWeek === "number" ? d.startedWeek : week,
    investments: Array.isArray(d.investments) ? d.investments : [],
    records: Array.isArray(d.records) ? d.records : [],
    legacies: Array.isArray(d.legacies) ? d.legacies : [],
  };
}

/* ----------------------------------------------------------- investments */

export interface InvestmentDef {
  id: string;
  name: string;
  cost: number;
  blurb: string;
  /** exact numeric effects, shown verbatim in the UI */
  effects: string[];
}

/** enormous optional money sinks — each is a permanent studio-wide buff */
export const DYNASTY_INVESTMENTS: InvestmentDef[] = [
  {
    id: "secondBuilding",
    name: "Second Production Building",
    cost: 6_000_000,
    blurb: "A satellite studio across town. Two pipelines, one empire.",
    effects: ["+1 concurrent production slot"],
  },
  {
    id: "campus",
    name: "World-Class Animation Campus",
    cost: 14_000_000,
    blurb: "The whole industry orbits this address.",
    effects: ["+10% all production points", "+2 staff desks"],
  },
  {
    id: "intl",
    name: "International Marketing Division",
    cost: 9_000_000,
    blurb: "Day-one simulcast in forty languages.",
    effects: ["+20% revenue from every release"],
  },
  {
    id: "render",
    name: "Advanced Render Farm",
    cost: 12_000_000,
    blurb: "A server hall that hums like a cathedral.",
    effects: ["+0.25 team speed on every production"],
  },
  {
    id: "museum",
    name: "Studio Museum & Archive",
    cost: 7_000_000,
    blurb: "Every storyboard ever drawn, behind glass.",
    effects: ["+4 research data/week", "+5% fans from every release"],
  },
  {
    id: "academy",
    name: "Talent Academy",
    cost: 11_000_000,
    blurb: "The next generation is trained in-house.",
    effects: ["staff earn +50% XP"],
  },
];

export const investmentDef = (id: string): InvestmentDef | null =>
  DYNASTY_INVESTMENTS.find((i) => i.id === id) ?? null;

/** the aggregate mechanical effect of every owned investment */
export interface DynastyFX {
  /** multiplier on every discipline's production points (1 = none) */
  pointMult: number;
  /** flat additive team speed */
  speed: number;
  /** extra research data per week */
  rdWeekly: number;
  /** release revenue multiplier */
  revenueMult: number;
  /** additive fraction on release fans (0.05 = +5%) */
  fanMult: number;
  /** staff XP multiplier */
  xpMult: number;
  /** extra concurrent production slots */
  extraProjects: number;
  /** extra staff desks */
  extraStaff: number;
}

export const NO_DYNASTY: DynastyFX = {
  pointMult: 1,
  speed: 0,
  rdWeekly: 0,
  revenueMult: 1,
  fanMult: 0,
  xpMult: 1,
  extraProjects: 0,
  extraStaff: 0,
};

export function dynastyFX(run: RunState): DynastyFX {
  const owned = new Set((run.dynasty?.investments ?? []).map((i) => i.id));
  if (!owned.size) return { ...NO_DYNASTY };
  const fx: DynastyFX = { ...NO_DYNASTY };
  if (owned.has("campus")) {
    fx.pointMult *= 1.1;
    fx.extraStaff += 2;
  }
  if (owned.has("secondBuilding")) fx.extraProjects += 1;
  if (owned.has("intl")) fx.revenueMult *= 1.2;
  if (owned.has("render")) fx.speed += 0.25;
  if (owned.has("museum")) {
    fx.rdWeekly += 4;
    fx.fanMult += 0.05;
  }
  if (owned.has("academy")) fx.xpMult *= 1.5;
  return fx;
}

/** null = the investment can be bought; otherwise a blocking reason */
export function investmentBlockReason(run: RunState, id: string): string | null {
  if (!run.dynasty) return "Requires Dynasty Mode";
  if ((run.dynasty.investments ?? []).some((i) => i.id === id)) return "Already owned";
  const def = investmentDef(id);
  if (!def) return "Unknown investment";
  if (run.cash < def.cost) return `Needs £${def.cost.toLocaleString("en-GB")}`;
  return null;
}

export function buyInvestment(run: RunState, id: string): RunState | null {
  if (investmentBlockReason(run, id)) return null;
  const def = investmentDef(id)!;
  const dynasty = run.dynasty ?? { startedWeek: run.week, investments: [], records: [], legacies: [] };
  return {
    ...run,
    cash: run.cash - def.cost,
    dynasty: { ...dynasty, investments: [...dynasty.investments, { id, boughtWeek: run.week }] },
    notices: [...run.notices, `🏦 ${def.name} acquired — ${def.blurb}`],
  };
}

/* ------------------------------------------------------------ difficulty */

export interface DynastyDifficulty {
  /** multiplier on the weekly wage bill */
  salaryMult: number;
  /** added to the review bar — the audience expects more */
  expectationBoost: number;
  /** added to every rival greenlight's quality bias */
  rivalBoost: number;
  /** extra fatigue every continuation adds */
  fatigueAdd: number;
  /** fatigue recovery multiplier (<1 = recovers slower) */
  restMult: number;
}

/** which dynasty year we are in (0 = the first year after the campaign) */
export const dynastyYear = (run: RunState): number => {
  if (!run.dynasty) return 0;
  return Math.max(0, Math.floor((run.week - (run.dynasty.startedWeek ?? CAREER_WEEKS)) / 48));
};

/** the late game gets harder through wages, expectations, rivals and fatigue —
 *  deliberately, not through bigger numbers alone. */
export function dynastyDifficulty(run: RunState): DynastyDifficulty {
  const y = dynastyYear(run);
  return {
    salaryMult: 1 + Math.min(1.2, y * 0.06),
    expectationBoost: Math.min(10, y * 1.2),
    rivalBoost: Math.min(6, y * 0.6),
    fatigueAdd: Math.min(10, y * 0.8),
    restMult: Math.max(0.55, 1 - y * 0.03),
  };
}

export const dynastySalaryMult = (run: RunState): number =>
  run.dynasty ? dynastyDifficulty(run).salaryMult : 1;

export const dynastyAudienceBar = (run: RunState): number =>
  run.dynasty ? dynastyDifficulty(run).expectationBoost : 0;

/* ------------------------------------------------------------ staff legacy */

export interface MentorResult {
  staff: Staff[];
  mentored: string | null;
  notice: string | null;
}

/** a retiring legend passes their craft to a same-role junior before they go */
export function mentorJunior(staff: Staff[], retiree: Staff): MentorResult {
  const junior = staff
    .filter((s) => s.id !== retiree.id && s.role === retiree.role && s.level < retiree.level)
    .sort((a, b) => a.level - b.level)[0];
  if (!junior) return { staff, mentored: null, notice: null };
  const g = gainXp(junior, 400);
  const boosted = { ...g.staff, morale: Math.min(100, (g.staff.morale ?? 70) + 12) };
  const next = staff.map((s) => (s.id === junior.id ? boosted : s));
  return {
    staff: next,
    mentored: junior.name,
    notice: `🎓 ${retiree.name} mentors ${junior.name} before retiring — ${junior.name.split(" ")[0]} inherits their craft (+400 XP).`,
  };
}

/* -------------------------------------------------------- industry records */

function best(
  a: { holder: string; value: number; title: string | null; year: number; player: boolean },
  b: { holder: string; value: number; title: string | null; year: number; player: boolean }
) {
  return b.value > a.value ? b : a;
}

const blank = (holder: string, year: number, player: boolean) => ({
  holder,
  value: 0,
  title: null as string | null,
  year,
  player,
});

/** the all-time records across the player and every rival studio */
export function computeIndustryRecords(run: RunState): IndustryRecord[] {
  const studios = run.rivalWorld.studios;
  const thisYear = yearOfWeek(run.week);

  /* single-release revenue — the biggest single payday in history */
  let grossing = blank(run.studio, thisYear, true);
  for (const f of Object.values(run.franchises))
    for (const e of f.entries)
      grossing = best(grossing, { holder: run.studio, value: e.revenue, title: e.title, year: yearOfWeek(e.week), player: true });
  for (const s of studios)
    for (const rel of s.releases)
      grossing = best(grossing, { holder: s.name, value: rel.revenue, title: rel.title, year: rel.year, player: false });

  /* the highest-grossing theatrical movie */
  let movie = blank(run.studio, thisYear, true);
  for (const f of Object.values(run.franchises))
    for (const e of f.entries)
      if (e.kind === "movie")
        movie = best(movie, { holder: run.studio, value: e.revenue, title: e.title, year: yearOfWeek(e.week), player: true });
  for (const s of studios)
    for (const rel of s.releases)
      if (rel.kind === "movie")
        movie = best(movie, { holder: s.name, value: rel.revenue, title: rel.title, year: rel.year, player: false });

  /* the longest-lived franchise (entry count) */
  let franchise = blank(run.studio, thisYear, true);
  for (const f of Object.values(run.franchises))
    franchise = best(franchise, { holder: run.studio, value: f.entries.length, title: f.baseTitle, year: yearOfWeek(f.lastEntryWeek), player: true });
  for (const s of studios)
    for (const f of s.franchises)
      franchise = best(franchise, { holder: s.name, value: f.entries, title: f.baseTitle, year: yearOfWeek(f.lastEntryWeek), player: false });

  /* most decorated studio */
  let awarded = { holder: run.studio, value: run.awards, title: null as string | null, year: thisYear, player: true };
  for (const s of studios) awarded = best(awarded, { holder: s.name, value: s.awards, title: null, year: thisYear, player: false });

  /* largest fanbase */
  let fanbase = { holder: run.studio, value: run.fans, title: null as string | null, year: thisYear, player: true };
  for (const s of studios) fanbase = best(fanbase, { holder: s.name, value: s.fans, title: null, year: thisYear, player: false });

  return [
    { id: "grossing", label: "Highest-Grossing Show", ...grossing },
    { id: "movie", label: "Most Successful Movie", ...movie },
    { id: "franchise", label: "Longest Franchise", ...franchise },
    { id: "awarded", label: "Most Awarded Studio", ...awarded },
    { id: "fanbase", label: "Largest Fanbase", ...fanbase },
  ];
}

/* ------------------------------------------------------------- evaluation */

export type CareerRankId = "failed" | "cult" | "regular" | "major" | "legendary" | "empire";

export interface CareerRank {
  id: CareerRankId;
  label: string;
  color: string;
  blurb: string;
}

export const CAREER_RANKS: CareerRank[] = [
  { id: "failed", label: "Failed Studio", color: "#ff5e5e", blurb: "The doors closed early, and the industry barely noticed." },
  { id: "cult", label: "Cult Studio", color: "#a78bfa", blurb: "A few diehard fans will defend you forever. The accountants won't." },
  { id: "regular", label: "Industry Regular", color: "#3be1ff", blurb: "A dependable house that shipped real shows for twelve years." },
  { id: "major", label: "Major Studio", color: "#5ef0c0", blurb: "A name the whole industry watches. Hits, fans and franchises." },
  { id: "legendary", label: "Legendary Studio", color: "#ffd166", blurb: "Your run changed what anime means to a generation." },
  { id: "empire", label: "Anime Empire", color: "#ff8fc7", blurb: "The industry orbits you. Records fall, rivals kneel, legends retire here." },
];

export const careerRank = (id: CareerRankId): CareerRank =>
  CAREER_RANKS.find((r) => r.id === id) ?? CAREER_RANKS[0];

/** 0..20 score from a value crossing a list of [threshold, score] steps */
const scale = (v: number, steps: [number, number][]): number => {
  let s = 0;
  for (const [t, score] of steps) if (v >= t) s = score;
  return Math.max(0, Math.min(20, s));
};

const clamp20 = (v: number) => Math.max(0, Math.min(20, Math.round(v)));

export interface CareerCategory {
  id: string;
  label: string;
  /** raw metric for the UI */
  value: number;
  display: string;
  score: number;
  max: number;
}

export interface CareerHistory {
  biggestHit: { title: string; score: number; year: number } | null;
  biggestFlop: { title: string; score: number; year: number } | null;
  longestFranchise: { title: string; entries: number; revenue: number } | null;
  favouriteStaff: { name: string; role: StaffRole; shows: number } | null;
  mostProfitableIp: { title: string; revenue: number } | null;
  awards: number;
  highestRival: { name: string; rank: number } | null;
  totalShows: number;
  timeline: { year: number; text: string }[];
}

export interface CareerEvaluation {
  total: number;
  max: number;
  rank: CareerRank;
  categories: CareerCategory[];
  history: CareerHistory;
}

/** score the twelve-year career across nine categories and produce the
 *  retrospective history the studio deserves. Pure and deterministic. */
export function runCareerEvaluation(run: RunState): CareerEvaluation {
  const entries = Object.values(run.franchises).flatMap((f) => f.entries);
  const totalEntries = entries.length;
  const rank = Math.max(1, run.rivalWorld.playerRank || 1);
  const staff = run.staff;
  const highStaff = staff.filter((s) => s.level >= 9).length;
  const midStaff = staff.filter((s) => s.level >= 6).length;
  const sumRivalry = run.rivalWorld.studios.reduce((a, s) => a + s.rivalry, 0);
  const collapsed = run.rivalWorld.studios.filter((s) => s.status === "collapsed").length;

  const categories: CareerCategory[] = [
    {
      id: "revenue",
      label: "Total Revenue",
      value: run.totalRevenue,
      display: formatGBP(run.totalRevenue),
      score: scale(run.totalRevenue, [
        [0, 0], [500_000, 2], [1_000_000, 4], [2_000_000, 6], [5_000_000, 9],
        [10_000_000, 12], [20_000_000, 15], [40_000_000, 18], [80_000_000, 20],
      ]),
      max: 20,
    },
    {
      id: "fans",
      label: "Fanbase",
      value: run.fans,
      display: formatNum(run.fans),
      score: scale(run.fans, [
        [0, 0], [10_000, 2], [50_000, 4], [200_000, 6], [500_000, 9],
        [1_000_000, 12], [2_000_000, 15], [4_000_000, 18], [8_000_000, 20],
      ]),
      max: 20,
    },
    {
      id: "awards",
      label: "Awards",
      value: run.awards,
      display: String(run.awards),
      score: clamp20(run.awards * 2),
      max: 20,
    },
    {
      id: "best",
      label: "Best Show",
      value: run.bestScore,
      display: `${run.bestScore}/40`,
      score: clamp20(run.bestScore / 2),
      max: 20,
    },
    {
      id: "franchises",
      label: "Franchises Built",
      value: Object.keys(run.franchises).length,
      display: `${Object.keys(run.franchises).length} IPs · ${totalEntries} entries`,
      score: clamp20(Object.keys(run.franchises).length * 2 + Math.min(6, totalEntries)),
      max: 20,
    },
    {
      id: "rank",
      label: "Studio Rank",
      value: rank,
      display: `#${rank} in the industry`,
      score: Math.max(0, 20 - (rank - 1) * 3),
      max: 20,
    },
    {
      id: "staff",
      label: "Staff Developed",
      value: run.legends.length + (run.dynasty?.legacies.length ?? 0) + highStaff,
      display: `${run.legends.length + (run.dynasty?.legacies.length ?? 0)} legends · ${highStaff} elite · ${midStaff} senior`,
      score: clamp20(
        (run.legends.length + (run.dynasty?.legacies.length ?? 0)) * 4 + highStaff * 2 + midStaff
      ),
      max: 20,
    },
    {
      id: "rivals",
      label: "Rival Performance",
      value: Math.round(sumRivalry / 10) / 10 + collapsed * 10,
      display: `${collapsed} rival${collapsed === 1 ? "" : "s"} collapsed · rivalry heat ${sumRivalry}`,
      score: clamp20(Math.round(sumRivalry / 40) + collapsed * 4),
      max: 20,
    },
    {
      id: "hof",
      label: "Hall of Fame Productions",
      value: run.hallOfFame.length,
      display: String(run.hallOfFame.length),
      score: clamp20(run.hallOfFame.length * 4),
      max: 20,
    },
  ];

  const total = categories.reduce((a, c) => a + c.score, 0);
  const max = categories.reduce((a, c) => a + c.max, 0);
  const rankId: CareerRankId =
    total >= 150 ? "empire" : total >= 125 ? "legendary" : total >= 100 ? "major" : total >= 70 ? "regular" : total >= 40 ? "cult" : "failed";

  /* ---- history: the hits, flops, favourites and the timeline ---- */
  let biggestHit: CareerHistory["biggestHit"] = null;
  let biggestFlop: CareerHistory["biggestFlop"] = null;
  for (const e of entries) {
    if (!biggestHit || e.score > biggestHit.score)
      biggestHit = { title: e.title, score: e.score, year: yearOfWeek(e.week) };
    if (e.score < 15 && (!biggestFlop || e.score < biggestFlop.score))
      biggestFlop = { title: e.title, score: e.score, year: yearOfWeek(e.week) };
  }
  if (!biggestHit && run.hallOfFame.length) {
    const h = run.hallOfFame[run.hallOfFame.length - 1];
    biggestHit = { title: h.title, score: h.score, year: yearOfWeek(h.week) };
  }

  let longestFranchise: CareerHistory["longestFranchise"] = null;
  let mostProfitableIp: CareerHistory["mostProfitableIp"] = null;
  for (const f of Object.values(run.franchises)) {
    if (!longestFranchise || f.entries.length > longestFranchise.entries)
      longestFranchise = { title: f.baseTitle, entries: f.entries.length, revenue: f.totalRevenue };
    if (!mostProfitableIp || f.totalRevenue > mostProfitableIp.revenue)
      mostProfitableIp = { title: f.baseTitle, revenue: f.totalRevenue };
  }

  let favouriteStaff: CareerHistory["favouriteStaff"] = null;
  for (const s of staff) {
    const shows = (s.shows ?? []).length;
    if (!favouriteStaff || shows > favouriteStaff.shows)
      favouriteStaff = { name: s.name, role: s.role, shows };
  }

  let highestRival: CareerHistory["highestRival"] = null;
  for (const s of run.rivalWorld.studios) {
    if (s.status === "collapsed") continue;
    if (!highestRival || s.rank < highestRival.rank)
      highestRival = { name: s.name, rank: s.rank };
  }

  const timeline: { year: number; text: string }[] = [];
  for (const f of Object.values(run.franchises)) {
    if (f.entries.length)
      timeline.push({ year: yearOfWeek(f.entries[0].week), text: `Founded “${f.baseTitle}”` });
  }
  for (const h of run.hallOfFame)
    timeline.push({ year: yearOfWeek(h.week), text: `“${h.title}” entered the Hall of Fame (${h.score}/40)` });
  for (const l of run.legends)
    timeline.push({ year: yearOfWeek(l.retiredWeek), text: `${l.name} retired as a studio legend` });
  for (const l of run.dynasty?.legacies ?? [])
    timeline.push({
      year: yearOfWeek(l.retiredWeek),
      text: `${l.name} retired${l.mentored ? `, mentoring ${l.mentored}` : ""} into the studio legacy`,
    });
  timeline.sort((a, b) => a.year - b.year);

  return {
    total,
    max,
    rank: careerRank(rankId),
    categories,
    history: {
      biggestHit,
      biggestFlop,
      longestFranchise,
      favouriteStaff,
      mostProfitableIp,
      awards: run.awards,
      highestRival,
      totalShows: run.showsMade,
      timeline: timeline.slice(-30),
    },
  };
}

/* -------------------------------------------------------------- dynasty on */

/** flip the campaign into Dynasty Mode — the save lives on, indefinitely */
export function beginDynastyMode(run: RunState): RunState {
  if (run.dynasty) return run;
  const dynasty: DynastyState = {
    startedWeek: Math.max(run.week, CAREER_WEEKS),
    investments: [],
    records: computeIndustryRecords(run),
    legacies: [],
  };
  return {
    ...run,
    dynasty,
    notices: [
      ...run.notices,
      "🏯 DYNASTY MODE — the campaign is over, but the studio endures. The industry only gets hungrier.",
    ],
  };
}

/* ---------------------------------------------------------------- helpers */

/** the staff capacity of the studio, including dynasty investments */
export const dynastyExtraStaff = (run: RunState): number =>
  run.dynasty ? dynastyFX(run).extraStaff : 0;

export const genreLabel = (id: GenreId): string => GENRES.find((g) => g.id === id)?.label ?? id;

export const roleLabel = (role: StaffRole): string => ROLE_LABEL[role];
