import {
  OFFICES,
  PUN_TITLES,
  RIVAL_STUDIOS,
  rollCandidate,
  rollContract,
  rollRivalShows,
  type Contract,
  type Draft,
  type GenreId,
  type RivalShow,
  type Staff,
} from "./data";
import { tierOf, type ShowResult, type TierKey } from "./scoring";

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
}

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
  };
}

export const office = (r: RunState) => OFFICES[r.officeLevel];
export const weeklyOutgoings = (r: RunState) =>
  office(r).rent + r.staff.reduce((a, s) => a + s.salary, 0);

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
  let incomeThisWeek = 0;
  let fansThisWeek = 0;
  const perWeek = weeklyOutgoings(r);

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

    /* rival studios premiere their parody shows */
    const airing = rivals.filter((r2) => r2.week === w);
    if (airing.length) {
      const r2 = airing[0];
      notices.push(`${r2.studio} premieres “${r2.title}” — the internet has opinions.`);
    }

    if (w % 4 === 0) {
      const bill = perWeek * 4;
      cash -= bill;
      notices.push(`Payday: wages + rent −£${bill.toLocaleString("en-GB")}.`);
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
    contracts,
    payouts,
    rivals,
    yearShows,
    awards,
    awardsCeremony,
    incomeThisWeek,
    fansThisWeek,
    staff: r.staff.map((s) => ({ ...s, stamina: Math.min(100, s.stamina + n * 9) })),
    notices: notices.slice(-40),
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
