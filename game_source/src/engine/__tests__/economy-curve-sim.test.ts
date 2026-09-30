import { describe, expect, it } from "vitest";
import {
  ARCS,
  FORMAT_ORDER,
  GENRES,
  MEDIUMS,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  SLOTS,
  VILLAINS,
  comboMult,
  type CastMember,
  type CastRole,
  type Draft,
  type MediumId,
  type SlotId,
} from "../data";
import { rollHire } from "../careers";
import { genreTargetFor } from "../genreTargets";
import { activeProjects, projectOfStaff, projectUpfront, type MilestoneOutcome, type Project } from "../projects";
import { seededRng } from "../scoring";
import { genreUnlockCost, unlockGenreLicense } from "../progression";
import { randomStartingGenres } from "../startingGenres";
import {
  advanceWeeks,
  applyMilestone,
  arcLockReason,
  initialRun,
  projectCapacity,
  releaseProject,
  relocateOffice,
  staffCapacity,
  startContractAssignment,
  startProject,
  tickStudioWorkPulse,
  unlockFormat,
  type RunState,
} from "../state";
import {
  ARCBALL_INVESTMENTS,
  arcballInvestmentQuote,
  arcballStateOf,
  purchaseArcballInvestment,
  runArcballCamp,
  type ArcballInvestmentId,
} from "../arcball";

const YEARS = 25;
const WEEKS = YEARS * 48;
const RUNNERS = ["steady", "operations", "marketer"] as const;
const SEEDS = Array.from({ length: 10 }, (_, i) => `R${i + 1}`);

const pools: Record<CastRole, CastMember[]> = {
  protag: PROTAGONISTS,
  secondary: SECONDARY,
  pet: PETS,
  villain: VILLAINS,
};

function bestGenrePair(r: RunState, index: number) {
  const unlocked = r.genresUnlocked.length ? r.genresUnlocked : ["slice"];
  if (unlocked.length < 2) return [unlocked[0]];
  const pairs: (typeof unlocked)[] = [];
  for (let a = 0; a < unlocked.length; a++) {
    for (let b = a + 1; b < unlocked.length; b++) pairs.push([unlocked[a], unlocked[b]]);
  }
  pairs.sort((a, b) => comboMult(b, true) - comboMult(a, true));
  const strong = pairs.slice(0, Math.min(6, pairs.length));
  return strong[index % strong.length] ?? [unlocked[index % unlocked.length]];
}

