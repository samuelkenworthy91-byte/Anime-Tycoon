import {
  GENRES,
  ARCS,
  ARC_COMBOS,
  ARC_RESEARCH_COMBOS,
  ARC_RESEARCH_GENRE_KEYS,
  OFFICES,
  PRODUCTION_SCOPES,
  RESEARCH,
  CAREER_WEEKS,
  AIR_WEEKS,
  castById,
  arcGenreFit,
  comboKey,
  dateLabel,
  PUN_TITLES,
  RIVAL_STUDIOS,
  ROLE_POINT,
  staffPoint,
  rollContract,
  type Contract,
  type AnimeType,
  type Draft,
  type GenreId,
  type PointType,
  type Arc,
  type Staff,
} from "./data";
import {
  inferAnimeType,
  isActiveGenre,
  migrateActiveGenre,
  migrateComboLevels,
  migrateDraftV2,
  migrateGenreList,
  migrateGenreRecord,
  migrateStaffGenre,
  migrateUnlockedGenres,
} from "./castV2Migration";
import { tierOf, type ShowResult, type TierKey } from "./scoring";
import {
  bumpRivalry,
  computeRankings,
  creditAward,
  creditPoach,
  finalizeYear,
  initRivalWorld,
  migrateRivalWorld,
  pickPoacher,
  planRivalYear,
  removeRivalTalent,
  rivalTalentById,
  rivalTalentToStaff,
  rollRivalryEvents,
  tickRivalWeek,
  yearRivalReleases,
  type RankingInput,
  type RivalWorld,
} from "./rivals";
import {
  AWARD_XP,
  CONTRACT_XP,
  HEAD_MIN_LEVEL,
  HEAD_MIN_OFFICE,
  HEAD_SALARY_MULT,
  HEAD_TITLES,
  RETIRE_CHANCE,
  TRAIN_COOLDOWN,
  WEEKLY_XP,
  bondKey,
  bondKind,
  ensureCareer,
  gainXp,
  hasTrait,
  levelTitle,
  marketSalary,
  moraleDelta,
  moraleOf,
  personMod,
  poachable,
  releaseXp,
  retirementEligible,
  recordShow,
  rollHire,
  studioPointMult,
  studioProduction,
  toLegend,
  trainCost,
  trainXp,
  wantsRaise,
  type HeadSlot,
  type Heads,
  type LegendRec,
  type StaffEvent,
} from "./careers";
import {
  continuationBlock,
  continuationDef,
  createFranchise,
  franchiseBoost,
  MERCH_COOLDOWN,
  merchBlock,
  merchProductById,
  merchReturn,
  migrateFranchise,
  recordContinuation,
  tickFranchise,
  type EntryKind,
  type Franchise,
} from "./franchise";
import {
  REP_DELIVERED,
  REP_EXCELLENT,
  REP_LATE,
  REP_MISSED_QUALITY,
  REP_START,
  NEGOTIATE_ADVANCE_MULT,
  NEGOTIATE_SHARE_DELTA,
  PARTNERS,
  adaptationCommission,
  attentionMult,
  driftMarket,
  emergencyCommission,
  initMarket,
  marketMult,
  negotiationChance,
  partnerById,
  pruneReleases,
  rollCommission,
  rollMarketEvent,
  type Commission,
  type MarketEvent,
  type MarketState,
  type ReleaseRecord,
} from "./market";
import {
  MAX_TIER,
  facilityDef,
  facilityFX,
  facilityUpkeep,
  nextTier,
  slotsUsed,
  type Facilities,
  type FacilityId,
} from "./facilities";
import {
  activeProjects,
  applyMilestoneOutcome,
  projectOfStaff,
  type StaffModFn,
  assignedStaffIds,
  computeProjectResult,
  draftCost,
  makeProject,
  projectUpfront,
  tickProjectsWeek,
  tickProjectsDay,
  toggleAssign,
  type MilestoneOutcome,
  type Project,
  type RushAssignment,
} from "./projects";
import {
  computeIndustryRecords,
  dynastyAudienceBar,
  dynastyDifficulty,
  dynastyFX,
  dynastySalaryMult,
  mentorJunior,
  migrateDynasty,
  type DynastyState,
} from "./legacy";
import { tickDelegated } from "./automation";
import { projectLoadMap } from "./capacity";
import {
  contractWeeklyOutput,
  showrunnerBubbleOutput,
  LIVE_WORK_PULSES_PER_DAY,
  SHOWRUNNER_CONTRACT_PULSE_CHANCE,
  rushBoostPoint,
  rushResearchCost,
  showrunnerContractSkill,
  researchWeeks,
  trainingWeeks,
  type ContractAssignment,
  type ResearchJob,
  type TrainingJob,
} from "./studioOps";
import { rollStudioEvent, type StudioEvent } from "./events";

export type { Franchise, EntryKind } from "./franchise";

export interface HofEntry {
  title: string;
  score: number;
  genres: GenreId[];
  animeType: AnimeType;
  legacyGenres?: string[];
  protag: string;
  week: number;
}

/** weekly income / fans still to arrive from aired shows */
export interface Payout {
  week: number;
  amount: number;
  fans: number;
  label: string;
}

export interface AwardNominee {
  title: string;
  studio: string;
  score: number;
  player: boolean;
}

export interface AwardCategory {
  name: string;
  blurb: string;
  nominees: AwardNominee[];
  winner: AwardNominee;
}

export interface AwardCeremony {
  year: number;
  categories: AwardCategory[];
  playerAwards: number;
}

export interface AudienceInsight {
  showKey: string;
  title: string;
  text: string;
  day: number;
}

export interface AudienceTestJob {
  showKey: string;
  title: string;
  startDay: number;
  completesDay: number;
  round: number;
  draft: Draft;
  result: ShowResult;
}

export interface RunState {
  /** locked canonical Cast/Genre schema marker */
  castGenreV2: 2;
  studio: string;
  showrunner: string;
  cash: number;
  fans: number;
  rd: number; // research data
  /** exact live-clock day; week remains the seven-day finance/industry cadence */
  day: number;
  week: number;
  officeLevel: number;
  showsMade: number;
  hits: number;
  totalRevenue: number;
  bestScore: number;
  staff: Staff[];
  candidates: Staff[];
  research: string[];
  genresUnlocked: GenreId[];
  mediumsUnlocked: string[];
  comboLevels: Record<string, number>;
  /** old Shonen/Shojo/removed-genre combo knowledge retained for archive/debug migration only */
  legacyComboLevels: Record<string, number>;
  /** studio familiarity with each individual genre; information unlocks as this rises */
  genreKnowledge: Partial<Record<GenreId, number>>;
  /** discovered cast chemistry ids */
  castCombos: string[];
  /** stable cast IDs whose fixed hidden affinity the player has discovered */
  castAffinityDiscovered: string[];
  /** discovered arc synergy ids */
  arcCombos: string[];
  /** arc ids bought with research data (rd-gated arcs) */
  arcUnlocked: string[];
  /** how many times each arc id has been shipped (stats stay hidden until then) */
  arcKnowledge: Record<string, number>;
  /** arc×genre relationships learned by shipping that exact pairing or by research */
  arcGenreKnowledge: Record<string, number>;
  /** best raw quality ever shipped — reviews compare against this */
  studioTop: number;
  franchises: Record<string, Franchise>;
  pendingSequel: string | null;
  contracts: Contract[];
  hallOfFame: HofEntry[];
  lastResult: ShowResult | null;
  lastDraft: Draft | null;
  bailouts: number;
  notices: string[];
  awards: number;
  /** money/fans trickling in week by week from aired shows */
  payouts: Payout[];
  /** the persistent rival-studios simulation */
  rivalWorld: RivalWorld;
  /** the player's releases this calendar year (for the ceremony) */
  yearShows: AwardNominee[];
  /** results of the most recent awards ceremony */
  awardsCeremony: AwardCeremony | null;
  /** income that landed this week (for the HUD) */
  incomeThisWeek: number;
  fansThisWeek: number;
  /** every show currently in the pipeline (or recently completed) */
  projects: Project[];
  /** built rooms: facility id → tier */
  facilities: Facilities;
  /** weeks each pair of staff has worked together ("idA~idB" → weeks) */
  bonds: Record<string, number>;
  /** department heads: slot → staff id */
  heads: Heads;
  /** pending salary requests / rival job offers */
  staffEvents: StaffEvent[];
  /** retired greats — each gives a permanent studio bonus */
  legends: LegendRec[];
  /** present once the campaign ends and Dynasty Mode begins */
  dynasty: DynastyState | null;
  /** genre/audience/medium demand — shifts every season */
  market: MarketState;
  /** recent releases (yours + rivals) flooding their genres */
  recentReleases: ReleaseRecord[];
  /** reputation 0..100 with each commissioner */
  partners: Record<string, number>;
  /** commission offers currently on the table */
  commissions: Commission[];
  /** pending market events awaiting a decision */
  marketEvents: MarketEvent[];
  /** pending studio dilemmas — 2–3 responses with real trade-offs */
  studioEvents: StudioEvent[];
  /** small freelance jobs now occupy real staff over real calendar weeks */
  contractJobs: ContractAssignment[];
  /** staff courses finish after several weeks instead of instantly */
  trainingJobs: TrainingJob[];
  /** studio technologies unlock after a timed research project */
  researchJobs: ResearchJob[];
  /** optional repeatable focus-group study of the most recently released show */
  audienceTest: AudienceTestJob | null;
  /** how many distinct findings have been extracted from each release */
  audienceTestCounts: Record<string, number>;
  /** persistent findings that can be consulted later in R&D / Records */
  audienceInsights: AudienceInsight[];
  /** employees who have exhausted their energy and are actively recuperating */
  staffResting: Record<string, boolean>;
  /** overseas licensing deal: +15% revenue until this week */
  revBoostUntil: number;
}

/** null = arc is pickable; otherwise a human-readable reason it's locked */
export const arcLockReason = (a: Arc, r: RunState): string | null => {
  if (!a.unlock) return null;
  const u = a.unlock;
  switch (u.kind) {
    case "rd":
      return r.arcUnlocked.includes(a.id) ? null : `Study blueprint (${u.cost} RD)`;
    case "genre":
      return r.genresUnlocked.includes(u.genre) ? null : `Requires the ${GENRES.find((g) => g.id === u.genre)?.label ?? u.genre} licence`;
    case "franchise":
      return Object.keys(r.franchises).length > 0 ? null : "Requires owning a franchise";
    case "hits":
      return r.hits >= u.n ? null : `Requires ${u.n} hit shows (${r.hits}/${u.n})`;
    case "shows":
      return r.showsMade >= u.n ? null : `Requires ${u.n} shows aired (${r.showsMade}/${u.n})`;
    case "score":
      return r.bestScore >= u.n ? null : `Requires a ${u.n}/40 review score (best: ${r.bestScore})`;
    case "staff":
      return r.staff.length >= u.n ? null : `Requires ${u.n} staff hired (${r.staff.length}/${u.n})`;
  }
};

/** twelve-year career — after this the studio enters Dynasty Mode */
export const MAX_WEEKS = CAREER_WEEKS;
export const START_CASH = 90_000;
export { AIR_WEEKS }; // re-exported for screens that read the broadcast length

export function initialRun(studio: string, showrunner: string): RunState {
  return {
    castGenreV2: 2,
    studio,
    showrunner,
    cash: START_CASH,
    fans: 0,
    rd: 12,
    day: 0,
    week: 0,
    officeLevel: 0,
    showsMade: 0,
    hits: 0,
    totalRevenue: 0,
    bestScore: 0,
    staff: [],
    candidates: [rollHire(0), rollHire(0), rollHire(0)],
    research: [],
    genresUnlocked: ["slice", "fantasy"],
    mediumsUnlocked: ["tv", "ona"],
    comboLevels: {},
    legacyComboLevels: {},
    genreKnowledge: {},
    castCombos: [],
    castAffinityDiscovered: [],
    arcCombos: [],
    arcUnlocked: [],
    arcKnowledge: {},
    arcGenreKnowledge: {},
    studioTop: 0,
    franchises: {},
    pendingSequel: null,
    contracts: [rollContract(0), rollContract(0), rollContract(0)].map((c) => contractForShowrunner(showrunner, c)),
    hallOfFame: [],
    lastResult: null,
    lastDraft: null,
    bailouts: 0,
    notices: [],
    awards: 0,
    payouts: [],
    rivalWorld: initRivalWorld(0),
    yearShows: [],
    awardsCeremony: null,
    incomeThisWeek: 0,
    fansThisWeek: 0,
    projects: [],
    facilities: {},
    bonds: {},
    heads: {},
    staffEvents: [],
    legends: [],
    dynasty: null,
    market: initMarket(),
    recentReleases: [],
    partners: Object.fromEntries(PARTNERS.map((p) => [p.id, REP_START])),
    commissions: [],
    marketEvents: [],
    studioEvents: [],
    contractJobs: [],
    trainingJobs: [],
    researchJobs: [],
    audienceTest: null,
    audienceTestCounts: {},
    audienceInsights: [],
    staffResting: {},
    revBoostUntil: 0,
  };
}

