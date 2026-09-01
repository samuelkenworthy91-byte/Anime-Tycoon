import {
  GENRES,
  OFFICES,
  comboKey,
  dateLabel,
  PUN_TITLES,
  RIVAL_STUDIOS,
  rollCandidate,
  rollContract,
  rollRivalShows,
  type Contract,
  type Draft,
  type GenreId,
  type PointType,
  type RivalShow,
  type Arc,
  type Staff,
} from "./data";
import { tierOf, type ShowResult, type TierKey } from "./scoring";
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
  assignedStaffIds,
  computeProjectResult,
  draftCost,
  makeProject,
  projectUpfront,
  tickProjectsWeek,
  toggleAssign,
  type MilestoneOutcome,
  type Project,
} from "./projects";

export interface Franchise {
  baseTitle: string;
  season: number;
  lastScore: number;
  /** hall-of-fame shows may spawn sequels; a failed sequel ends the line */
  alive: boolean;
}

export interface HofEntry {
  title: string;
  score: number;
  genres: GenreId[];
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

export interface RunState {
  studio: string;
  showrunner: string;
  cash: number;
  fans: number;
  rd: number; // research data
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
  /** discovered cast chemistry ids */
  castCombos: string[];
  /** discovered arc synergy ids */
  arcCombos: string[];
  /** arc ids bought with research data (rd-gated arcs) */
  arcUnlocked: string[];
  /** how many times each arc id has been shipped (stats stay hidden until then) */
  arcKnowledge: Record<string, number>;
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
  /** this year's rival slate */
  rivals: RivalShow[];
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

export const MAX_WEEKS = 48 * 12; // twelve-year career
export const START_CASH = 90_000;
export const AIR_WEEKS = 8; // a show earns revenue over 8 broadcast weeks

export function initialRun(studio: string, showrunner: string): RunState {
  return {
    studio,
    showrunner,
    cash: START_CASH,
    fans: 0,
    rd: 12,
    week: 0,
    officeLevel: 0,
    showsMade: 0,
    hits: 0,
    totalRevenue: 0,
    bestScore: 0,
    staff: [],
    candidates: [rollCandidate(0), rollCandidate(0), rollCandidate(0)],
    research: [],
    genresUnlocked: ["shonen", "shojo", "slice", "fantasy"],
    mediumsUnlocked: ["tv", "ona"],
    comboLevels: {},
    castCombos: [],
    arcCombos: [],
    arcUnlocked: [],
    arcKnowledge: {},
    studioTop: 0,
    franchises: {},
    pendingSequel: null,
    contracts: [rollContract(0), rollContract(0), rollContract(0)],
    hallOfFame: [],
    lastResult: null,
    lastDraft: null,
    bailouts: 0,
    notices: [],
    awards: 0,
    payouts: [],
    rivals: rollRivalShows(1, 0),
    yearShows: [],
    awardsCeremony: null,
    incomeThisWeek: 0,
    fansThisWeek: 0,
    projects: [],
    facilities: {},
  };
}

/** bring an older save up to the current shape (additive, non-destructive) */
export function migrateRun(raw: unknown): RunState {
  const r = raw as RunState;
  return {
    ...r,
    projects: Array.isArray(r.projects) ? r.projects : [],
    facilities: r.facilities && typeof r.facilities === "object" ? r.facilities : {},
    staff: (r.staff ?? []).map((s) => ({ ...s })),
  };
}

export const office = (r: RunState) => OFFICES[r.officeLevel];
export const weeklyOutgoings = (r: RunState) =>
  office(r).rent + r.staff.reduce((a, s) => a + s.salary, 0) + facilityUpkeep(r.facilities);

/** how much cash/fans the state expects to land in the next `weeks` weeks */
export function pendingIncome(r: RunState, weeks: number): number {
  const end = r.week + weeks;
  return r.payouts.reduce((a, p) => (p.week > r.week && p.week <= end ? a + p.amount : a), 0);
}

/* ------------------------------------------------------------------ year end */
function runCeremony(year: number, yearShows: AwardNominee[], rivals: RivalShow[]): AwardCeremony {
  const all: AwardNominee[] = [
    ...yearShows,
    ...rivals.map((r) => ({ title: r.title, studio: r.studio, score: r.score, player: false })),
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

/** Advance the calendar: weekly payouts land, wages + rent charged at month end, rival shows air, and each year ends with the awards ceremony. */
export function advanceWeeks(r: RunState, n: number): RunState {
  let cash = r.cash;
  let fans = r.fans;
  const notices = [...r.notices];
  let contracts = r.contracts;
  let payouts = r.payouts;
  let rivals = r.rivals;
  let yearShows = r.yearShows;
  let awards = r.awards;
  let awardsCeremony = r.awardsCeremony;
  let projects = r.projects ?? [];
  let rd = r.rd;
  let incomeThisWeek = 0;
  let fansThisWeek = 0;
  const perWeek = weeklyOutgoings(r);
  const fx = facilityFX(r.facilities);

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

    /* every project in the pipeline gets a week of work */
    const tick = tickProjectsWeek(projects, r.staff, w, fx);
    projects = tick.projects;
    cash += tick.cashDelta;
    notices.push(...tick.notices);

    /* the archive room quietly files away research */
    rd += fx.rdWeekly;

    /* rival studios premiere their parody shows */
    const airing = rivals.filter((r2) => r2.week === w);
    if (airing.length) {
      const r2 = airing[0];
      notices.push(`${r2.studio} premieres “${r2.title}” — the internet has opinions.`);
    }

    if (w % 4 === 0) {
      const bill = perWeek * 4;
      cash -= bill;
      notices.push(
        `Payday: wages + rent${facilityUpkeep(r.facilities) > 0 ? " + facilities" : ""} −£${bill.toLocaleString("en-GB")}.`
      );
    }
    if (w % 6 === 0) contracts = [rollContract(w), rollContract(w), rollContract(w)];

    /* end of a calendar year: awards ceremony + fresh rival slate */
    if (w % 48 === 0) {
      const year = w / 48;
      const ceremony = runCeremony(year, yearShows, rivals.filter((r2) => r2.year === year));
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
      }
      yearShows = [];
      rivals = rollRivalShows(year + 1, w);
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
    rivals,
    yearShows,
    awards,
    awardsCeremony,
    projects,
    incomeThisWeek,
    fansThisWeek,
    staff: (() => {
      /* people on a production tire; everyone else recovers */
      const busy = assignedStaffIds(projects);
      const drain = Math.max(1, 3 - fx.staminaSave);
      const rest = 9 + fx.staminaRest;
      return r.staff.map((s) => ({
        ...s,
        stamina: busy.has(s.id)
          ? Math.max(12, s.stamina - n * drain)
          : Math.min(100, s.stamina + n * rest),
      }));
    })(),
    notices: notices.slice(-40),
  };
}

/* =================================================================== */
/*                        PROJECT PIPELINE OPS                          */
/* =================================================================== */

/** how many major productions this office can run at once */
export const projectCapacity = (r: RunState) => OFFICES[r.officeLevel].projects;

export const projectById = (r: RunState, id: string): Project | null =>
  r.projects.find((p) => p.id === id) ?? null;

/** null = a new project can be greenlit; otherwise the blocking reason */
export function startBlockReason(r: RunState, d?: Draft): string | null {
  const active = activeProjects(r.projects).length;
  const cap = projectCapacity(r);
  if (active >= cap)
    return `${OFFICES[r.officeLevel].name} can only run ${cap} production${cap > 1 ? "s" : ""} at once`;
  if (d && r.cash < projectUpfront(d)) return "Not enough cash for the greenlight payment";
  return null;
}

/** greenlight a new show: pays the upfront cost and enters the pipeline */
export function startProject(r: RunState, d: Draft): RunState | null {
  if (startBlockReason(r, d)) return null;
  const p = makeProject(d, r.week);
  return {
    ...r,
    cash: r.cash - projectUpfront(d),
    projects: [...r.projects, p],
    notices: [
      ...r.notices,
      `“${d.title}” greenlit — target release ${dateLabel(p.deadlineWeek)}. Total budget ≈ £${draftCost(d).toLocaleString("en-GB")}.`,
    ],
  };
}

/** move a staff member onto / off a project (exclusive assignment) */
export function assignToProject(r: RunState, projectId: string, staffId: string): RunState {
  return { ...r, projects: toggleAssign(r.projects, projectId, staffId) };
}

/** fold a played milestone sprint back into the run */
export function applyMilestone(r: RunState, projectId: string, o: MilestoneOutcome): RunState {
  const proj = projectById(r, projectId);
  const team = proj?.staffIds ?? [];
  const done = proj?.milestone ?? null;
  const fx = facilityFX(r.facilities);
  /* the QA suite catches problems before they become issues */
  const guarded: MilestoneOutcome =
    o.issues > 0 ? { ...o, issues: Math.max(0, o.issues - fx.issueGuard) } : o;
  /* the training room turns every sprint into a lesson in its discipline */
  const taught: PointType | null = done === "edit" ? null : done;
  return {
    ...r,
    cash: r.cash - o.spent,
    rd: r.rd + Math.round((o.rdGained + (o.squashed ?? 0) * 2) * fx.rdMult),
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

/** score a ready project without committing anything */
export function previewResult(r: RunState, p: Project): ShowResult {
  return computeProjectResult(p, {
    research: r.research,
    merchMult: facilityFX(r.facilities).merchMult,
    showrunner: r.showrunner,
    comboLevels: r.comboLevels,
    castCombos: r.castCombos,
    arcCombos: r.arcCombos,
    studioTop: r.studioTop,
    franchises: r.franchises,
    fans: r.fans,
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
  const result = previewResult({ ...r, cash: r.cash - extra.spent }, p);
  const draft = p.draft;

  const fkey = draft.franchiseKey ?? draft.title;
  const baseTitle = draft.franchiseKey
    ? r.franchises[draft.franchiseKey]?.baseTitle ?? draft.title
    : draft.title;
  const ck = comboKey(draft.genres);
  const notices = [...r.notices];
  if (result.hallOfFame) notices.push(`“${draft.title}” enters the HALL OF FAME!`);
  if (p.lateWeeks > 0)
    notices.push(`The network docks “${draft.title}” for delivering ${p.lateWeeks} week${p.lateWeeks > 1 ? "s" : ""} late.`);

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
    cash: r.cash - extra.spent,
    rd: r.rd + released.rdGained,
    payouts,
    totalRevenue: r.totalRevenue + result.revenue,
    showsMade: r.showsMade + 1,
    hits: r.hits + (result.tier === "hit" || result.hallOfFame ? 1 : 0),
    bestScore: Math.max(r.bestScore, result.total),
    comboLevels: { ...r.comboLevels, [ck]: Math.min(5, (r.comboLevels[ck] ?? 0) + 1) },
    castCombos: [...new Set([...r.castCombos, ...result.chemDiscovered])],
    arcCombos: [...new Set([...r.arcCombos, ...result.arcCombosDiscovered])],
    arcKnowledge: draft.arcs.reduce(
      (acc2, id) => ({ ...acc2, [id]: (acc2[id] ?? 0) + 1 }),
      r.arcKnowledge
    ),
    studioTop: Math.max(r.studioTop, result.quality),
    franchises: {
      ...r.franchises,
      [fkey]: { baseTitle, season: draft.season, lastScore: result.total, alive: result.hallOfFame },
    },
    pendingSequel:
      result.total >= 30 ? fkey : draft.franchiseKey === r.pendingSequel ? null : r.pendingSequel,
    hallOfFame: result.hallOfFame
      ? [...r.hallOfFame, { title: draft.title, score: result.total, genres: draft.genres, protag: draft.protag, week: r.week }]
      : r.hallOfFame,
    staff: (() => {
      /* the training room deepens what shipping a show teaches */
      const gain = 1 + facilityFX(r.facilities).trainSkill;
      return r.staff.map((s) =>
        p.staffIds.includes(s.id)
          ? {
              ...s,
              stamina: Math.max(15, s.stamina - 18),
              story: Math.min(99, s.story + gain),
              art: Math.min(99, s.art + gain),
              sound: Math.min(99, s.sound + gain),
            }
          : s
      );
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