const botDraft = (r: RunState, i: number): Draft => {
  const genres = bestGenrePair(r, i);
  const unlocked = r.mediumsUnlocked.length ? r.mediumsUnlocked : ["fanweb"];
  const medium = unlocked[Math.floor(Math.random() * unlocked.length)] as MediumId;
  const budget = r.cash > 8_000_000 ? "blockbuster" : r.cash > 750_000 ? "standard" : "indie";
  const ideal = genreTargetFor(genres).ideal;
  const leadGenre = genres[0];
  const slot = (Object.entries(SLOTS).find(([, def]) => def.best.some((g) => genres.includes(g)))?.[0]
    ?? (medium === "tv" || medium === "special" ? "evening" : (MEDIUMS[medium].slot ?? "stream"))) as SlotId;

  const affinity = (member: CastMember) => {
    const visible = genres.filter((g) => member.visibleAff.includes(g)).length;
    const hidden = r.castAffinityDiscovered.includes(member.id) && genres.includes(member.hiddenAff) ? 2 : 0;
    return visible + hidden;
  };
  const preferredLead = [...PROTAGONISTS].sort((a, b) => affinity(b) - affinity(a))[0] ?? PROTAGONISTS[0];
  const animeType = preferredLead.type;
  const pick = (role: CastRole) =>
    [...pools[role]]
      .filter((member) => member.type === animeType)
      .sort((a, b) => affinity(b) - affinity(a))[0]
    ?? pools[role][0];

  const accessibleArcs = ARCS
    .filter((arc) => !arc.franchiseOnly && !arcLockReason(arc, r) && !(arc.anti ?? []).some((g) => genres.includes(g)))
    .map((arc) => ({
      id: arc.id,
      score: arc.q
        + (arc.syn ?? []).filter((g) => genres.includes(g)).length * ((arc.synQ ?? 0) + 5)
        + (arc.f ?? 0) * 30,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((arc) => arc.id);

  const protag = pick("protag");
  const secondary = pick("secondary");
  const pet = pick("pet");
  const villain = pick("villain");

  return {
    title: `Economy Sim ${i}`,
    medium,
    budget,
    slot,
    animeType,
    genres,
    audience: "teens",
    protag: protag.id,
    protagName: protag.name,
    secondary: secondary.id,
    pet: pet.id,
    villain: villain.id,
    arcs: accessibleArcs,
    sliders: [...ideal] as [number, number, number],
    season: 1,
  };
};

const botOutcome = (p: Project): MilestoneOutcome => {
  const team = p.staffIds.length;
  const power = 20 + team * 7;
  if (p.milestone === "edit") {
    return { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 5_000, rdGained: 3, squashed: Math.max(0, p.issues) };
  }
  const points = { story: 0, art: 0, sound: 0 };
  if (p.milestone === "story") points.story = power;
  if (p.milestone === "art") points.art = power;
  if (p.milestone === "sound") points.sound = power;
  return { points, issues: 0, spent: 5_000, rdGained: 4 };
};

const botAssign = (r: RunState): RunState => {
  let projects = r.projects;
  let free = r.staff.filter((s) => !projectOfStaff(projects, s.id));
  for (const p of activeProjects(projects)) {
    const target = Math.min(8, Math.max(4, Math.ceil(r.staff.length / Math.max(1, activeProjects(projects).length))));
    const room = Math.max(0, target - p.staffIds.length);
    for (let k = 0; k < room && free.length; k++) {
      const st = free.shift()!;
      projects = projects.map((x) => x.id === p.id ? { ...x, staffIds: [...x.staffIds, st.id] } : x);
    }
  }
  return { ...r, projects };
};

const botContract = (r: RunState): RunState => {
  if (r.cash >= 100_000 || r.contractJobs.length > 0 || !r.contracts.length) return r;
  const contract = [...r.contracts].sort((a, b) => b.pay - a.pay)[0];
  const free = r.staff.filter((s) => !projectOfStaff(r.projects, s.id) && !r.contractJobs.some((j) => j.staffIds.includes(s.id)));
  return free.length ? (startContractAssignment(r, contract, [free[0].id]) ?? r) : r;
};

const botHire = (r: RunState): RunState => {
  let staff = r.staff;
  let cash = r.cash;
  let candidates = r.candidates ?? [];
  if (staff.length >= staffCapacity(r)) return r;
  if (candidates.length === 0 && cash > 35_000) {
    cash -= 8_000;
    candidates = [rollHire(r.week), rollHire(r.week), rollHire(r.week)];
  }
  for (const c of [...candidates].sort((a, b) => (b.story + b.art + b.sound) - (a.story + a.art + a.sound))) {
    if (staff.length >= staffCapacity(r)) break;
    const reserve = r.officeLevel === 0 ? 30_000 : 75_000;
    if (cash - c.cost < reserve) break;
    cash -= c.cost;
    staff = [...staff, { ...c, joinedWeek: r.week }];
    candidates = candidates.filter((x) => x.id !== c.id);
  }
  return { ...r, cash, staff, candidates };
};

function botProgression(r: RunState): RunState {
  let out = r;
  let moved = relocateOffice(out);
  while (moved) {
    out = moved;
    moved = relocateOffice(out);
  }
  for (const medium of FORMAT_ORDER) {
    const unlocked = unlockFormat(out, medium);
    if (unlocked) out = unlocked;
  }
  let guard = 0;
  while (guard++ < 2 && out.rd > 35 && out.genresUnlocked.length < 12) {
    const next = GENRES
      .filter((g) => !out.genresUnlocked.includes(g.id))
      .map((g) => ({ id: g.id, cost: genreUnlockCost(out, g.id) }))
      .sort((a, b) => a.cost - b.cost)[0];
    if (!next || out.rd - next.cost < 20) break;
    const unlocked = unlockGenreLicense(out, next.id);
    if (!unlocked) break;
    out = unlocked;
  }
  return out;
}

function botArcballCapital(r: RunState): RunState {
  let out = r;
  const state = arcballStateOf(out);
  if (!state.unlocked) return out;
  const priority: ArcballInvestmentId[] = ["medical", "performance", "analytics", "arena"];
  for (const id of priority) {
    const quote = arcballInvestmentQuote(out, id);
    if (quote.cost === null || quote.blockedReason) continue;
    const safety = Math.max(10_000_000, quote.cost * 3);
    if (out.cash - quote.cost < safety) continue;
    out = purchaseArcballInvestment(out, id) ?? out;
    break;
  }
  const after = arcballStateOf(out);
  if (after.campYear !== after.seasonYear) {
    if (out.cash > 750_000_000) out = runArcballCamp(out, 3) ?? out;
    else if (out.cash > 250_000_000) out = runArcballCamp(out, 2) ?? out;
    else if (out.cash > 75_000_000) out = runArcballCamp(out, 1) ?? out;
  }
  return out;
}

type CurveResult = {
  showrunner: string;
  seed: string;
  cashByYear: number[];
  revenueByYear: number[];
  first100m: number | null;
  first500m: number | null;
  first1b: number | null;
  first2b: number | null;
  finalCash: number;
  finalRevenue: number;
  shows: number;
  bestScore: number;
};

function firstCross(values: number[], threshold: number): number | null {
  const idx = values.findIndex((value) => value >= threshold);
  return idx < 0 ? null : idx + 1;
}

function playCareer(showrunner: string, seedLabel: string): CurveResult {
  const seed = [...(`${showrunner}|${seedLabel}`)].reduce((value, ch) => ((value * 33) ^ ch.charCodeAt(0)) >>> 0, 0x51a7e);
  const originalRandom = Math.random;
  Math.random = seededRng(seed);
  try {
    let r: RunState = {
      ...initialRun(`ECON ${showrunner} ${seedLabel}`, showrunner),
      genresUnlocked: randomStartingGenres(),
    };
    let greenlit = 0;
    const cashByYear: number[] = [];
    const revenueByYear: number[] = [];

    for (let w = 0; w < WEEKS; w++) {
      for (const p of [...r.projects]) {
        if (p.milestone) r = applyMilestone(r, p.id, botOutcome(p));
      }
      for (const p of [...r.projects]) {
        if (p.stage !== "ready") continue;
        const res = releaseProject(r, p.id, { spent: 0, hype: 0 });
        if (res) r = res.run;
      }

      r = botProgression(r);
      r = botHire(r);
      r = botProgression(r);

      let guard = 0;
      while (guard++ < 4 && activeProjects(r.projects).length < projectCapacity(r)) {
        const d = botDraft(r, greenlit);
        const reserve = r.officeLevel <= 1 ? 60_000 : 150_000;
        if (r.cash < projectUpfront(d) + reserve) break;
        const next = startProject(r, d);
        if (!next) break;
        r = next;
        greenlit++;
      }

      r = botAssign(r);
      r = botContract(r);
      r = botArcballCapital(r);
      for (let pulse = 0; pulse < 40; pulse++) r = tickStudioWorkPulse(r).run;
      r = advanceWeeks(r, 1);

      if ((w + 1) % 48 === 0) {
        cashByYear.push(r.cash);
        revenueByYear.push(r.totalRevenue);
      }
    }

    return {
      showrunner,
      seed: seedLabel,
      cashByYear,
      revenueByYear,
      first100m: firstCross(cashByYear, 100_000_000),
      first500m: firstCross(cashByYear, 500_000_000),
      first1b: firstCross(cashByYear, 1_000_000_000),
      first2b: firstCross(cashByYear, 2_000_000_000),
      finalCash: r.cash,
      finalRevenue: r.totalRevenue,
      shows: r.showsMade,
      bestScore: r.bestScore,
    };
  } finally {
    Math.random = originalRandom;
  }
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[idx];
}
const median = (values: number[]) => percentile(values, .5);

const simDescribe = process.env.ECONOMY_CURVE_SIM === "1" ? describe : describe.skip;
const requestedRunner = process.env.ECONOMY_SHOWRUNNER;
const activeRunners = requestedRunner && RUNNERS.includes(requestedRunner as (typeof RUNNERS)[number])
  ? [requestedRunner as (typeof RUNNERS)[number]]
  : [...RUNNERS];

simDescribe("25-year competent-player economy curve", () => {
  it("runs ten deterministic careers for each requested showrunner", () => {
    const careers: CurveResult[] = [];
    for (const showrunner of activeRunners) for (const seed of SEEDS) careers.push(playCareer(showrunner, seed));

    const summary = activeRunners.map((showrunner) => {
      const rows = careers.filter((row) => row.showrunner === showrunner);
      const yearly = Array.from({ length: YEARS }, (_, index) => {
        const values = rows.map((row) => row.cashByYear[index]);
        return {
          year: index + 1,
          p10: Math.round(percentile(values, .1)),
          median: Math.round(median(values)),
          p90: Math.round(percentile(values, .9)),
        };
      });
      const crossing = (key: "first100m" | "first500m" | "first1b" | "first2b") => {
        const reached = rows.map((row) => row[key]).filter((value): value is number => value !== null);
        return {
          reached: reached.length,
          medianYear: reached.length ? median(reached) : null,
          earliest: reached.length ? Math.min(...reached) : null,
          latest: reached.length ? Math.max(...reached) : null,
        };
      };
      return {
        showrunner,
        yearly,
        first100m: crossing("first100m"),
        first500m: crossing("first500m"),
        first1b: crossing("first1b"),
        first2b: crossing("first2b"),
        finalCashMedian: Math.round(median(rows.map((row) => row.finalCash))),
        finalRevenueMedian: Math.round(median(rows.map((row) => row.finalRevenue))),
        showsMedian: median(rows.map((row) => row.shows)),
        bestScoreMedian: median(rows.map((row) => row.bestScore)),
      };
    });

    console.log("ECONOMY_CURVE_SIM_RESULT=" + JSON.stringify(summary));
    console.log("ECONOMY_CURVE_RUNS=" + JSON.stringify(careers.map((row) => ({
      showrunner: row.showrunner,
      seed: row.seed,
      first100m: row.first100m,
      first500m: row.first500m,
      first1b: row.first1b,
      first2b: row.first2b,
      finalCash: Math.round(row.finalCash),
      shows: row.shows,
      bestScore: row.bestScore,
    }))));

    expect(careers).toHaveLength(activeRunners.length * 10);
    for (const row of careers) {
      expect(row.cashByYear).toHaveLength(YEARS);
      expect(Number.isFinite(row.finalCash)).toBe(true);
      expect(row.shows).toBeGreaterThan(0);
    }
  }, 900_000);
});