/** bring an older save up to the current shape (additive, non-destructive) */
export function migrateRun(raw: unknown): RunState {
  const r = raw as RunState;
  const unlocked = migrateUnlockedGenres(r.genresUnlocked);
  const combos = migrateComboLevels(r.comboLevels);
  const marketBase = initMarket();
  const marketRaw = r.market && typeof r.market === "object" ? r.market : marketBase;
  const market: MarketState = {
    genres: { ...marketBase.genres, ...migrateGenreRecord(marketRaw.genres) },
    audiences: { ...marketBase.audiences, ...(marketRaw.audiences ?? {}) },
    mediums: { ...marketBase.mediums, ...(marketRaw.mediums ?? {}) },
  };
  const migrateArcGenreKnowledge = (record: Record<string, number> | undefined) => {
    const next: Record<string, number> = {};
    for (const [key, value] of Object.entries(record ?? {})) {
      const split = key.lastIndexOf("|");
      const genre = migrateActiveGenre(split >= 0 ? key.slice(split + 1) : "");
      if (!genre) continue;
      const migrated = `${key.slice(0, split)}|${genre}`;
      next[migrated] = Math.max(next[migrated] ?? 0, value);
    }
    return next;
  };
  const wasV2 = r.castGenreV2 === 2;
  return {
    ...r,
    castGenreV2: 2,
    genresUnlocked: unlocked,
    comboLevels: combos.active,
    legacyComboLevels: { ...(r.legacyComboLevels ?? {}), ...combos.legacy },
    castAffinityDiscovered: Array.isArray(r.castAffinityDiscovered)
      ? [...new Set(r.castAffinityDiscovered.filter((id) => typeof id === "string" && !castById(id).legacyPlaceholder))]
      : [],
    projects: Array.isArray(r.projects) ? r.projects.map((pr) => ({
      ...pr,
      draft: migrateDraftV2(pr.draft, unlocked),
      rush: null,
      liveQuality: { ...(pr.liveQuality ?? { story: 0, art: 0, sound: 0 }) },
    })) : [],
    facilities: r.facilities && typeof r.facilities === "object" ? r.facilities : {},
    bonds: r.bonds && typeof r.bonds === "object" ? r.bonds : {},
    heads: r.heads && typeof r.heads === "object" ? r.heads : {},
    staffEvents: Array.isArray(r.staffEvents) ? r.staffEvents : [],
    legends: Array.isArray(r.legends) ? r.legends : [],
    dynasty: migrateDynasty((r as { dynasty?: unknown }).dynasty, r.week ?? 0) ?? null,
    market,
    recentReleases: Array.isArray(r.recentReleases) ? r.recentReleases.flatMap((release) => {
      const genre = migrateActiveGenre((release as { genre?: unknown }).genre);
      return genre ? [{ ...release, genre }] : [];
    }) : [],
    partners:
      r.partners && typeof r.partners === "object"
        ? { ...Object.fromEntries(PARTNERS.map((p) => [p.id, REP_START])), ...r.partners }
        : Object.fromEntries(PARTNERS.map((p) => [p.id, REP_START])),
    commissions: Array.isArray(r.commissions) ? r.commissions.flatMap((commission) => {
      const genre = migrateActiveGenre((commission as { genre?: unknown }).genre);
      return genre ? [{ ...commission, genre }] : [];
    }) : [],
    marketEvents: Array.isArray(r.marketEvents) ? r.marketEvents : [],
    studioEvents: Array.isArray(r.studioEvents) ? r.studioEvents : [],
    contractJobs: Array.isArray(r.contractJobs) ? r.contractJobs.map((j) => ({ ...j, showrunner: !!j.showrunner, liveProgressThisWeek: j.liveProgressThisWeek ?? 0 })) : [],
    trainingJobs: Array.isArray(r.trainingJobs) ? r.trainingJobs : [],
    researchJobs: Array.isArray(r.researchJobs) ? r.researchJobs : [],
    audienceTest: r.audienceTest && typeof r.audienceTest === "object"
      ? { ...r.audienceTest, draft: migrateDraftV2(r.audienceTest.draft, unlocked) }
      : null,
    audienceTestCounts: r.audienceTestCounts && typeof r.audienceTestCounts === "object" ? r.audienceTestCounts : {},
    audienceInsights: Array.isArray(r.audienceInsights) ? r.audienceInsights : [],
    day: typeof r.day === "number" ? r.day : (r.week ?? 0) * 7,
    staffResting: r.staffResting && typeof r.staffResting === "object" ? r.staffResting : {},
    genreKnowledge: migrateGenreRecord(r.genreKnowledge),
    arcCombos: Array.isArray(r.arcCombos) ? r.arcCombos : [],
    arcUnlocked: Array.isArray(r.arcUnlocked) ? r.arcUnlocked : [],
    arcKnowledge: r.arcKnowledge && typeof r.arcKnowledge === "object" ? r.arcKnowledge : {},
    arcGenreKnowledge: migrateArcGenreKnowledge(r.arcGenreKnowledge),
    revBoostUntil: typeof r.revBoostUntil === "number" ? r.revBoostUntil : 0,
    rivalWorld: migrateRivalWorld((r as { rivalWorld?: unknown }).rivalWorld ?? (r as { rivals?: unknown }).rivals ?? [], r.week ?? 0),
    franchises: Object.fromEntries(
      Object.entries(r.franchises ?? {}).map(([k, v]) => [k, migrateFranchise(k, v, r.week ?? 0)])
    ),
    hallOfFame: Array.isArray(r.hallOfFame) ? r.hallOfFame.map((entry) => {
      const legacyGenres = Array.isArray(entry.genres) ? entry.genres as unknown as string[] : [];
      return {
        ...entry,
        animeType: inferAnimeType((entry as { animeType?: unknown }).animeType, legacyGenres, entry.protag),
        genres: migrateGenreList(legacyGenres, entry.protag),
        legacyGenres: entry.legacyGenres ?? legacyGenres,
      };
    }) : [],
    lastDraft: r.lastDraft ? migrateDraftV2(r.lastDraft, unlocked) : null,
    notices: wasV2 ? (r.notices ?? []) : [...(r.notices ?? []), "Cast V2 migration complete: Anime Type, 21 active genres and hidden affinities are ready."],
    /* old staff get a full career, deterministically from their id, so the
       same person comes back with the same personality every load */
    staff: (r.staff ?? []).map((s) => ensureCareer(migrateStaffGenre({ ...s }), 0)),
    candidates: (r.candidates ?? []).map((s) => ensureCareer(migrateStaffGenre({ ...s }), r.week ?? 0)),
  };
}

export const office = (r: RunState) => OFFICES[r.officeLevel];
export const weeklyOutgoings = (r: RunState) =>
  office(r).rent + r.staff.reduce((a, s) => a + s.salary, 0) * dynastySalaryMult(r) + facilityUpkeep(r.facilities);

/** the studio's staff capacity — dynasty investments can add desks */
export const staffCapacity = (r: RunState) =>
  OFFICES[r.officeLevel].maxStaff + (r.dynasty ? dynastyFX(r).extraStaff : 0);

/** how much cash/fans the state expects to land in the next `weeks` weeks */
export function pendingIncome(r: RunState, weeks: number): number {
  const end = r.week + weeks;
  return r.payouts.reduce((a, p) => (p.week > r.week && p.week <= end ? a + p.amount : a), 0);
}

/* -------------------------------------------------------- cash forecast */
/** one week of cash flow, itemised, before any of it happens. Lets the
 *  studio see next week's money (bankruptcy included) while there's still
 *  time to do something about it — a contract, a merch push, cheaper… everything. */
export interface WeekForecast {
  /** the week being forecast (always current week + 1) */
  week: number;
  /** broadcast payouts due that week */
  income: number;
  /** weekly production burn for everything still in the pipeline */
  burn: number;
  /** broadcaster penalties for projects already past their deadline */
  lateFees: number;
  /** wages + rent + facilities bill (lands every 4th week, 0 otherwise) */
  payday: number;
  /** income − burn − lateFees − payday */
  net: number;
  /** cash + net — negative means the studio bounces that week */
  cashAfter: number;
}
export function forecastWeek(r: RunState): WeekForecast {
  const w = r.week + 1;
  const income = r.payouts.reduce((a, p) => (p.week === w ? a + p.amount : a), 0);
  const burnMult = studioProduction(r.heads ?? {}, r.staff).burnMult;
  const burn = activeProjects(r.projects).reduce((a, p) => a + Math.round(p.weeklyBurn * burnMult), 0);
  const lateFees = activeProjects(r.projects)
    .filter((p) => w > p.deadlineWeek)
    .reduce((a, p) => a + 1_500 + Math.round(draftCost(p.draft) * 0.015), 0);
  const payday = w % 4 === 0 ? weeklyOutgoings(r) * 4 : 0;
  const net = income - burn - lateFees - payday;
  return { week: w, income, burn, lateFees, payday, net, cashAfter: r.cash + net };
}

/* ------------------------------------------------------------------ year end */
function runCeremony(year: number, yearShows: AwardNominee[], rivalWorld: RivalWorld): AwardCeremony {
  const all: AwardNominee[] = [
    ...yearShows,
    ...yearRivalReleases(rivalWorld, year).map((r) => ({ title: r.title, studio: r.studio, score: r.score, player: false })),
  ];
  const byScore = [...all].sort((a, b) => b.score - a.score);

  const categories: AwardCategory[] = [];
  const best = byScore[0];
  if (best) {
    categories.push({
      name: "Anime of the Year",
      blurb: "The show that defined the year.",
      nominees: byScore.slice(0, Math.min(5, byScore.length)),
      winner: best,
    });
  }
  const rest = byScore.filter((n) => n !== best);
  if (rest.length) {
    categories.push({
      name: "Critics' Choice",
      blurb: "The panel's personal favourite.",
      nominees: rest.slice(0, Math.min(4, rest.length)),
      winner: rest[0],
    });
  }
  const people = all.length
    ? all[Math.floor(Math.random() * all.length)]
    : null;
  if (people && categories.length < 3) {
    const pool = [...all].sort((a, b) => b.score - a.score).slice(0, Math.min(4, all.length));
    categories.push({
      name: "People's Choice",
      blurb: "Voted by one million screaming fans.",
      nominees: pool,
      winner: people,
    });
  }

  return {
    year,
    categories,
    playerAwards: categories.filter((c) => c.winner.player).length,
  };
}

/** the player's stats in the shape the ranking table shares with rivals */
export const playerRankingInput = (r: RunState): RankingInput => ({
  name: r.studio,
  fans: r.fans,
  revenue: r.totalRevenue,
  masterpieces: r.hallOfFame.length,
  hits: r.hits,
  releases: r.showsMade,
  awards: r.awards,
});

/** the player's hottest IP — used to target franchise-flavoured events */
const topFranchiseFor = (franchises: Record<string, Franchise>) => {
  const top = Object.values(franchises)
    .filter((f) => f.popularity >= 50)
    .sort((a, b) => b.popularity - a.popularity)[0];
  return top ? { key: top.key, title: top.baseTitle, popularity: top.popularity } : null;
};

/** the Mogul Producer's golden rolodex sweetens every contract & brief */
const contractForShowrunner = (showrunner: string, c: Contract): Contract =>
  showrunner === "producer" ? { ...c, pay: Math.round((c.pay * 1.4) / 100) * 100 } : c;
const commissionForShowrunner = (showrunner: string, c: Commission): Commission =>
  showrunner === "producer"
    ? {
        ...c,
        advance: Math.round((c.advance * 1.3) / 5_000) * 5_000,
        bonus: Math.round((c.bonus * 1.3) / 5_000) * 5_000,
      }
    : c;

/** Advance the calendar: weekly payouts land, wages + rent charged at month end, rival shows air, and each year ends with the awards ceremony. */
export function advanceWeeks(r: RunState, n: number, opts: { liveDaysAlreadyApplied?: boolean } = {}): RunState {
  let cash = r.cash;
  let fans = r.fans;
  const notices = [...r.notices];
  let contracts = r.contracts;
  let payouts = r.payouts;
  let rivalWorld = r.rivalWorld;
  let yearShows = r.yearShows;
  let awards = r.awards;
  let awardsCeremony = r.awardsCeremony;
  let projects = r.projects ?? [];
  let rd = r.rd;
  let research = [...(r.research ?? [])];
  let arcCombos = [...(r.arcCombos ?? [])];
  let arcKnowledge = { ...(r.arcKnowledge ?? {}) };
  let arcGenreKnowledge = { ...(r.arcGenreKnowledge ?? {}) };
  let contractJobs = [...(r.contractJobs ?? [])];
  let trainingJobs = [...(r.trainingJobs ?? [])];
  let researchJobs = [...(r.researchJobs ?? [])];
  let incomeThisWeek = 0;
  let fansThisWeek = 0;
  const perWeek = weeklyOutgoings(r);

  /* staff, relationships and events evolve week by week */
  let staffArr = r.staff.map((x) => ensureCareer(x, r.week));
  let bonds = { ...(r.bonds ?? {}) };
  let events = [...(r.staffEvents ?? [])];
  let legends = [...(r.legends ?? [])];
  let dynasty = r.dynasty ?? null;
  const heads = r.heads ?? {};
  let market = r.market ?? initMarket();
  let recentReleases = [...(r.recentReleases ?? [])];
  let commissions = [...(r.commissions ?? [])];
  let marketEvents = [...(r.marketEvents ?? [])];
  let studioEvents = [...(r.studioEvents ?? [])];
  rivalWorld = { ...rivalWorld, studios: rivalWorld.studios.map((s) => ({ ...s, talent: [...s.talent] })) };
  let partners = { ...(r.partners ?? {}) };
  let franchises = { ...(r.franchises ?? {}) };

  /* facilities + department heads + retired legends → studio-wide effects */
  const baseFx = facilityFX(r.facilities);
  const spm = studioPointMult(heads, staffArr, legends);
  const dynFx = dynastyFX(r);
  const fx = {
    ...baseFx,
    pointMult: {
      story: baseFx.pointMult.story * spm.story * dynFx.pointMult,
      art: baseFx.pointMult.art * spm.art * dynFx.pointMult,
      sound: baseFx.pointMult.sound * spm.sound * dynFx.pointMult,
    },
    speed: baseFx.speed + dynFx.speed,
    rdWeekly: baseFx.rdWeekly + dynFx.rdWeekly,
    /* the Hype Machine's marketing office runs hot */
    hypeMult: baseFx.hypeMult * (r.showrunner === "marketer" ? 1.5 : 1),
  };
  const studio = { ...studioProduction(heads, staffArr), issueChanceMult: r.showrunner === "steady" ? 0.75 : 1 };
  const mods: StaffModFn = (st, p, team) => personMod(st, p, team, { bonds });

  for (let i = 1; i <= n; i++) {
    const w = r.week + i;

    /* weekly broadcast income trickles in */
    let wkIncome = 0;
    let wkFans = 0;
    for (const p of payouts) {
      if (p.week === w) {
        wkIncome += p.amount;
        wkFans += p.fans;
      }
    }
    if (wkIncome > 0 || wkFans > 0) {
      cash += wkIncome;
      fans += wkFans;
      incomeThisWeek += wkIncome;
      fansThisWeek += wkFans;
    }
    payouts = payouts.filter((p) => p.week !== w);

    /* Headless/legacy callers can still advance a whole week at once. The live
       app has already banked seven daily project ticks, so it skips this fallback. */
    if (!opts.liveDaysAlreadyApplied) {
      const loadMap = projectLoadMap(projects, staffArr, r.facilities, research);
      const tick = tickProjectsWeek(projects, staffArr, w, fx, mods, studio, loadMap);
      projects = tick.projects;
      cash += tick.cashDelta;
      notices.push(...tick.notices);
    }

    /* delegated projects run their own milestone sprints automatically */
    const dlg = tickDelegated(r, projects, staffArr, w, fx);
    projects = dlg.projects;
    staffArr = dlg.staff;
    rd += dlg.rd;
    cash += dlg.cash;
    notices.push(...dlg.notices);

    /* ------- background contract work: live bubbles are authoritative in the app;
       weekly fallback remains only for headless/legacy week jumps ------- */
    if (!opts.liveDaysAlreadyApplied) {
      const keep: ContractAssignment[] = [];
      for (const job of contractJobs) {
        const crew = staffArr.filter((s) => job.staffIds.includes(s.id) && !(r.staffResting ?? {})[s.id]);
        const runnerSkill = job.showrunner ? showrunnerContractSkill(r.showrunner, r.showsMade, job.contract.type) : 0;
        const baseline = contractWeeklyOutput(job.contract, crew, research, runnerSkill);
        const live = job.liveProgressThisWeek ?? 0;
        const progress = Math.min(job.contract.target, job.progress + Math.max(0, baseline - live));
        if (progress >= job.contract.target) {
          cash += job.contract.pay;
          rd += job.contract.rd;
          staffArr = staffArr.map((s) => {
            if (!job.staffIds.includes(s.id)) return s;
            return gainXp(s, CONTRACT_XP).staff;
          });
          notices.push(`✅ Contract delivered: ${job.contract.name} (+£${job.contract.pay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);
        } else if (w >= job.dueWeek) {
          const consolation = Math.max(1, Math.round(job.contract.rd / 3));
          rd += consolation;
          notices.push(`❌ Contract missed: ${job.contract.name} — ${progress}/${job.contract.target} progress (+${consolation} RD learned).`);
        } else {
          keep.push({ ...job, progress, liveProgressThisWeek: 0 });
        }
      }
      contractJobs = keep;
    }

    /* ------- courses complete after occupying the employee for weeks ------- */
    if (!opts.liveDaysAlreadyApplied) {
      const keep: TrainingJob[] = [];
      for (const job of trainingJobs) {
        const exists = staffArr.some((s) => s.id === job.staffId);
        if (!exists) continue;
        if (w < job.completesWeek) { keep.push(job); continue; }
        staffArr = staffArr.map((s) => {
          if (s.id !== job.staffId) return s;
          let nx = ensureCareer({ ...s, [job.focus]: Math.min(99, s[job.focus] + 1), lastTrainedWeek: w }, w);
          nx = moraleDelta(nx, 3);
          return gainXp(nx, trainXp(job.tier)).staff;
        });
        notices.push(`🎓 ${job.staffName} completes ${job.focus} training (+1 ${job.focus}, +${trainXp(job.tier)} XP).`);
      }
      trainingJobs = keep;
    }

    /* ------- research projects mature over calendar time ------- */
    if (!opts.liveDaysAlreadyApplied) {
      const keep: ResearchJob[] = [];
      for (const job of researchJobs) {
        if (w < job.completesWeek) { keep.push(job); continue; }
        if (!research.includes(job.researchId)) research.push(job.researchId);
        if (job.researchId === "narrative_analytics") {
          arcCombos = [...new Set([...arcCombos, ...ARC_RESEARCH_COMBOS])];
          for (const id of ARC_RESEARCH_COMBOS) {
            const combo = ARC_COMBOS.find((c) => c.id === id);
            for (const arcId of combo?.arcs ?? []) arcKnowledge[arcId] = Math.max(1, arcKnowledge[arcId] ?? 0);
          }
          notices.push("📚 Narrative Analytics adds several proven structures to the Studio Bible.");
        }
        if (job.researchId === "genre_studies") {
          for (const key of ARC_RESEARCH_GENRE_KEYS) arcGenreKnowledge[key] = Math.max(1, arcGenreKnowledge[key] ?? 0);
          notices.push("📚 Genre Studies reveals a starter set of arc-to-genre relationships.");
        }
        notices.push(`🔬 Research complete: ${job.name}!`);
      }
      researchJobs = keep;
    }

    /* the archive room quietly files away research */
    rd += fx.rdWeekly;

    /* ------- colleagues who work together grow bonds ------- */
    for (const p of projects) {
      if (p.stage === "airing" || p.stage === "done") continue;
      for (let ai = 0; ai < p.staffIds.length; ai++)
        for (let bi = ai + 1; bi < p.staffIds.length; bi++) {
          const k = bondKey(p.staffIds[ai], p.staffIds[bi]);
          bonds[k] = (bonds[k] ?? 0) + 1;
        }
    }

    /* ------- stamina, morale and experience, person by person ------- */
    {
      const busy = assignedStaffIds(projects);
      const opBusy = new Set([
        ...contractJobs.flatMap((j) => j.staffIds),
        ...trainingJobs.map((j) => j.staffId),
      ]);
      const drain = Math.max(1, 3 - fx.staminaSave);
      const rest = 9 + fx.staminaRest;
      staffArr = staffArr.map((st) => {
        let nx = { ...st };
        const proj = busy.has(st.id) ? projectOfStaff(projects, st.id) : null;
        if (proj) {
          if (!opts.liveDaysAlreadyApplied) nx.stamina = Math.max(12, nx.stamina - drain);
          /* morale while working */
          let dm = 0;
          if (nx.stamina < 35) dm -= 2; // overworked
          const team = staffArr.filter((x) => proj.staffIds.includes(x.id) && x.id !== st.id);
          if (team.some((x) => hasTrait(x, "genius"))) dm -= 1;
          if (team.some((x) => (bonds[bondKey(st.id, x.id)] ?? 0) >= 8 && bondKind(st, x) === "clash")) dm -= 1;
          if (hasTrait(st, "fanatic") && st.favGenre)
            dm += proj.draft.genres.includes(st.favGenre) ? 1 : -1;
          dm += fx.moraleRest;
          if (dm !== 0) nx = moraleDelta(nx, dm);
          /* experience from doing the work */
          const m = personMod(nx, proj, staffArr.filter((x) => proj.staffIds.includes(x.id)), { bonds });
          const g = gainXp(nx, WEEKLY_XP * m.xpMult * dynFx.xpMult);
          nx = g.staff;
          if (g.levelsGained > 0)
            notices.push(`${nx.name} is promoted to ${levelTitle(nx.level)} (Lv ${nx.level})!`);
        } else if (opBusy.has(st.id)) {
          if (!opts.liveDaysAlreadyApplied) nx.stamina = Math.max(12, nx.stamina - Math.max(1, drain - 1));
          const g = gainXp(nx, Math.max(1, WEEKLY_XP - 1) * dynFx.xpMult);
          nx = g.staff;
        } else {
          if (!opts.liveDaysAlreadyApplied) nx.stamina = Math.min(100, nx.stamina + rest);
          const cur = moraleOf(nx);
          let dm = cur < 70 ? 2 : cur > 70 ? -1 : 0;
          dm += fx.moraleRest;
          if (dm !== 0) nx = { ...nx, morale: Math.max(0, Math.min(100, cur + dm)) };
        }
        return nx;
      });
    }

    /* ------- quarterly reviews: raises requested, rivals come calling ------- */
    if (w % 12 === 0) {
      for (const st of staffArr) {
        if (events.length >= 2) break;
        if (events.some((e) => e.staffId === st.id)) continue;
        if (w - (st.lastEventWeek ?? -99) < 24) continue;
        if (wantsRaise(st, w)) {
          events.push({
            id: `ev${w}_${st.id}`,
            staffId: st.id,
            kind: "raise",
            amount: marketSalary(st),
            week: w,
            expiresWeek: w + 8,
          });
          staffArr = staffArr.map((x) => (x.id === st.id ? { ...x, lastEventWeek: w } : x));
          notices.push(`${st.name} requests a salary review (£${marketSalary(st).toLocaleString("en-GB")}/wk).`);
        } else if (poachable(st) && Math.random() < 0.35) {
          const poacher = pickPoacher(rivalWorld);
          if (poacher) {
            const offer = Math.round((st.salary * 1.6) / 10) * 10;
            events.push({
              id: `ev${w}_${st.id}`,
              staffId: st.id,
              kind: "poach",
              amount: offer,
              week: w,
              expiresWeek: w + 6,
              studio: poacher.name,
              studioId: poacher.id,
            });
            staffArr = staffArr.map((x) => (x.id === st.id ? { ...x, lastEventWeek: w } : x));
            notices.push(`${poacher.name} is courting ${st.name} (£${offer.toLocaleString("en-GB")}/wk offer)!`);
          }
        }
      }
    }

    /* ------- unanswered requests sour, unanswered offers may cost you ------- */
    for (const e of events.filter((e2) => w > e2.expiresWeek)) {
      const st = staffArr.find((x) => x.id === e.staffId);
      if (!st) continue;
      if (e.kind === "raise") {
        staffArr = staffArr.map((x) => (x.id === st.id ? moraleDelta(x, -12) : x));
        notices.push(`${st.name}'s salary request went unanswered — morale drops.`);
      } else if (moraleOf(st) < 45) {
        staffArr = staffArr.filter((x) => x.id !== st.id);
        projects = projects.map((p) => ({ ...p, staffIds: p.staffIds.filter((id) => id !== st.id) }));
        rivalWorld = creditPoach(rivalWorld, e.studioId);
        notices.push(`${st.name} accepts the rival offer and leaves for ${e.studio ?? "a rival studio"}.`);
      } else {
        staffArr = staffArr.map((x) => (x.id === st.id ? moraleDelta(x, -15) : x));
        notices.push(`${st.name} turned the rival down — but feels taken for granted.`);
      }
    }
    events = events.filter((e) => w <= e.expiresWeek && staffArr.some((x) => x.id === e.staffId));

    /* rival studios premiere their shows — flooding the market as they go */
    {
      const airingGenres = new Set<GenreId>();
      for (const p of projects) if (p.stage === "airing") p.draft.genres.forEach((g) => airingGenres.add(g));
      const rivalTick = tickRivalWeek(rivalWorld, w, { playerAiringGenres: airingGenres });
      rivalWorld = rivalTick.world;
      notices.push(...rivalTick.notices);
      recentReleases = [...pruneReleases(recentReleases, w), ...rivalTick.releaseRecords];
      for (const shift of rivalTick.trendShifts) {
        const before = market.genres[shift.genre] ?? 0;
        market = { ...market, genres: { ...market.genres, [shift.genre]: Math.max(-2, Math.min(2, before + shift.delta)) } };
      }
    }

    /* franchises cool off, rest up — and sometimes find a cult */
    if (w % 4 === 0) {
      const diff = r.dynasty ? dynastyDifficulty(r) : null;
      for (const [k, fr] of Object.entries(franchises)) {
        const t = tickFranchise(fr, w, { restMult: diff?.restMult ?? 1 });
        franchises = { ...franchises, [k]: t.franchise };
        if (t.notice) notices.push(t.notice);
      }
    }

    /* the market breathes every season */
    if (w % 12 === 0) {
      const drift = driftMarket(market);
      market = drift.market;
      notices.push(...drift.notices);
    }

    /* commissioners refresh their briefs */
    commissions = commissions.filter((c) => w <= c.expiresWeek);
    if (w % 10 === 0) {
      while (commissions.length < 3) commissions.push(commissionForShowrunner(r.showrunner, rollCommission(w, partners, market)));
      notices.push("New commission briefs are on the table — check the market.");
    }

    /* the occasional industry event */
    marketEvents = marketEvents.filter((e) => w <= e.expiresWeek);
    if (w % 8 === 0 && marketEvents.length === 0 && Math.random() < 0.35) {
      const ready = projects.find((p) => p.stage === "ready" && !p.commission);
      const lateStage = projects.find(
        (p) => p.milestone !== "edit" && (p.stage === "post" || p.stage === "marketing" || p.stage === "ready") && p.hype > 0
      );
      const top = Object.values(franchises)
        .filter((f) => f.popularity >= 50)
        .sort((a, b) => b.popularity - a.popularity)[0];
      const ev = rollMarketEvent(
        w,
        partners,
        ready?.id ?? null,
        lateStage?.id ?? null,
        top ? { key: top.key, title: top.baseTitle, popularity: top.popularity } : null
      );
      if (ev) {
        marketEvents = [ev];
        notices.push("📞 The phone rings — an industry offer needs an answer (see the market screen).");
      }
    }

    /* the occasional studio dilemma — slow cadence so it feels special */
    studioEvents = studioEvents.filter((e) => w <= e.expiresWeek);
    if (w % 9 === 0 && studioEvents.length === 0 && Math.random() < 0.45) {
      const sev = rollStudioEvent(w, {
        crew: staffArr.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          level: s.level,
          morale: moraleOf(s),
        })),
        active: projects
          .filter((p) => p.stage !== "airing" && p.stage !== "done")
          .map((p) => ({ id: p.id, title: p.draft.title, stage: p.stage, hype: p.hype, issues: p.issues })),
        topFranchise: topFranchiseFor(franchises),
      });
      if (sev) {
        studioEvents = [sev];
        notices.push("🎬 A studio dilemma lands on your desk — open the market to decide.");
      }
    }

    if (w % 4 === 0) {
      const bill = perWeek * 4;
      cash -= bill;
      notices.push(
        `Payday: wages + rent${facilityUpkeep(r.facilities) > 0 ? " + facilities" : ""} −£${bill.toLocaleString("en-GB")}.`
      );
    }
    if (w % 6 === 0)
      contracts = [rollContract(w), rollContract(w), rollContract(w)].map((c) => contractForShowrunner(r.showrunner, c));

    /* end of a calendar year: awards ceremony + rankings + fresh rival slate */
    if (w % 48 === 0) {
      const year = w / 48;
      const ceremony = runCeremony(year, yearShows, rivalWorld);
      awardsCeremony = ceremony;
      awards += ceremony.playerAwards;
      if (ceremony.playerAwards > 0) {
        const prize = 25_000 * ceremony.playerAwards;
        const fanPrize = 1_500 * ceremony.playerAwards;
        cash += prize;
        fans += fanPrize;
        notices.push(`🏆 ${r.studio} takes ${ceremony.playerAwards} award${ceremony.playerAwards > 1 ? "s" : ""} at the London Anime Awards (+£${prize.toLocaleString("en-GB")})!`);
      } else {
        notices.push(`The London Anime Awards: ${r.studio} goes home empty-handed.`);
      }
      if (ceremony.categories[0]) {
        const w2 = ceremony.categories[0].winner;
        notices.push(`Anime of the Year: “${w2.title}” (${w2.studio}, ${w2.score}/40).`);
        /* every winner banks an award — rival studios included */
        for (const cat of ceremony.categories) {
          if (!cat.winner.player) {
            const studio = rivalWorld.studios.find((s) => s.name === cat.winner.studio);
            if (studio) rivalWorld = creditAward(rivalWorld, studio.id);
          }
        }
        /* fighting for Anime of the Year breeds grudges */
        if (!w2.player) {
          const studio = rivalWorld.studios.find((s) => s.name === w2.studio);
          if (studio) rivalWorld = bumpRivalry(rivalWorld, studio.id, 5);
          notices.push(`The rivalry with ${w2.studio} deepens — they took Anime of the Year.`);
        } else if (ceremony.categories[0].nominees.some((n) => !n.player)) {
          /* your win over a rival stings them too */
          const closestRival = ceremony.categories[0].nominees
            .filter((n) => !n.player)
            .sort((a, b) => b.score - a.score)[0];
          const studio = rivalWorld.studios.find((s) => s.name === closestRival.studio);
          if (studio) rivalWorld = bumpRivalry(rivalWorld, studio.id, 3);
        }
      }
      /* the whole studio shares in an award year */
      if (ceremony.playerAwards > 0) {
        staffArr = staffArr.map((st) => {
          const g = gainXp(st, AWARD_XP * ceremony.playerAwards * dynastyFX(r).xpMult);
          if (g.levelsGained > 0)
            notices.push(`${st.name} is promoted to ${levelTitle(g.staff.level)} (Lv ${g.staff.level})!`);
          return moraleDelta({ ...g.staff, awardsWon: (g.staff.awardsWon ?? 0) + ceremony.playerAwards }, 8);
        });
      }

      /* the longest careers eventually end — a legend retires */
      const retiree = staffArr.find((st) => retirementEligible(st, w) && Math.random() < RETIRE_CHANCE);
      if (retiree) {
        const legend = toLegend(retiree, w);
        legends = [...legends, legend];
        /* in dynasty mode a retiring great passes their craft on first */
        if (dynasty) {
          const mentor = mentorJunior(staffArr, retiree);
          staffArr = mentor.staff;
          if (mentor.notice) notices.push(mentor.notice);
          dynasty = { ...dynasty, legacies: [...dynasty.legacies, { ...legend, mentored: mentor.mentored }] };
        }
        staffArr = staffArr.filter((x) => x.id !== retiree.id);
        projects = projects.map((p) => ({ ...p, staffIds: p.staffIds.filter((id) => id !== retiree.id) }));
        notices.push(
          `🌸 ${retiree.name} retires after ${Math.round((w - (retiree.joinedWeek ?? 0)) / 48)} years — a studio legend. Their craft lives on (+3% ${ROLE_POINT[retiree.role]} forever).`
        );
      }

      yearShows = [];
      /* strong rivalries occasionally boil over into industry events */
      for (const ev of rollRivalryEvents(rivalWorld, year)) {
        rivalWorld = bumpRivalry(rivalWorld, ev.studioId, 3);
        if (ev.kind === "bidwar") {
          const keys = Object.keys(partners);
          if (keys.length) {
            const k = keys[Math.floor(Math.random() * keys.length)];
            partners = { ...partners, [k]: Math.max(10, (partners[k] ?? REP_START) - 6) };
          }
        } else if (ev.kind === "spat") {
          fans = Math.max(0, fans - Math.round(fans * 0.02));
        } else if (ev.kind === "smear") {
          fans = Math.max(0, fans - Math.round(fans * 0.015));
        }
        notices.push(ev.text);
      }
      /* lock in the annual rankings (movement arrows) and plan the next year */
      const fy = finalizeYear(rivalWorld, {
        name: r.studio,
        fans,
        revenue: r.totalRevenue,
        masterpieces: r.hallOfFame.length,
        hits: r.hits,
        releases: r.showsMade,
        awards,
      });
      rivalWorld = fy.world;
      const py = planRivalYear(rivalWorld, year + 1, w, { qualityBoost: r.dynasty ? dynastyDifficulty(r).rivalBoost : 0 });
      rivalWorld = py.world;
      notices.push(...py.notices);

      /* dynasty mode re-tabulates the all-time industry records each year */
      if (dynasty) {
        dynasty = {
          ...dynasty,
          records: computeIndustryRecords({ ...r, cash, fans, awards, rivalWorld, franchises }),
        };
      }
    }
  }

  return {
    ...r,
    week: r.week + n,
    cash,
    fans,
    rd,
    contracts,
    payouts,
    rivalWorld,
    yearShows,
    awards,
    awardsCeremony,
    projects,
    research,
    arcCombos,
    arcKnowledge,
    arcGenreKnowledge,
    contractJobs,
    trainingJobs,
    researchJobs,
    incomeThisWeek,
    fansThisWeek,
    staff: staffArr,
    bonds,
    staffEvents: events,
    legends,
    dynasty,
    market,
    recentReleases,
    commissions,
    marketEvents,
    studioEvents,
    franchises,
    partners,
    notices: notices.slice(-40),
  };
}

/* =================================================================== */
/*                        PROJECT PIPELINE OPS                          */
/* =================================================================== */

/** how many major productions this office can run at once */
export const projectCapacity = (r: RunState) =>
  OFFICES[r.officeLevel].projects + (r.dynasty ? dynastyFX(r).extraProjects : 0);

export const projectById = (r: RunState, id: string): Project | null =>
  r.projects.find((p) => p.id === id) ?? null;

/** null = a new project can be greenlit; otherwise the blocking reason.
    Covers capacity, cash, and every continuation rule so the UI can say
    WHY a show can't start instead of silently swallowing the click. */
export function startBlockReason(r: RunState, d?: Draft): string | null {
  const active = activeProjects(r.projects).length;
  const cap = projectCapacity(r);
  if (active >= cap)
    return `${OFFICES[r.officeLevel].name} can only run ${cap} production${cap > 1 ? "s" : ""} at once`;
  if (d) {
    if (d.animeType !== "shonen" && d.animeType !== "shojo") return "Choose an Anime Type";
    if (d.genres.length < 1 || d.genres.length > 2 || d.genres.some((genre) => !isActiveGenre(genre)))
      return "Choose one or two active genres";
    const scope = PRODUCTION_SCOPES[d.scope ?? "standard"];
    if (r.officeLevel < scope.minOffice) return `${scope.label} requires ${OFFICES[scope.minOffice].name} or larger`;
    if (r.staff.length < scope.minStaff) return `${scope.label} needs at least ${scope.minStaff} staff on the books`;
  }
  if (d && r.cash < projectUpfront(d)) return "Not enough cash for the greenlight payment";
  if (d?.continuation) {
    const fr = d.franchiseKey ? r.franchises[d.franchiseKey] : undefined;
    if (!fr) return "This franchise doesn't exist any more";
    const fee = continuationDef(d.continuation)?.fee ?? 0;
    if (fee > 0 && r.cash < projectUpfront(d) + fee)
      return `Not enough cash — the rights fee alone is £${fee.toLocaleString("en-GB")}`;
    const block = continuationBlock(fr, d.continuation, {
      week: r.week,
      franchiseCount: Object.keys(r.franchises).length,
      officeLevel: r.officeLevel,
      projects: r.projects,
    });
    if (block) return block;
  }
  return null;
}

/** greenlight a new show: pays the upfront cost and enters the pipeline.
    Pass a commission to produce it under contract: the partner's advance
    lands immediately, but their deadline and revenue share bind the show. */
export function startProject(r: RunState, d: Draft, commission?: Commission): RunState | null {
  if (commission) {
    /* the brief is binding */
    if (!d.genres.includes(commission.genre)) return null;
    if (d.audience !== commission.audience) return null;
    if (d.medium !== commission.medium) return null;
    if (activeProjects(r.projects).length >= projectCapacity(r)) return null;
    if (r.cash + commission.advance < projectUpfront(d)) return null;
  } else if (startBlockReason(r, d)) return null;

  /* continuations must reference real IPs and pay their fee */
  const contDef = d.continuation ? continuationDef(d.continuation) : null;
  const contFee = contDef?.fee ?? 0;
  if (d.continuation) {
    const fr = d.franchiseKey ? r.franchises[d.franchiseKey] : undefined;
    if (!fr) return null;
    const block = continuationBlock(fr, d.continuation, {
      week: r.week,
      franchiseCount: Object.keys(r.franchises).length,
      officeLevel: r.officeLevel,
      projects: r.projects,
    });
    if (block) return null;
    if (d.continuation === "crossover" && (!d.crossKey || !r.franchises[d.crossKey] || d.crossKey === d.franchiseKey))
      return null;
    if (r.cash + (commission?.advance ?? 0) < projectUpfront(d) + contFee) return null;
  }

  let p = makeProject(d, r.week, r.day ?? r.week * 7);
  /* the Hype Machine opens every show with a ready-made buzz */
  if (r.showrunner === "marketer") p = { ...p, hype: p.hype + 10 };
  const partner = commission ? partnerById(commission.partnerId) : null;
  if (commission && partner) {
    p = {
      ...p,
      deadlineWeek: r.week + commission.maxWeeks,
      deadlineDay: (r.day ?? r.week * 7) + commission.maxWeeks * 7,
      hype: p.hype + (commission.hypeBonus ?? 0),
      commission: {
        partnerId: commission.partnerId,
        partnerName: partner.name,
        advance: commission.advance,
        share: commission.share,
        minQuality: commission.minQuality,
        bonus: commission.bonus,
        deadlineWeek: r.week + commission.maxWeeks,
        deadlineDay: (r.day ?? r.week * 7) + commission.maxWeeks * 7,
      },
    };
  }
  return {
    ...r,
    cash: r.cash - projectUpfront(d) - contFee + (commission?.advance ?? 0),
    projects: [...r.projects, p],
    commissions: commission ? r.commissions.filter((c) => c.id !== commission.id) : r.commissions,
    /* the quick "SEASON N" button is spent the moment that season is greenlit —
       otherwise it keeps offering a season that's already on the floor */
    pendingSequel:
      d.continuation === "season" && d.franchiseKey === r.pendingSequel ? null : r.pendingSequel,
    notices: [
      ...r.notices,
      commission && partner
        ? `“${d.title}” commissioned by ${partner.name}: +£${commission.advance.toLocaleString("en-GB")} advance, they take ${Math.round(commission.share * 100)}% · deliver ${commission.minQuality}/40 within ${commission.maxWeeks * 7} days.`
        : `“${d.title}” greenlit — target release in ${Math.max(0, (p.deadlineDay ?? p.deadlineWeek * 7) - (r.day ?? r.week * 7))} days. Total budget ≈ £${draftCost(d).toLocaleString("en-GB")}.`,
    ],
  };
}

/** work outside major productions also occupies staff. */
export function staffOperationReason(r: RunState, staffId: string): string | null {
  if (r.audienceTest) return `Test audience study: ${r.audienceTest.title}`;
  const c = (r.contractJobs ?? []).find((j) => j.staffIds.includes(staffId));
  if (c) return `Contract: ${c.contract.name}`;
  const t = (r.trainingJobs ?? []).find((j) => j.staffId === staffId);
  if (t) return `Training until ${dateLabel(t.completesWeek)}`;
  return null;
}

export function staffBusyReason(r: RunState, staffId: string): string | null {
  const p = projectOfStaff(r.projects, staffId);
  return p ? `On “${p.draft.title}”` : staffOperationReason(r, staffId);
}

/** move a staff member onto / off a project (exclusive assignment). */
export function assignToProject(r: RunState, projectId: string, staffId: string): RunState {
  const p = projectById(r, projectId);
  const already = !!p?.staffIds.includes(staffId);
  const op = !already ? staffOperationReason(r, staffId) : null;
  if (op) return { ...r, notices: [...r.notices, `${r.staff.find((s) => s.id === staffId)?.name ?? "That employee"} is unavailable — ${op}.`] };
  return { ...r, projects: toggleAssign(r.projects, projectId, staffId) };
}

export function startContractAssignment(r: RunState, contract: Contract, staffIds: string[], showrunner = false): RunState | null {
  const ids = [...new Set(staffIds)].slice(0, showrunner ? 2 : 3);
  if (ids.length + (showrunner ? 1 : 0) < 1) return null;
  if (!r.contracts.some((c) => c.id === contract.id)) return null;
  for (const id of ids) if (staffBusyReason(r, id)) return null;
  if (showrunner && (r.contractJobs ?? []).some((j) => j.showrunner)) return null;
  const job: ContractAssignment = {
    id: `job_${contract.id}_${r.week}`,
    contract,
    staffIds: ids,
    showrunner,
    startWeek: r.week,
    dueWeek: r.week + contract.weeks,
    startDay: r.day ?? r.week * 7,
    dueDay: (r.day ?? r.week * 7) + contract.weeks * 7,
    progress: 0,
    liveProgressThisWeek: 0,
  };
  const seats = ids.length + (showrunner ? 1 : 0);
  return {
    ...r,
    contracts: r.contracts.filter((c) => c.id !== contract.id),
    contractJobs: [...(r.contractJobs ?? []), job],
    notices: [...r.notices, `📋 ${contract.name} assigned to ${seats} contributor${seats === 1 ? "" : "s"}${showrunner ? " including the showrunner" : ""} — ${contract.weeks * 7} days to deliver.`],
  };
}

/** fold a played milestone sprint back into the run */
export function applyMilestone(r: RunState, projectId: string, o: MilestoneOutcome): RunState {
  const proj = projectById(r, projectId);
  const team = proj?.staffIds ?? [];
  const done = proj?.milestone ?? null;
  const fx = facilityFX(r.facilities);
  /* Auto-Cleanup now speeds the live Edit Bay instead of erasing notes for free on LOCK. */
  const withCleanup: MilestoneOutcome = o;
  /* the QA suite catches problems before they become issues */
  const guarded: MilestoneOutcome =
    withCleanup.issues > 0 ? { ...withCleanup, issues: Math.max(0, withCleanup.issues - fx.issueGuard) } : withCleanup;
  /* the training room turns every sprint into a lesson in its discipline */
  const taught: PointType | null = done === "edit" ? null : done;
  return {
    ...r,
    cash: r.cash - o.spent,
    rd: Math.max(0, r.rd - (o.rdSpent ?? 0)) + Math.round((o.rdGained + (o.squashed ?? 0) * 2) * fx.rdMult),
    staff: r.staff.map((s) =>
      team.includes(s.id)
        ? {
            ...s,
            stamina: Math.max(12, s.stamina - 8),
            ...(taught && fx.trainSkill > 0
              ? { [taught]: Math.min(99, s[taught] + fx.trainSkill) }
              : {}),
          }
        : s
    ),
    projects: r.projects.map((p) => (p.id === projectId ? applyMilestoneOutcome(p, guarded) : p)),
  };
}



/* ---------------------------------------------------- daily studio work */
export interface DeskPulse {
  actorId: string;
  name: string;
  type: PointType;
  points: number;
  nonce: number;
  source?: "project" | "contract" | "edit";
  projectId?: string;
  jobId?: string;
}

const POINT_TYPES: PointType[] = ["story", "art", "sound"];

export const AUDIENCE_TEST_DAYS = 2;
export const AUDIENCE_TEST_RD = 4;
export const AUDIENCE_TEST_MAX_FINDINGS = 6;

export const audienceShowKey = (r: Pick<RunState, "showsMade" | "lastDraft">) =>
  r.lastDraft ? `${r.showsMade}:${r.lastDraft.title}` : "";

const blendedGenreMemo = (draft: Draft) => {
  const defs = draft.genres.map((id) => GENRES.find((g) => g.id === id)).filter(Boolean) as typeof GENRES;
  const n = Math.max(1, defs.length);
  const ideal: [number, number, number] = [0, 1, 2].map((i) => Math.round(defs.reduce((a, g) => a + g.ideal[i], 0) / n)) as [number, number, number];
  const ratio: [number, number, number] = [0, 1, 2].map((i) => defs.reduce((a, g) => a + g.ratio[i], 0) / n) as [number, number, number];
  return { ideal, ratio };
};

function audienceFinding(job: AudienceTestJob): { text: string; learnArcGenre?: string } {
  const { draft } = job;
  const memo = blendedGenreMemo(draft);
  const genres = draft.genres.map((id) => GENRES.find((g) => g.id === id)?.label ?? id).join(" × ");
  const dirs = [
    ["Story direction", "Plot", "Characters"],
    ["Animation direction", "Sakuga", "Consistency"],
    ["Sound direction", "Music", "Voice acting"],
  ] as const;
  if (job.round <= 2) {
    const i = job.round as 0 | 1 | 2;
    const target = memo.ideal[i];
    return { text: `${dirs[i][0]}: ${genres} viewers preferred about ${target}% ${dirs[i][1]} / ${100 - target}% ${dirs[i][2]}. Your last cut used ${draft.sliders[i]}%.` };
  }
  if (job.round === 3) {
    const pct = memo.ratio.map((v) => Math.round(v * 100));
    return { text: `Quality mix: this genre blend responds best around ${pct[0]}% Story · ${pct[1]}% Art · ${pct[2]}% Sound. Staff can contribute across all three, so shape the team rather than hard-locking roles.` };
  }
  if (job.round === 4) {
    const cast = [
      ["lead", draft.protag], ["support", draft.secondary], ["mascot", draft.pet], ["villain", draft.villain],
    ] as const;
    const ranked = cast.map(([role, id]) => {
      const m = castById(id);
      const visibleFit = m.visibleAff.filter((g) => draft.genres.includes(g)).length;
      /* Test-audience previews may assess only public affinities. Hidden
         talent remains secret until a qualifying release. */
      const fit = Math.min(1, visibleFit);
      return { role, m, fit };
    }).sort((a, b) => a.fit - b.fit);
    const weak = ranked[0];
    return { text: `Cast response: ${weak.m.name} (${weak.role}) was the weakest genre fit in this version — ${weak.fit}/${draft.genres.length} selected genre affinities matched. A better-matched ${weak.role} should review more consistently.` };
  }
  const arc = draft.arcs.map((id) => ARCS.find((a) => a.id === id)).find(Boolean);
  if (arc && draft.genres.length) {
    const genre = draft.genres[0];
    const fit = arcGenreFit(arc, genre);
    const gl = GENRES.find((g) => g.id === genre)?.label ?? genre;
    return { text: `Arc test: ${arc.name} measured as ${fit.label} with ${gl}${fit.score ? ` (${fit.score > 0 ? "+" : ""}${fit.score} quality-side synergy)` : ""}.`, learnArcGenre: `${arc.id}|${genre}` };
  }
  return { text: `Editing response: every unresolved editor note costs roughly 0.9 raw quality before critic scoring. A clean master is measurably safer if the deadline allows it.` };
}

export function startTestAudience(r: RunState): RunState | null {
  if (!r.lastDraft || !r.lastResult || r.audienceTest || r.staff.length === 0) return null;
  if ((r.trainingJobs ?? []).length > 0) return null; // all employees must be available for the study
  const showKey = audienceShowKey(r);
  const round = r.audienceTestCounts?.[showKey] ?? 0;
  if (!showKey || round >= AUDIENCE_TEST_MAX_FINDINGS) return null;
  const startDay = r.day ?? r.week * 7;
  return {
    ...r,
    audienceTest: { showKey, title: r.lastDraft.title, startDay, completesDay: startDay + AUDIENCE_TEST_DAYS, round, draft: r.lastDraft, result: r.lastResult },
    notices: [...r.notices, `👥 Test audience booked for “${r.lastDraft.title}” — the whole studio is tied up for ${AUDIENCE_TEST_DAYS} days.`],
  };
}

function finishResearchJob(r: RunState, job: ResearchJob): RunState {
  let research = [...r.research];
  let arcCombos = [...r.arcCombos];
  const arcKnowledge = { ...r.arcKnowledge };
  const arcGenreKnowledge = { ...r.arcGenreKnowledge };
  const notices = [...r.notices];
  if (!research.includes(job.researchId)) research.push(job.researchId);
  if (job.researchId === "narrative_analytics") {
    arcCombos = [...new Set([...arcCombos, ...ARC_RESEARCH_COMBOS])];
    for (const id of ARC_RESEARCH_COMBOS) {
      const combo = ARC_COMBOS.find((c) => c.id === id);
      for (const arcId of combo?.arcs ?? []) arcKnowledge[arcId] = Math.max(1, arcKnowledge[arcId] ?? 0);
    }
    notices.push("📚 Narrative Analytics adds several proven structures to the Studio Bible.");
  }
  if (job.researchId === "genre_studies") {
    for (const key of ARC_RESEARCH_GENRE_KEYS) arcGenreKnowledge[key] = Math.max(1, arcGenreKnowledge[key] ?? 0);
    notices.push("📚 Genre Studies reveals a starter set of arc-to-genre relationships.");
  }
  notices.push(`🔬 Research complete: ${job.name}!`);
  return { ...r, research, arcCombos, arcKnowledge, arcGenreKnowledge, notices };
}

function tickDailyBackground(r: RunState): { run: RunState; attention: boolean; studioLocked: boolean } {
  let nx = r;
  let attention = false;
  const studioLocked = !!r.audienceTest;

  /* contract deadlines are exact days now; testing the audience does not stop the clock. */
  if ((nx.contractJobs ?? []).length) {
    const keep: ContractAssignment[] = [];
    let rd = nx.rd;
    const notices = [...nx.notices];
    for (const job of nx.contractJobs) {
      const dueDay = job.dueDay ?? job.dueWeek * 7;
      if ((nx.day ?? nx.week * 7) >= dueDay && job.progress < job.contract.target) {
        const consolation = Math.max(1, Math.round(job.contract.rd / 3));
        rd += consolation;
        attention = true;
        notices.push(`❌ Contract missed: ${job.contract.name} — ${job.progress}/${job.contract.target} progress (+${consolation} RD learned).`);
      } else keep.push(job);
    }
    nx = { ...nx, contractJobs: keep, rd, notices };
  }

  /* courses and technology can finish on any day instead of waiting for Sunday. */
  if ((nx.trainingJobs ?? []).length) {
    const keep: TrainingJob[] = [];
    let staff = nx.staff;
    const notices = [...nx.notices];
    for (const job of nx.trainingJobs) {
      if (!staff.some((s) => s.id === job.staffId)) continue;
      const due = job.completesDay ?? job.completesWeek * 7;
      if ((nx.day ?? nx.week * 7) < due) { keep.push(job); continue; }
      staff = staff.map((s) => {
        if (s.id !== job.staffId) return s;
        let out = ensureCareer({ ...s, [job.focus]: Math.min(99, s[job.focus] + 1), lastTrainedWeek: nx.week }, nx.week);
        out = moraleDelta(out, 3);
        return gainXp(out, trainXp(job.tier)).staff;
      });
      attention = true;
      notices.push(`🎓 ${job.staffName} completes ${job.focus} training (+1 ${job.focus}, +${trainXp(job.tier)} XP).`);
    }
    nx = { ...nx, staff, trainingJobs: keep, notices };
  }

  if ((nx.researchJobs ?? []).length) {
    const keep: ResearchJob[] = [];
    for (const job of nx.researchJobs) {
      const due = job.completesDay ?? job.completesWeek * 7;
      if ((nx.day ?? nx.week * 7) < due) { keep.push(job); continue; }
      nx = finishResearchJob(nx, job);
      attention = true;
    }
    nx = { ...nx, researchJobs: keep };
  }

  if (r.audienceTest && (nx.day ?? nx.week * 7) >= r.audienceTest.completesDay) {
    const found = audienceFinding(r.audienceTest);
    const counts = { ...(nx.audienceTestCounts ?? {}), [r.audienceTest.showKey]: r.audienceTest.round + 1 };
    const insight: AudienceInsight = { showKey: r.audienceTest.showKey, title: r.audienceTest.title, text: found.text, day: nx.day ?? nx.week * 7 };
    const genreKnowledge = r.audienceTest.draft.genres.reduce((acc, genre) => {
      acc[genre] = Math.min(12, (acc[genre] ?? 0) + 1);
      return acc;
    }, { ...(nx.genreKnowledge ?? {}) });
    const arcGenreKnowledge = { ...(nx.arcGenreKnowledge ?? {}) };
    if (found.learnArcGenre) arcGenreKnowledge[found.learnArcGenre] = Math.max(1, arcGenreKnowledge[found.learnArcGenre] ?? 0);
    nx = {
      ...nx,
      rd: nx.rd + AUDIENCE_TEST_RD,
      genreKnowledge,
      arcGenreKnowledge,
      audienceTestCounts: counts,
      audienceInsights: [...(nx.audienceInsights ?? []), insight].slice(-30),
      audienceTest: null,
      notices: [...nx.notices, `👥 TEST AUDIENCE: ${found.text} (+${AUDIENCE_TEST_RD} RD)`].slice(-40),
    };
    attention = true;
  }

  return { run: nx, attention, studioLocked };
}

/** Kairosoft-style percentile output. 65 effective skill = 65% chance of +1;
 *  175 = guaranteed +1 plus 75% chance of +2; 247 = guaranteed +2 plus 47% +3. */
export function percentileSkillOutput(effectiveSkill: number, roll = Math.random()): number {
  const skill = Math.max(0, effectiveSkill);
  const guaranteed = Math.floor(skill / 100);
  const remainder = skill - guaranteed * 100;
  return guaranteed + (roll * 100 < remainder ? 1 : 0);
}

function chooseDiscipline(st: Staff): PointType {
  /* Nobody is hard-locked to their job title. Strong skills are more likely to
     surface, while +20 on every weight keeps cross-discipline ideas alive. */
  const weights = POINT_TYPES.map((type) => ({ type, weight: Math.max(1, staffPoint(st, type) + 20) }));
  const total = weights.reduce((a, x) => a + x.weight, 0);
  let roll = Math.random() * total;
  for (const x of weights) {
    roll -= x.weight;
    if (roll <= 0) return x.type;
  }
  return "story";
}

export function contributionEffectiveSkill(r: RunState, st: Staff, type: PointType, editing = false): number {
  const fx = facilityFX(r.facilities);
  const project = projectOfStaff(r.projects, st.id);
  let effective = staffPoint(st, type);
  if (project) {
    const team = r.staff.filter((mate) => project.staffIds.includes(mate.id));
    /* Existing morale, traits, specialisations and bonds now modify the live
       percentile check instead of a removed weekly quality calculation. */
    effective *= personMod(st, project, team, { bonds: r.bonds ?? {} }).out;
  } else {
    effective *= 0.72 + Math.max(0, st.stamina) / 220;
  }
  effective *= fx.pointMult[type];
  effective *= studioPointMult(r.heads ?? {}, r.staff, r.legends ?? [])[type];
  if (r.research.includes("pipeline")) effective *= 1.12;
  if (type === "story" && r.research.includes("storyboard")) effective *= 1.15;
  if (type === "art" && r.research.includes("mocap")) effective *= 1.12;
  if (editing) {
    effective *= 1 + fx.issueFix * 0.15;
    if (r.research.includes("qa")) effective *= 1.15;
    if (r.research.includes("autoclean")) effective += 35;
  }
  /* Genji's Steady Hand is deliberately obvious: all staff contribution
     output is 50% stronger everywhere, including contract and edit work. */
  if (r.showrunner === "steady") effective *= 1.5;
  return Math.max(0, effective);
}

function showrunnerEffectiveSkill(r: RunState, type: PointType): number {
  let skill = showrunnerContractSkill(r.showrunner, r.showsMade, type);
  skill *= facilityFX(r.facilities).pointMult[type];
  skill *= studioPointMult(r.heads ?? {}, r.staff, r.legends ?? [])[type];
  if (r.research.includes("pipeline")) skill *= 1.12;
  if (type === "story" && r.research.includes("storyboard")) skill *= 1.15;
  if (type === "art" && r.research.includes("mocap")) skill *= 1.12;
  if (r.showrunner === "steady") skill *= 1.5;
  return skill;
}

function liveWorkEligible(r: RunState, st: Staff, pendingIds: Set<string> = new Set()): boolean {
  if ((r.staffResting ?? {})[st.id] || st.stamina <= 0) return false;
  if (pendingIds.has(st.id)) return true;
  const contract = (r.contractJobs ?? []).some((j) => j.staffIds.includes(st.id));
  const project = projectOfStaff(r.projects, st.id);
  const production = !!project && !project.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(project.stage);
  return contract || production;
}

function expectedContractDailyRate(
  r: RunState,
  contract: Contract,
  staffIds: string[],
  hasShowrunner: boolean,
  pendingSelection = false,
): number {
  const pendingIds = pendingSelection ? new Set(staffIds) : new Set<string>();
  const eligible = r.staff.filter((st) => liveWorkEligible(r, st, pendingIds));
  const sampleChance = eligible.length <= 2 ? 1 : 2 / eligible.length;
  const assigned = new Set(staffIds);
  const staffPerPulse = eligible.reduce((sum, st) => {
    if (!assigned.has(st.id)) return sum;
    return sum + sampleChance * (contributionEffectiveSkill(r, st, contract.type) / 100);
  }, 0);
  const runnerPerPulse = hasShowrunner
    ? SHOWRUNNER_CONTRACT_PULSE_CHANCE * (1 + showrunnerEffectiveSkill(r, contract.type) / 100)
    : 0;
  return Math.max(0, (staffPerPulse + runnerPerPulse) * LIVE_WORK_PULSES_PER_DAY);
}

/** Exact expectation for an ACTIVE live contract. This mirrors the same sampling,
 * percentile output and showrunner activation used by rollStudioWorkPulses. */
export function contractDailyOutputEstimateForRun(r: RunState, job: ContractAssignment): number {
  return expectedContractDailyRate(r, job.contract, job.staffIds, !!job.showrunner, false);
}

/** Preview expectation before a contract is assigned. Selected idle workers are
 * treated as live contributors so the assignment screen uses the same maths. */
export function contractSelectionDailyOutputEstimate(
  r: RunState,
  contract: Contract,
  staffIds: string[],
  hasShowrunner: boolean,
): number {
  return expectedContractDailyRate(r, contract, staffIds, hasShowrunner, true);
}

/** One visible production-check cycle. At most two hired staff are sampled per
 *  cycle so a full office stays readable; skill determines whether their check
 *  fires and whether 100+/200+ effective skill creates multi-point bubbles. */
export function rollStudioWorkPulses(r: RunState): DeskPulse[] {
  if (r.audienceTest) return [];
  const pulses: DeskPulse[] = [];
  const eligible = r.staff.filter((st) => {
    if ((r.staffResting ?? {})[st.id] || st.stamina <= 0) return false;
    const contract = (r.contractJobs ?? []).some((j) => j.staffIds.includes(st.id));
    const project = projectOfStaff(r.projects, st.id);
    const production = !!project && !project.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(project.stage);
    return contract || production;
  });
  const sampled = [...eligible].sort(() => Math.random() - 0.5).slice(0, 2);
  for (const st of sampled) {
    const contract = (r.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    if (contract) {
      const type = contract.contract.type;
      const points = percentileSkillOutput(contributionEffectiveSkill(r, st, type));
      if (points > 0) pulses.push({ actorId: st.id, name: st.name, type, points, nonce: Date.now() + pulses.length, source: "contract", jobId: contract.id });
      continue;
    }
    const project = projectOfStaff(r.projects, st.id);
    if (!project || project.milestone) continue;
    const type = chooseDiscipline(st);
    const points = percentileSkillOutput(contributionEffectiveSkill(r, st, type));
    if (points > 0) pulses.push({ actorId: st.id, name: st.name, type, points, nonce: Date.now() + pulses.length, source: "project", projectId: project.id });
  }

  const runnerJob = (r.contractJobs ?? []).find((j) => j.showrunner);
  if (runnerJob && Math.random() < SHOWRUNNER_CONTRACT_PULSE_CHANCE) {
    const type = runnerJob.contract.type;
    const points = showrunnerBubbleOutput(showrunnerEffectiveSkill(r, type));
    if (points > 0) pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type, points, nonce: Date.now() + 900 + pulses.length, source: "contract", jobId: runnerJob.id });
  } else if (!runnerJob && Math.random() < 0.22) {
    const active = r.projects.find((pr) => !pr.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(pr.stage));
    if (active) {
      const skills = POINT_TYPES.map((type) => ({ type, skill: showrunnerEffectiveSkill(r, type) })).sort((a, b) => b.skill - a.skill);
      const type = Math.random() < 0.62 ? skills[0].type : POINT_TYPES[Math.floor(Math.random() * POINT_TYPES.length)];
      const points = showrunnerBubbleOutput(showrunnerEffectiveSkill(r, type));
      if (points > 0) pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type, points, nonce: Date.now() + 900 + pulses.length, source: "project", projectId: active.id });
    }
  }
  return pulses;
}

export function tickStudioWorkPulse(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const pulses = rollStudioWorkPulses(r);
  if (!pulses.length) return { run: r, pulses, attention: false };
  let projects = r.projects.map((p) => ({ ...p, points: { ...p.points } }));
  let contractJobs = (r.contractJobs ?? []).map((j) => ({ ...j, liveProgressThisWeek: j.liveProgressThisWeek ?? 0 }));
  let cash = r.cash;
  let rd = r.rd;
  let staff = r.staff;
  const notices = [...r.notices];
  for (const pulse of pulses) {
    if (pulse.source === "project" && pulse.projectId) {
      projects = projects.map((p) => p.id !== pulse.projectId || p.milestone ? p : ({ ...p, points: { ...p.points, [pulse.type]: p.points[pulse.type] + pulse.points } }));
    } else if (pulse.source === "contract" && pulse.jobId) {
      contractJobs = contractJobs.map((j) => j.id === pulse.jobId ? ({ ...j, progress: Math.min(j.contract.target, j.progress + pulse.points), liveProgressThisWeek: (j.liveProgressThisWeek ?? 0) + pulse.points }) : j);
    }
  }
  const completed = contractJobs.filter((j) => j.progress >= j.contract.target);
  for (const job of completed) {
    cash += job.contract.pay;
    rd += job.contract.rd;
    staff = staff.map((st) => job.staffIds.includes(st.id) ? gainXp(st, CONTRACT_XP).staff : st);
    notices.push(`🎉 CONTRACT DELIVERED: ${job.contract.name} (+£${job.contract.pay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);
  }
  if (completed.length) {
    const ids = new Set(completed.map((j) => j.id));
    contractJobs = contractJobs.filter((j) => !ids.has(j.id));
  }
  return { run: { ...r, projects, contractJobs, cash, rd, staff, notices: notices.slice(-40) }, pulses, attention: completed.length > 0 };
}

/** A calendar day handles energy only; quality is created solely by the visible
 *  work-check bubbles above, never by an invisible weekly score injection. */
export function tickStudioDay(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const bg = tickDailyBackground(r);
  let nx = bg.run;
  const resting = { ...(nx.staffResting ?? {}) };
  const baseFx = facilityFX(nx.facilities);
  const spm = studioPointMult(nx.heads ?? {}, nx.staff, nx.legends ?? []);
  const dynFx = dynastyFX(nx);
  const fx = {
    ...baseFx,
    pointMult: {
      story: baseFx.pointMult.story * spm.story * dynFx.pointMult,
      art: baseFx.pointMult.art * spm.art * dynFx.pointMult,
      sound: baseFx.pointMult.sound * spm.sound * dynFx.pointMult,
    },
    speed: baseFx.speed + dynFx.speed,
  };

  if (bg.studioLocked) {
    const staff = nx.staff.map((s) => ({ ...s, stamina: Math.max(0, s.stamina - 3) }));
    return { run: { ...nx, staff }, pulses: [], attention: bg.attention };
  }

  const studio = { ...studioProduction(nx.heads ?? {}, nx.staff), issueChanceMult: nx.showrunner === "steady" ? 0.75 : 1 };
  const mods: StaffModFn = (st, p, team) => personMod(st, p, team, { bonds: nx.bonds ?? {} });
  const loadMap = projectLoadMap(nx.projects, nx.staff, nx.facilities, nx.research);
  const dayTick = tickProjectsDay(nx.projects, nx.staff, nx.day ?? nx.week * 7, fx, mods, studio, loadMap);
  nx = { ...nx, projects: dayTick.projects, cash: nx.cash + dayTick.cashDelta, notices: [...nx.notices, ...dayTick.notices].slice(-40) };

  const staff = nx.staff.map((st0) => {
    const st = { ...st0 };
    const project = projectOfStaff(nx.projects, st.id);
    const contract = (nx.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    const production = !!project && !project.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(project.stage);
    const busy = production || !!contract;
    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 50 + baseFx.staminaRest * 2);
      if (st.stamina >= 100) delete resting[st.id];
      return st;
    }
    if (!busy) {
      st.stamina = Math.min(100, st.stamina + 18 + baseFx.staminaRest);
      return st;
    }
    const drain = Math.max(5, 9 - baseFx.staminaSave);
    st.stamina = Math.max(0, st.stamina - drain);
    if (st.stamina <= 0) resting[st.id] = true;
    return st;
  });
  return { run: { ...nx, staff, staffResting: resting }, pulses: [], attention: bg.attention || dayTick.attention };
}

/** One live editing work check. Editors roll one of their three craft skills;
 *  successful bubbles remove exactly that many notes and award exactly 1 RD per
 *  cleared note. The same >100/>200 percentile rule applies. */
export function tickEditWorkPulse(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  if (r.audienceTest) return { run: r, pulses: [], attention: false };
  const target = projectById(r, projectId);
  if (!target || target.milestone !== "edit" || target.issues <= 0)
    return { run: r, pulses: [], attention: !!target && target.milestone === "edit" && target.issues <= 0 };
  const candidates = r.staff.filter((st) => target.staffIds.includes(st.id) && !(r.staffResting ?? {})[st.id] && st.stamina > 0);
  const sampled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 2);
  let left = target.issues;
  const pulses: DeskPulse[] = [];
  for (const st of sampled) {
    if (left <= 0) break;
    const type = chooseDiscipline(st);
    const rolled = percentileSkillOutput(contributionEffectiveSkill(r, st, type, true));
    const points = Math.min(left, rolled);
    if (points <= 0) continue;
    left -= points;
    pulses.push({ actorId: st.id, name: st.name, type, points, nonce: Date.now() + pulses.length, source: "edit", projectId });
  }
  if (!pulses.length) return { run: r, pulses, attention: false };
  const cleared = target.issues - left;
  const projects = r.projects.map((pr) => pr.id === projectId ? { ...pr, issues: left } : pr);
  return {
    run: {
      ...r,
      rd: r.rd + cleared,
      projects,
      notices: [...r.notices, `✂ ${cleared} editor note${cleared === 1 ? "" : "s"} cleared on “${target.draft.title}” (+${cleared} RD, ${left} remaining).`].slice(-40),
    },
    pulses,
    attention: left === 0,
  };
}

/** Editing has no artificial timer. Calendar days only drain/recover energy;
 *  note removal is performed by visible edit bubbles from tickEditWorkPulse. */
export function tickEditDay(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const bg = tickDailyBackground(r);
  const nx = bg.run;
  const target = projectById(nx, projectId);
  if (!target || target.milestone !== "edit") return { run: nx, pulses: [], attention: bg.attention };
  if (bg.studioLocked) return { run: nx, pulses: [], attention: bg.attention };
  const resting = { ...(nx.staffResting ?? {}) };
  const fx = facilityFX(nx.facilities);
  const staff = nx.staff.map((st0) => {
    if (!target.staffIds.includes(st0.id)) return st0;
    const st = { ...st0 };
    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 50 + fx.staminaRest * 2);
      if (st.stamina >= 100) delete resting[st.id];
      return st;
    }
    st.stamina = Math.max(0, st.stamina - Math.max(3, 6 - fx.staminaSave));
    if (st.stamina <= 0) resting[st.id] = true;
    return st;
  });
  return { run: { ...nx, staff, staffResting: resting }, pulses: [], attention: bg.attention || target.issues <= 0 };
}

/* ------------------------------------------------------ live rush system */
export const RUSH_CRUNCH_COST = 9_000;

const rushRoll = (skill: number, crunching = false) => {
  const s = Math.max(1, Math.min(99, skill));
  const lo = Math.max(1, Math.floor(s * 0.035));
  const hi = Math.max(lo + 1, Math.ceil(s * 0.105));
  const raw = lo + Math.floor(Math.random() * (hi - lo + 1));
  return Math.max(1, Math.round(raw * (crunching ? 1.35 : 1)));
};

/** Pick a lead, then return to the office: the actual work now happens as days pass. */
export function startMilestoneRush(r: RunState, projectId: string, a: RushAssignment): RunState | null {
  const target = r.projects.find((x) => x.id === projectId);
  if (!target || !target.milestone || target.milestone === "edit" || target.rush) return null;
  if (r.cash < a.cost) return null;
  const isOutsource = a.leadId.startsWith("outsource:");
  if (!isOutsource && a.leadId !== "showrunner" && !target.staffIds.includes(a.leadId)) return null;
  const idx = target.milestone === "story" ? 0 : target.milestone === "art" ? 1 : 2;
  const projects = r.projects.map((pr) => {
    if (pr.id !== projectId) return pr;
    const draft = {
      ...pr.draft,
      sliders: pr.draft.sliders.map((v, i) => (i === idx ? a.slider : v)) as [number, number, number],
    };
    return {
      ...pr,
      draft,
      spent: pr.spent + a.cost,
      rush: {
        milestone: pr.milestone as "story" | "art" | "sound",
        type: a.type,
        leadId: a.leadId,
        leadName: a.leadName,
        skill: Math.max(1, Math.min(99, Math.round(a.skill))),
        cost: a.cost,
        slider: a.slider,
        daysWorked: 0,
        durationDays: 4,
        pointsAdded: 0,
        boostAsked: false,
        boostPrompt: null,
        crunchDays: 0,
      },
    };
  });
  return {
    ...r,
    cash: r.cash - a.cost,
    projects,
    notices: [...r.notices, `🎬 ${a.leadName} takes charge of ${target.draft.title}'s ${target.milestone} rush. Watch the studio — their work lands day by day.`],
  };
}

/** Crunch is still available, but it now pushes the next two live workdays instead of flooding a bubble minigame. */
export function crunchRush(r: RunState, projectId: string): RunState {
  const target = r.projects.find((x) => x.id === projectId);
  if (!target?.rush || r.cash < RUSH_CRUNCH_COST) return r;
  return {
    ...r,
    cash: r.cash - RUSH_CRUNCH_COST,
    projects: r.projects.map((pr) => pr.id === projectId ? {
      ...pr,
      spent: pr.spent + RUSH_CRUNCH_COST,
      rush: { ...pr.rush!, crunchDays: Math.max(pr.rush!.crunchDays ?? 0, 2) },
    } : pr),
    notices: [...r.notices, `⚡ Crunch called on “${target.draft.title}” — the next two rush days hit harder, but mistake risk rises.`],
  };
}

/** One in-game day of special-section work. Normal production remains the team's
 * background job; this is the visible lead contribution that makes a rush special. */
export function tickRushDay(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const pulses: DeskPulse[] = [];
  const notices = [...r.notices];
  let attention = false;
  let projects = r.projects.map((pr0) => {
    const rush0 = pr0.rush;
    if (!rush0 || rush0.boostPrompt) return pr0;
    const crunching = (rush0.crunchDays ?? 0) > 0;
    const pts = rushRoll(rush0.skill, crunching);
    let pr: Project = {
      ...pr0,
      points: { ...pr0.points, [rush0.type]: pr0.points[rush0.type] + pts },
    };
    let rush = {
      ...rush0,
      daysWorked: rush0.daysWorked + 1,
      pointsAdded: rush0.pointsAdded + pts,
      crunchDays: Math.max(0, (rush0.crunchDays ?? 0) - 1),
    };
    pulses.push({ actorId: rush.leadId, name: rush.leadName, type: rush.type, points: pts, nonce: Date.now() + pulses.length });

    /* Weak leads are more volatile; Crunch almost doubles that risk. */
    const issueChance = Math.max(0.012, 0.085 - rush.skill * 0.00072) * (crunching ? 1.9 : 1);
    if (Math.random() < issueChance) pr = { ...pr, issues: pr.issues + 1 };

    /* A staff member may walk over with one optional experiment during the rush. */
    if (!rush.boostAsked && rush.daysWorked >= 1 && rush.daysWorked < rush.durationDays && Math.random() < 0.24) {
      const team = r.staff.filter((s) => pr.staffIds.includes(s.id));
      const candidates = team.map((s) => ({ actorId: s.id, name: s.name, skill: Math.round(staffPoint(s, rush.type)), type: rush.type }));
      candidates.push({ actorId: "showrunner", name: r.studio + " showrunner", skill: showrunnerContractSkill(r.showrunner, r.showsMade, rush.type), type: rush.type });
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      rush = { ...rush, boostPrompt: pick };
      attention = true;
    }

    pr = { ...pr, rush };
    if (rush.daysWorked >= rush.durationDays) {
      const done = applyMilestoneOutcome({ ...pr, rush: null }, { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0 });
      notices.push(`✅ ${rush.leadName} finishes the ${rush.milestone} rush on “${pr.draft.title}” (+${rush.pointsAdded} ${rush.type} across ${rush.durationDays} days).`);
      return done;
    }
    return pr;
  });
  return { run: { ...r, projects, notices }, pulses, attention };
}

export function respondRushBoost(r: RunState, projectId: string, chance: number | null): RunState {
  const target = r.projects.find((x) => x.id === projectId);
  const prompt = target?.rush?.boostPrompt;
  if (!target?.rush || !prompt) return r;
  if (chance === null) {
    return {
      ...r,
      projects: r.projects.map((pr) => pr.id === projectId ? { ...pr, rush: { ...pr.rush!, boostPrompt: null, boostAsked: true } } : pr),
      notices: [...r.notices, `${prompt.name}'s experiment is passed over — the rush keeps to plan.`],
    };
  }
  const cost = rushResearchCost(prompt.skill, chance);
  if (r.rd < cost) return r;
  const success = Math.random() < chance;
  const reward = success ? rushBoostPoint(prompt.skill) : 0;
  return {
    ...r,
    rd: r.rd - cost,
    projects: r.projects.map((pr) => {
      if (pr.id !== projectId || !pr.rush) return pr;
      return {
        ...pr,
        points: success ? { ...pr.points, [prompt.type]: pr.points[prompt.type] + reward } : pr.points,
        issues: success ? pr.issues : pr.issues + 1,
        rush: { ...pr.rush, boostPrompt: null, boostAsked: true, pointsAdded: pr.rush.pointsAdded + reward },
      };
    }),
    notices: [...r.notices, success
      ? `💡 ${prompt.name}'s experiment works: +${reward} ${prompt.type} for ${cost} RD.`
      : `💥 ${prompt.name}'s experiment fails: ${cost} RD spent and one extra editing note.`],
  };
}

/** score a ready project without committing anything */
/** trends × saturation × split attention × any licensing boost */
export function marketMultiplierFor(r: RunState, p: Project): number {
  const othersAiring = r.projects.filter((x) => x.stage === "airing" && x.id !== p.id).length;
  const boost = r.week < (r.revBoostUntil ?? 0) ? 1.15 : 1;
  return (
    Math.round(
      marketMult(r.market ?? initMarket(), r.recentReleases ?? [], p.draft, r.week) *
        attentionMult(othersAiring) *
        boost *
        100
    ) / 100
  );
}

export function previewResult(r: RunState, p: Project): ShowResult {
  const d = p.draft;
  const fr = d.franchiseKey ? r.franchises[d.franchiseKey] ?? null : null;
  const cross = d.crossKey ? r.franchises[d.crossKey] ?? null : null;
  let out = computeProjectResult(p, {
    research: r.research,
    merchMult: facilityFX(r.facilities).merchMult,
    marketMult: marketMultiplierFor(r, p),
    franchiseMult: franchiseBoost(fr, d, cross),
    showrunner: r.showrunner,
    comboLevels: r.comboLevels,
    castCombos: r.castCombos,
    arcCombos: r.arcCombos,
    studioTop: r.studioTop,
    franchises: r.franchises,
    fans: r.fans,
    audienceBar: dynastyAudienceBar(r),
    castAffinityDiscovered: r.castAffinityDiscovered,
  });
  const scope = PRODUCTION_SCOPES[d.scope ?? "standard"];
  if (scope.audienceMult !== 1) {
    out = {
      ...out,
      revenue: Math.round(out.revenue * scope.audienceMult),
      fans: Math.round(out.fans * Math.sqrt(scope.audienceMult)),
      breakdown: [...out.breakdown, { label: `${scope.label} reach`, pts: `×${scope.audienceMult.toFixed(2)} revenue ceiling` }],
    };
  }
  /* dynasty-era empire buffs apply after the core review lands */
  const dfx = dynastyFX(r);
  if (dfx.revenueMult !== 1) {
    out = {
      ...out,
      revenue: Math.round(out.revenue * dfx.revenueMult),
      breakdown: [...out.breakdown, { label: "International marketing division", pts: `×${dfx.revenueMult.toFixed(2)} revenue` }],
    };
  }
  if (dfx.fanMult > 0) {
    out = {
      ...out,
      fans: Math.round(out.fans * (1 + dfx.fanMult)),
      breakdown: [...out.breakdown, { label: "Studio museum & archive", pts: `+${Math.round(dfx.fanMult * 100)}% fans` }],
    };
  }
  return out;
}

/** Release-only hidden-affinity discovery. Calling this helper does not
    mutate knowledge; releaseProject is the sole transaction that persists it. */
export function castBreakthroughsForRelease(
  draft: Draft,
  discovered: readonly string[],
): { castId: string; name: string; genre: GenreId }[] {
  const releasedCastIds = [draft.protag, draft.secondary, draft.pet, draft.villain];
  return [...new Set(releasedCastIds)].flatMap((castId) => {
    const member = castById(castId);
    if (member.legacyPlaceholder || discovered.includes(castId) || !draft.genres.includes(member.hiddenAff)) return [];
    return [{ castId, name: member.name, genre: member.hiddenAff }];
  });
}

/** release a ready project: reviews land, payouts get scheduled over the
 *  broadcast run, franchises/stats update, the show starts airing */
export function releaseProject(
  r: RunState,
  projectId: string,
  extra: { spent: number; hype: number }
): { run: RunState; result: ShowResult } | null {
  const p0 = projectById(r, projectId);
  if (!p0 || p0.stage !== "ready") return null;
  const p: Project = { ...p0, spent: p0.spent + extra.spent, hype: extra.hype };
  let result = previewResult({ ...r, cash: r.cash - extra.spent }, p);
  const draft = p.draft;
  const breakthroughs = castBreakthroughsForRelease(draft, r.castAffinityDiscovered);
  result = { ...result, castBreakthroughs: breakthroughs };

  /* ---- the deal: the commissioner takes their cut, judges the work ---- */
  const deal = p.commission;
  let bonusCash = 0;
  let partners = r.partners ?? {};
  if (deal) {
    const cut = Math.round(result.revenue * deal.share);
    result = {
      ...result,
      revenue: result.revenue - cut,
      breakdown: [
        ...result.breakdown,
        { label: `${deal.partnerName} share (${Math.round(deal.share * 100)}%)`, pts: `−£${cut.toLocaleString("en-GB")}` },
      ],
    };
    const late = Math.max(r.day ?? r.week * 7, r.week * 7) > (deal.deadlineDay ?? deal.deadlineWeek * 7);
    let rep = partners[deal.partnerId] ?? REP_START;
    if (result.total >= deal.minQuality) {
      rep += REP_DELIVERED;
      if (result.total >= deal.minQuality + 6) {
        rep += REP_EXCELLENT;
        bonusCash = deal.bonus;
        result = {
          ...result,
          breakdown: [...result.breakdown, { label: `${deal.partnerName} quality bonus`, pts: `+£${deal.bonus.toLocaleString("en-GB")}` }],
        };
      }
    } else {
      rep += REP_MISSED_QUALITY;
      result = {
        ...result,
        breakdown: [...result.breakdown, { label: `${deal.partnerName} expected ${deal.minQuality}/40`, pts: "reputation damaged" }],
      };
    }
    if (late) rep += REP_LATE;
    partners = { ...partners, [deal.partnerId]: Math.max(0, Math.min(100, rep)) };
  }

  /* ---- the franchise ledger: every release becomes IP history ---- */
  const fkey = draft.franchiseKey ?? draft.title;
  const prevFr = draft.franchiseKey ? r.franchises[draft.franchiseKey] : undefined;
  const franchises = { ...r.franchises };
  const resShape = {
    total: result.total,
    revenue: result.revenue,
    fans: result.fans,
    hallOfFame: result.hallOfFame,
  };
  const castSeed = {
    protag: draft.protag,
    protagName: draft.protagName,
    secondary: draft.secondary,
    secondaryName: draft.secondaryName ?? castById(draft.secondary).name,
    pet: draft.pet,
    petName: draft.petName ?? (draft.pet === "none" ? "" : castById(draft.pet).name),
    villain: draft.villain,
    villainName: draft.villainName ?? castById(draft.villain).name,
  };
  const frNotices: string[] = [];
  if (prevFr) {
    /* a continuation — the fans came in with expectations */
    const kind: EntryKind = draft.continuation ?? "season";
    const judged = recordContinuation(
      prevFr,
      { ...draft, continuation: kind as Draft["continuation"] },
      resShape,
      r.week,
      { fatigueAdd: r.dynasty ? dynastyDifficulty(r).fatigueAdd : 0 }
    );
    const v = judged.verdict;
    franchises[prevFr.key] = judged.franchise;
    if (v.verdict === "delight") {
      result = {
        ...result,
        fans: Math.round(result.fans * v.fanMult),
        breakdown: [...result.breakdown, { label: `Fans expected ${v.expected}/40`, pts: "exceeded! +15% fans" }],
      };
      frNotices.push(`Fans are ecstatic — “${draft.title}” beat the ${v.expected}/40 they hoped for!`);
    } else if (v.verdict === "disappointment") {
      result = {
        ...result,
        fans: Math.round(result.fans * v.fanMult),
        breakdown: [
          ...result.breakdown,
          { label: `Fans expected ${v.expected}/40`, pts: `betrayed — ${Math.round((1 - v.fanMult) * 100)}% fans lost` },
        ],
      };
      frNotices.push(
        `💔 “${draft.title}” scored ${result.total}/40 against the ${v.expected}/40 fans expected. The franchise takes the hit.`
      );
    } else {
      result = { ...result, breakdown: [...result.breakdown, { label: `Fans expected ${v.expected}/40`, pts: "met" }] };
    }
    if (kind === "spinoff") {
      /* the featured character carries their fame into a brand-new IP */
      const feat = prevFr.cast.find((c) => c.id === draft.spinChar);
      const spin = createFranchise(draft.title, draft, castSeed, resShape, r.week, prevFr.key);
      if (feat) {
        spin.cast = spin.cast.map((c) =>
          c.id === feat.id ? { ...c, popularity: Math.min(100, Math.max(c.popularity, feat.popularity)) } : c
        );
      }
      franchises[draft.title] = spin;
      frNotices.push(`“${draft.title}” begins its own franchise line, spun off from ${prevFr.baseTitle}.`);
    }
    if (kind === "crossover" && draft.crossKey && franchises[draft.crossKey]) {
      /* the partner IP shares the spotlight — and the exhaustion */
      const partner = franchises[draft.crossKey];
      franchises[draft.crossKey] = {
        ...partner,
        entries: [
          ...partner.entries,
          { kind: "crossover", title: draft.title, score: result.total, revenue: 0, fans: 0, week: r.week, animeType: draft.animeType },
        ],
        fatigue: Math.min(100, partner.fatigue + 14),
        popularity: Math.min(100, partner.popularity + (result.total >= 28 ? 6 : 0)),
        lastEntryWeek: r.week,
      };
    }
  } else {
    /* an original — a brand-new IP record is born */
    franchises[fkey] = createFranchise(fkey, draft, castSeed, resShape, r.week);
  }
  const ck = comboKey(draft.genres);
  const notices = [...r.notices, ...frNotices];
  if (deal) {
    notices.push(
      result.total >= deal.minQuality
        ? `${deal.partnerName} is ${result.total >= deal.minQuality + 6 ? "delighted" : "satisfied"} with “${draft.title}” (${result.total}/40 vs ${deal.minQuality} required)${bonusCash ? ` — quality bonus +£${bonusCash.toLocaleString("en-GB")}!` : "."}`
        : `${deal.partnerName} is furious: “${draft.title}” scored ${result.total}/40, below the contracted ${deal.minQuality}/40.`
    );
    if (Math.max(r.day ?? r.week * 7, r.week * 7) > (deal.deadlineDay ?? deal.deadlineWeek * 7)) notices.push(`${deal.partnerName} logs the late delivery. They will remember.`);
  }
  if (result.hallOfFame) notices.push(`“${draft.title}” enters the HALL OF FAME!`);
  for (const breakthrough of breakthroughs) {
    const genre = GENRES.find((item) => item.id === breakthrough.genre)?.label ?? breakthrough.genre;
    notices.push(`✦ CASTING BREAKTHROUGH! ${breakthrough.name} was unexpectedly brilliant in ${genre}. Hidden Affinity discovered: ${genre} ✦`);
  }
  for (const id of result.arcCombosDiscovered) {
    const combo = ARC_COMBOS.find((c) => c.id === id);
    if (combo) notices.push(`🧠 STORY BREAKTHROUGH: ${combo.name} discovered — its structure rating is now visible whenever you plan it.`);
  }
  if ((p.lateDays ?? 0) > 0 || p.lateWeeks > 0) {
    const lateDays = p.lateDays ?? p.lateWeeks * 7;
    notices.push(`The network docks “${draft.title}” for delivering ${lateDays} day${lateDays === 1 ? "" : "s"} late.`);
  }

  /* broadcast revenue arrives week by week while the show airs */
  const start = r.week + 1;
  const payouts = [...r.payouts];
  const totalSales = Math.max(1, result.sales.reduce((a, b) => a + b, 0));
  let acc = 0;
  let accF = 0;
  const chunks: { amount: number; fans: number }[] = [];
  for (let i = 0; i < AIR_WEEKS; i++) {
    const frac = result.sales[i] / totalSales;
    const amount = Math.round(result.revenue * frac);
    const fan = Math.round(result.fans * frac);
    chunks.push({ amount, fans: fan });
    acc += amount;
    accF += fan;
  }
  chunks[AIR_WEEKS - 1].amount += result.revenue - acc;
  chunks[AIR_WEEKS - 1].fans += result.fans - accF;
  chunks.forEach((c, i) => {
    if (c.amount > 0 || c.fans > 0)
      payouts.push({ week: start + i, amount: c.amount, fans: c.fans, label: `“${draft.title}” broadcast` });
  });

  const released: Project = { ...p, stage: "airing", result, airedWeek: start };

  const run: RunState = {
    ...r,
    cash: r.cash - extra.spent + bonusCash,
    partners,
    /* your release floods its own genres for a while */
    recentReleases: [
      ...pruneReleases(r.recentReleases ?? [], r.week),
      ...draft.genres.map((g) => ({ genre: g, week: r.week, weight: 2 })),
    ],
    rd: r.rd + released.rdGained,
    payouts,
    totalRevenue: r.totalRevenue + result.revenue,
    showsMade: r.showsMade + 1,
    hits: r.hits + (result.tier === "hit" || result.hallOfFame ? 1 : 0),
    bestScore: Math.max(r.bestScore, result.total),
    comboLevels: { ...r.comboLevels, [ck]: Math.min(5, (r.comboLevels[ck] ?? 0) + 1) },
    genreKnowledge: draft.genres.reduce((acc, genre) => {
      const gain = result.hallOfFame ? 3 : result.tier === "hit" ? 2 : 1;
      acc[genre] = Math.min(12, (acc[genre] ?? 0) + gain);
      return acc;
    }, { ...(r.genreKnowledge ?? {}) }),
    castCombos: [...new Set([...r.castCombos, ...result.chemDiscovered])],
    castAffinityDiscovered: [...new Set([...r.castAffinityDiscovered, ...breakthroughs.map((item) => item.castId)])],
    arcCombos: [...new Set([...r.arcCombos, ...result.arcCombosDiscovered])],
    arcKnowledge: draft.arcs.reduce(
      (acc2, id) => ({ ...acc2, [id]: (acc2[id] ?? 0) + 1 }),
      r.arcKnowledge ?? {}
    ),
    arcGenreKnowledge: draft.arcs.reduce((acc2, id) => {
      for (const genre of draft.genres) {
        const key = `${id}|${genre}`;
        acc2[key] = (acc2[key] ?? 0) + 1;
      }
      return acc2;
    }, { ...(r.arcGenreKnowledge ?? {}) } as Record<string, number>),
    studioTop: Math.max(r.studioTop, result.quality),
    franchises,
    pendingSequel:
      result.total >= 30 ? fkey : draft.franchiseKey === r.pendingSequel ? null : r.pendingSequel,
    hallOfFame: result.hallOfFame
      ? [...r.hallOfFame, { title: draft.title, score: result.total, genres: draft.genres, animeType: draft.animeType, protag: draft.protag, week: r.week }]
      : r.hallOfFame,
    staff: (() => {
      /* the training room deepens what shipping a show teaches */
      const gain = 1 + facilityFX(r.facilities).trainSkill;
      const xp = releaseXp(p, result.total, result.tier) * dynastyFX(r).xpMult;
      const moraleSwing = result.hallOfFame || result.tier === "hit" ? 12 : result.tier === "flop" ? -14 : 4;
      return r.staff.map((s) => {
        if (!p.staffIds.includes(s.id)) return s;
        let nx: typeof s = {
          ...s,
          stamina: Math.max(15, s.stamina - 18),
          story: Math.min(99, s.story + gain),
          art: Math.min(99, s.art + gain),
          sound: Math.min(99, s.sound + gain),
        };
        nx = recordShow(nx, draft.title, result.total, r.week);
        nx = moraleDelta(nx, moraleSwing);
        const g = gainXp(nx, xp);
        if (g.levelsGained > 0)
          notices.push(`${g.staff.name} is promoted to ${levelTitle(g.staff.level)} (Lv ${g.staff.level})!`);
        return g.staff;
      });
    })(),
    yearShows: [...r.yearShows, { title: draft.title, studio: r.studio, score: result.total, player: true }],
    lastResult: result,
    lastDraft: draft,
    notices,
    /* the finished team is freed for the next production */
    projects: r.projects.map((x) => (x.id === projectId ? { ...released, staffIds: [] } : x)),
  };

  return { run, result };
}

/* =================================================================== */
/*                         FACILITY OPS                                */
/* =================================================================== */

/** how many facility rooms this office can hold */
export const officeSlots = (r: RunState) => OFFICES[r.officeLevel].slots;

/** null = the next tier can be bought; otherwise the blocking reason */
export function facilityBlockReason(r: RunState, id: FacilityId): string | null {
  const owned = (r.facilities[id] ?? 0) > 0;
  const nx = nextTier(r.facilities, id);
  if (!nx) return "Already at maximum tier";
  if (!owned && slotsUsed(r.facilities) >= officeSlots(r))
    return `No free rooms — ${OFFICES[r.officeLevel].name} has ${officeSlots(r)} slot${officeSlots(r) > 1 ? "s" : ""}`;
  if (r.cash < nx.cost) return `Needs £${nx.cost.toLocaleString("en-GB")}`;
  if (r.rd < nx.rd) return `Needs ${nx.rd} research data (you have ${r.rd})`;
  return null;
}

/** build a new room or upgrade an owned one to the next tier */
export function buyFacility(r: RunState, id: FacilityId): RunState | null {
  if (facilityBlockReason(r, id)) return null;
  const nx = nextTier(r.facilities, id)!;
  const def = facilityDef(id);
  return {
    ...r,
    cash: r.cash - nx.cost,
    rd: r.rd - nx.rd,
    facilities: { ...r.facilities, [id]: nx.tier },
    notices: [
      ...r.notices,
      nx.tier === 1
        ? `${def.name} built — one of ${officeSlots(r)} rooms in use.`
        : `${def.name} upgraded to tier ${nx.tier}/${MAX_TIER}.`,
    ],
  };
}

/** move to the next office; every built room is packed up and moves too */
export function relocateOffice(r: RunState): RunState | null {
  const next = OFFICES[r.officeLevel + 1];
  if (!next || r.cash < next.cost) return null;
  return {
    ...r,
    cash: r.cash - next.cost,
    officeLevel: r.officeLevel + 1,
    notices: [
      ...r.notices,
      `Studio relocated to ${next.name}!` +
        (slotsUsed(r.facilities) > 0
          ? ` All ${slotsUsed(r.facilities)} facilit${slotsUsed(r.facilities) > 1 ? "ies" : "y"} moved with you (${next.slots} room slots now).`
          : ""),
    ],
  };
}

/* =================================================================== */
/*                           CAREER OPS                                */
/* =================================================================== */

/** contract jobs teach the whole crew a little */
export function grantContractXp(r: RunState): RunState {
  const notices = [...r.notices];
  const staff = r.staff.map((s) => {
    const g = gainXp(ensureCareer(s, r.week), CONTRACT_XP * dynastyFX(r).xpMult);
    if (g.levelsGained > 0)
      notices.push(`${g.staff.name} is promoted to ${levelTitle(g.staff.level)} (Lv ${g.staff.level})!`);
    return moraleDelta(g.staff, 2);
  });
  return { ...r, staff, notices };
}

/* ---------------------------------------------------- department heads */
/** null = this person can take the chair; otherwise the blocking reason */
export function headBlockReason(r: RunState, slot: HeadSlot, staffId: string): string | null {
  const s = r.staff.find((x) => x.id === staffId);
  if (!s) return "No such staff member";
  if (r.officeLevel < HEAD_MIN_OFFICE[slot])
    return `Requires ${OFFICES[HEAD_MIN_OFFICE[slot]].name} or larger`;
  if (slot !== "production" && s.role !== slot) return `Needs a ${slot}`;
  if (s.level < HEAD_MIN_LEVEL[slot]) return `Needs career level ${HEAD_MIN_LEVEL[slot]} (they are Lv ${s.level})`;
  if (r.heads[slot] === staffId) return "Already holds this chair";
  return null;
}

/** promote someone into a department chair (+25% salary, big morale boost) */
export function appointHead(r: RunState, slot: HeadSlot, staffId: string): RunState | null {
  if (headBlockReason(r, slot, staffId)) return null;
  const s = r.staff.find((x) => x.id === staffId)!;
  return {
    ...r,
    heads: { ...r.heads, [slot]: staffId },
    staff: r.staff.map((x) =>
      x.id === staffId
        ? moraleDelta({ ...x, salary: Math.round((x.salary * HEAD_SALARY_MULT) / 10) * 10 }, 15)
        : x
    ),
    notices: [...r.notices, `${s.name} is now ${HEAD_TITLES[slot]} — ${s.name.split(" ")[0]}'s department runs itself.`],
  };
}

/* ------------------------------------------------------------- training */
/** null = this person can take a course right now */
export function trainBlockReason(r: RunState, staffId: string): string | null {
  const tier = r.facilities.training ?? 0;
  if (tier < 1) return "Build a Training Room first";
  const s = r.staff.find((x) => x.id === staffId);
  if (!s) return "No such staff member";
  const busy = staffBusyReason(r, staffId);
  if (busy) return busy;
  if (r.week - (s.lastTrainedWeek ?? -99) < TRAIN_COOLDOWN)
    return `On cooldown (${TRAIN_COOLDOWN - (r.week - (s.lastTrainedWeek ?? 0))} wk left)`;
  const cost = trainCost(tier);
  if (r.cash < cost.cash) return `Needs £${cost.cash.toLocaleString("en-GB")}`;
  if (r.rd < cost.rd) return `Needs ${cost.rd} research data`;
  return null;
}

/** training now occupies the employee for calendar time; the reward lands on completion. */
export function trainStaff(r: RunState, staffId: string, focus: PointType): RunState | null {
  if (trainBlockReason(r, staffId)) return null;
  const tier = r.facilities.training ?? 0;
  const cost = trainCost(tier);
  const s = r.staff.find((x) => x.id === staffId)!;
  const weeks = trainingWeeks(tier);
  const job: TrainingJob = {
    id: `train_${staffId}_${r.week}`, staffId, staffName: s.name, focus, tier,
    startWeek: r.week, completesWeek: r.week + weeks,
    startDay: r.day ?? r.week * 7, completesDay: (r.day ?? r.week * 7) + weeks * 7,
  };
  return {
    ...r, cash: r.cash - cost.cash, rd: r.rd - cost.rd,
    trainingJobs: [...(r.trainingJobs ?? []), job],
    notices: [...r.notices, `🎓 ${s.name} starts ${focus} training — ${weeks * 7} days of studio time.`],
  };
}

export function startResearchProject(r: RunState, id: string, rdCost: number): RunState | null {
  if (r.research.includes(id) || (r.researchJobs ?? []).some((j) => j.researchId === id)) return null;
  if (r.rd < rdCost) return null;
  const def = RESEARCH.find((x) => x.id === id);
  if (!def) return null;
  const weeks = researchWeeks(rdCost, r.facilities.archive ?? 0);
  const job: ResearchJob = {
    id: `research_${id}_${r.week}`, researchId: id, name: def.name,
    startWeek: r.week, completesWeek: r.week + weeks,
    startDay: r.day ?? r.week * 7, completesDay: (r.day ?? r.week * 7) + weeks * 7,
    rdCost,
  };
  return {
    ...r, rd: r.rd - rdCost, researchJobs: [...(r.researchJobs ?? []), job],
    notices: [...r.notices, `🔬 ${def.name} begins — ${weeks * 7} days in R&D (cost ${rdCost} RD).`],
  };
}

/* ------------------------------------------------------ salary politics */
export function respondSalary(
  r: RunState,
  eventId: string,
  choice: "accept" | "counter" | "refuse"
): RunState {
  const e = r.staffEvents.find((x) => x.id === eventId && x.kind === "raise");
  if (!e) return r;
  const staff = r.staff.map((s) => {
    if (s.id !== e.staffId) return s;
    if (choice === "accept") return moraleDelta({ ...s, salary: e.amount }, 15);
    if (choice === "counter")
      return moraleDelta({ ...s, salary: Math.round((s.salary + e.amount) / 2 / 10) * 10 }, 4);
    return moraleDelta(s, -18);
  });
  const name = r.staff.find((s) => s.id === e.staffId)?.name ?? "Someone";
  const note =
    choice === "accept"
      ? `${name} gets the full raise — loyalty secured.`
      : choice === "counter"
        ? `${name} meets you halfway on salary.`
        : `${name}'s raise is refused. The mood darkens.`;
  return { ...r, staff, staffEvents: r.staffEvents.filter((x) => x.id !== eventId), notices: [...r.notices, note] };
}

export function respondPoach(
  r: RunState,
  eventId: string,
  choice: "match" | "promote" | "release"
): RunState {
  const e = r.staffEvents.find((x) => x.id === eventId && x.kind === "poach");
  if (!e) return r;
  const target = r.staff.find((s) => s.id === e.staffId);
  if (!target) return { ...r, staffEvents: r.staffEvents.filter((x) => x.id !== eventId) };

  if (choice === "release") {
    return {
      ...r,
      staff: r.staff.filter((s) => s.id !== e.staffId),
      projects: r.projects.map((p) => ({ ...p, staffIds: p.staffIds.filter((id) => id !== e.staffId) })),
      staffEvents: r.staffEvents.filter((x) => x.id !== eventId),
      notices: [...r.notices, `${target.name} leaves for the rival studio. The desk feels empty.`],
    };
  }
  const staff = r.staff.map((s) => {
    if (s.id !== e.staffId) return s;
    if (choice === "match") return moraleDelta({ ...s, salary: e.amount }, 10);
    /* promote: slightly less money than the offer, but recognition + growth */
    const g = gainXp(s, 120);
    return moraleDelta({ ...g.staff, salary: Math.round((e.amount * 0.9) / 10) * 10 }, 18);
  });
  const note =
    choice === "match"
      ? `You match the rival offer — ${target.name} stays.`
      : `${target.name} stays for the promotion and the trust, not just the money.`;
  return { ...r, staff, staffEvents: r.staffEvents.filter((x) => x.id !== eventId), notices: [...r.notices, note] };
}

/* ------------------------------------------------------- rival talent */

/** hire a notable away from a rival studio: pay the signing fee, they join
    your crew with a full career — and the rival studio remembers the insult */
export function hireRivalTalent(r: RunState, talentId: string): RunState | null {
  const t = rivalTalentById(r.rivalWorld, talentId);
  if (!t) return null;
  if (r.staff.length >= staffCapacity(r)) return null;
  if (r.cash < t.cost) return null;
  const staff = rivalTalentToStaff(t, r.week);
  const studioName = r.rivalWorld.studios.find((s) => s.id === t.studioId)?.name ?? "a rival studio";
  return {
    ...r,
    cash: r.cash - t.cost,
    staff: [...r.staff, staff],
    rivalWorld: bumpRivalry(removeRivalTalent(r.rivalWorld, talentId), t.studioId, 4),
    notices: [
      ...r.notices,
      `🤝 ${t.name} (Lv${t.level} ${staff.role}) leaves ${studioName} and signs with ${r.studio} for £${t.cost.toLocaleString("en-GB")}. They won't forget this.`,
    ],
  };
}

/** the current standings — player + rivals, sorted by shared score */
export function studioRankings(r: RunState) {
  return computeRankings(r.rivalWorld, playerRankingInput(r));
}

export function studioScore(r: RunState): number {
  return Math.round(
    r.fans * 1.5 +
      r.totalRevenue / 400 +
      r.hallOfFame.length * 2200 +
      r.hits * 700 +
      r.showsMade * 200 +
      r.awards * 3000
  );
}

export type { TierKey };
export { PUN_TITLES, RIVAL_STUDIOS, tierOf };


/* ============================== market ops ============================== */

/** one-shot haggle over a commission: rep decides your odds. Success sweetens
    the deal; failure locks it as-is. Either way, no second attempt. */
export function negotiateCommission(
  r: RunState,
  commissionId: string,
  ask: "advance" | "share"
): RunState | null {
  const c = (r.commissions ?? []).find((x) => x.id === commissionId);
  if (!c || c.negotiated) return null;
  const rep = (r.partners ?? {})[c.partnerId] ?? REP_START;
  const partner = partnerById(c.partnerId);
  const win = Math.random() < negotiationChance(rep);
  const next: Commission = win
    ? ask === "advance"
      ? { ...c, negotiated: true, advance: Math.round((c.advance * NEGOTIATE_ADVANCE_MULT) / 5000) * 5000 }
      : { ...c, negotiated: true, share: Math.max(0.2, Math.round((c.share + NEGOTIATE_SHARE_DELTA) * 100) / 100) }
    : { ...c, negotiated: true };
  return {
    ...r,
    commissions: (r.commissions ?? []).map((x) => (x.id === commissionId ? next : x)),
    notices: [
      ...r.notices,
      win
        ? ask === "advance"
          ? `${partner?.name ?? "The partner"} agrees to a bigger advance: £${next.advance.toLocaleString("en-GB")}.`
          : `${partner?.name ?? "The partner"} drops their share to ${Math.round(next.share * 100)}%.`
        : `${partner?.name ?? "The partner"} won't budge. The terms stand.`,
    ],
  };
}

/** answer a ringing phone: accept or decline a market event */
export function resolveMarketEvent(r: RunState, eventId: string, accept: boolean): RunState | null {
  const ev = (r.marketEvents ?? []).find((x) => x.id === eventId);
  if (!ev) return null;
  const rest = (r.marketEvents ?? []).filter((x) => x.id !== eventId);
  if (!accept) {
    return { ...r, marketEvents: rest, notices: [...r.notices, `You pass on the offer. The phone goes quiet.`] };
  }
  switch (ev.kind) {
    case "emergency": {
      const c = commissionForShowrunner(r.showrunner, emergencyCommission(r.week, ev.partnerId ?? "ntv8", r.partners ?? {}, r.market ?? initMarket()));
      return {
        ...r,
        marketEvents: rest,
        commissions: [...(r.commissions ?? []), c],
        notices: [...r.notices, `Emergency slot accepted — a brutal brief lands on the table (huge advance, no slack).`],
      };
    }
    case "adaptation": {
      const c = commissionForShowrunner(r.showrunner, adaptationCommission(r.week, r.partners ?? {}, r.market ?? initMarket()));
      return {
        ...r,
        marketEvents: rest,
        commissions: [...(r.commissions ?? []), c],
        notices: [...r.notices, `Adaptation rights secured — the source material's fans bring free hype (and expectations).`],
      };
    }
    case "overseas": {
      if (r.cash < (ev.amount ?? 0)) return null;
      return {
        ...r,
        marketEvents: rest,
        cash: r.cash - (ev.amount ?? 0),
        revBoostUntil: r.week + 24,
        notices: [...r.notices, `Overseas licensing signed: −£${(ev.amount ?? 0).toLocaleString("en-GB")}, +15% revenue on releases for 24 weeks.`],
      };
    }
    case "bidding": {
      const p = ev.projectId ? r.projects.find((x) => x.id === ev.projectId) : undefined;
      if (!p || p.stage !== "ready" || p.commission) return null;
      return {
        ...r,
        marketEvents: rest,
        cash: r.cash + (ev.amount ?? 0),
        projects: r.projects.map((x) =>
          x.id === p.id
            ? {
                ...x,
                commission: {
                  partnerId: ev.partnerId ?? "streamline",
                  partnerName: partnerById(ev.partnerId ?? "streamline")?.name ?? "Streamline+",
                  advance: ev.amount ?? 0,
                  share: 0.5,
                  minQuality: 0,
                  bonus: 0,
                  deadlineWeek: r.week + 999,
                },
              }
            : x
        ),
        notices: [...r.notices, `Bidding war won: +£${(ev.amount ?? 0).toLocaleString("en-GB")} now, but they take 50% of “${p.draft.title}”.`],
      };
    }
    case "gamelicence": {
      const fr = ev.franchiseKey ? r.franchises[ev.franchiseKey] : undefined;
      if (!fr) return null;
      const next = {
        ...fr,
        popularity: Math.min(100, fr.popularity + 4),
        fatigue: Math.min(100, fr.fatigue + 8),
      };
      return {
        ...r,
        marketEvents: rest,
        cash: r.cash + (ev.amount ?? 0),
        franchises: { ...r.franchises, [fr.key]: next },
        notices: [
          ...r.notices,
          `“${fr.baseTitle}” game licence signed: +£${(ev.amount ?? 0).toLocaleString("en-GB")}. The brand works overtime.`,
        ],
      };
    }
    case "collab": {
      const fr = ev.franchiseKey ? r.franchises[ev.franchiseKey] : undefined;
      if (!fr) return null;
      const next = {
        ...fr,
        popularity: Math.min(100, fr.popularity + 8),
        fatigue: Math.min(100, fr.fatigue + 6),
      };
      return {
        ...r,
        marketEvents: rest,
        cash: r.cash + (ev.amount ?? 0),
        franchises: { ...r.franchises, [fr.key]: next },
        notices: [
          ...r.notices,
          `Collaboration campaign live: “${fr.baseTitle}” is on every corner shop shelf (+£${(ev.amount ?? 0).toLocaleString("en-GB")}).`,
        ],
      };
    }
    case "sponsor": {
      const p = ev.projectId ? r.projects.find((x) => x.id === ev.projectId) : undefined;
      if (!p) return null;
      return {
        ...r,
        marketEvents: rest,
        cash: r.cash + (ev.amount ?? 0),
        projects: r.projects.map((x) =>
          x.id === p.id ? { ...x, hype: Math.max(0, x.hype - 8), issues: x.milestone === "edit" ? x.issues : x.issues + 2 } : x
        ),
        notices: [
          ...r.notices,
          `Sponsor money banked: +£${(ev.amount ?? 0).toLocaleString("en-GB")} — but the family-friendly edits cost “${p.draft.title}” hype and cause rework.`,
        ],
      };
    }
  }
}


/* ============================ franchising ops ============================ */

/** launch a merchandise line for an IP: pay now, royalties arrive weekly */
export function launchMerch(r: RunState, franchiseKey: string, productId: string): RunState | null {
  const fr = r.franchises[franchiseKey];
  const product = merchProductById(productId);
  if (!fr || !product) return null;
  if (merchBlock(fr, product, r.week, r.cash)) return null;
  const total = merchReturn(fr, product);
  const weekly = Math.floor(total / product.weeks);
  const payouts = [...r.payouts];
  for (let i = 1; i <= product.weeks; i++) {
    payouts.push({
      week: r.week + i,
      amount: weekly + (i === product.weeks ? total - weekly * product.weeks : 0),
      fans: 0,
      label: `“${fr.baseTitle}” ${product.label}`,
    });
  }
  const next: Franchise = {
    ...fr,
    merchCooldown: { ...fr.merchCooldown, [product.id]: r.week + MERCH_COOLDOWN },
  };
  return {
    ...r,
    cash: r.cash - product.cost,
    payouts,
    franchises: { ...r.franchises, [franchiseKey]: next },
    notices: [
      ...r.notices,
      `${product.label} launched for “${fr.baseTitle}”: −£${product.cost.toLocaleString("en-GB")} now, ≈£${total.toLocaleString("en-GB")} over ${product.weeks} weeks.`,
    ],
  };
}
