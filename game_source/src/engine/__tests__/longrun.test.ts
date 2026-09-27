/* ======================================================================
 *  LONG-RUN QA — run a simple bot through multiple full 12-year careers
 *  and assert the economy stays sane: nobody NaN's, nobody spirals into
 *  an unavoidable death, staff actually progress, and rivals keep making
 *  shows instead of stagnating.
 * ==================================================================== */
import { describe, expect, it } from "vitest";
import { FORMAT_ORDER, GENRES, MEDIUMS, type Draft, type GenreId, type MediumId, type SlotId } from "../data";
import { rollHire } from "../careers";
import { activeProjects, projectOfStaff, projectUpfront, type MilestoneOutcome, type Project } from "../projects";
import { seededRng } from "../scoring";
import {
  advanceWeeks,
  applyMilestone,
  initialRun,
  projectCapacity,
  releaseProject,
  staffCapacity,
  startContractAssignment,
  startProject,
  tickStudioWorkPulse,
  unlockFormat,
  type RunState,
} from "../state";

const YEARS = 12;
const WEEKS = YEARS * 48;

const botDraft = (r: RunState, i: number, forcedGenrePool?: GenreId[]): Draft => {
  const genres = forcedGenrePool?.length ? forcedGenrePool : r.genresUnlocked;
  const g = genres[i % genres.length];
  const h = genres[(i * 7 + 3) % genres.length];
  const draftGenres: GenreId[] = forcedGenrePool?.length && i % 3 === 0 && h !== g ? [g, h] : [g];
  /* the bot plays the real progression: only what the studio has unlocked */
  const unlocked = r.mediumsUnlocked.length ? r.mediumsUnlocked : ["fanweb"];
  const medium = unlocked[Math.floor(Math.random() * unlocked.length)] as MediumId;
  const budget = r.cash > 2_000_000 ? "blockbuster" : r.cash > 400_000 ? "standard" : "indie";
  const slot: SlotId =
    medium === "tv" || medium === "special"
      ? (r.cash > 1_500_000 ? "prime" : r.cash > 300_000 ? "evening" : "midnight")
      : (MEDIUMS[medium].slot ?? "stream");
  return {
    title: `Sim Show ${i}`,
    medium,
    budget,
    slot,
    animeType: "shonen",
    genres: draftGenres,
    audience: "teens",
    protag: "hero",
    protagName: "Aki",
    secondary: "rival",
    pet: "none",
    villain: "warlord",
    arcs: [],
    sliders: [50, 50, 50],
    season: 1,
  };
};

const botOutcome = (p: Project, skewMix = false): MilestoneOutcome => {
  const team = p.staffIds.length;
  const power = 18 + team * 6;
  return p.milestone === "edit"
    ? { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 2_000, rdGained: 2, squashed: Math.max(0, p.issues) }
    : {
        /* The lab's skew mode keeps total milestone output identical while
           deliberately putting 70/20/10 into Story/Art/Sound. */
        points: skewMix
          ? { story: power * 2.1, art: power * 0.6, sound: power * 0.3 }
          : { story: power, art: power, sound: power },
        issues: 1,
        spent: 3_000,
        rdGained: 3,
      };
};

const botAssign = (r: RunState): RunState => {
  let projects = r.projects;
  const act = activeProjects(projects);
  let free = r.staff.filter((s) => !projectOfStaff(projects, s.id));
  for (const p of act) {
    const room = Math.max(0, 5 - p.staffIds.length);
    for (let k = 0; k < room && free.length; k++) {
      const s = free.shift()!;
      projects = projects.map((x) => (x.id === p.id ? { ...x, staffIds: [...x.staffIds, s.id] } : x));
    }
  }
  return { ...r, projects };
};

/** a sane studio takes on contract work when the cash is thin — it is the
 *  game's own bridge between projects (assign idle staff, get paid on
 *  delivery via tickStudioWorkPulse) */
const botContract = (r: RunState): RunState => {
  if (r.cash >= 60_000 || (r.contractJobs ?? []).length > 0 || !r.contracts.length) return r;
  const contract = [...r.contracts].sort((a, b) => b.pay - a.pay)[0];
  const free = r.staff.filter((s) => !projectOfStaff(r.projects, s.id) && !(r.contractJobs ?? []).some((j) => j.staffIds.includes(s.id)));
  if (!free.length) return r;
  return startContractAssignment(r, contract, [free[0].id]) ?? r;
};

const botHire = (r: RunState): RunState => {
  let staff = r.staff;
  let cash = r.cash;
  let candidates = r.candidates ?? [];
  if (staff.length >= staffCapacity(r)) return r;
  if (candidates.length === 0 && cash > 20_000) {
    cash -= 8_000;
    candidates = [rollHire(r.week), rollHire(r.week), rollHire(r.week)];
  }
  for (const c of [...candidates]) {
    if (staff.length >= staffCapacity(r)) break;
    if (cash < c.cost) break;
    cash -= c.cost;
    staff = [...staff, { ...c, joinedWeek: r.week }];
    candidates = candidates.filter((x) => x.id !== c.id);
  }
  return { ...r, cash, staff, candidates };
};

interface CareerOptions {
  showrunner?: string;
  years?: number;
  genrePool?: GenreId[];
  skewMix?: boolean;
  unlockAllGenres?: boolean;
}

function playCareer(seedLabel: string, options: CareerOptions = {}): {
  run: RunState;
  maxLevelSeen: number;
  averageScore: number;
  hallOfFame: number;
  releases: number;
} {
  /* Keep the QA career reproducible. This test used to call itself seeded
     while every system still read Math.random, so unrelated event-deck changes
     could make a 12-year staff assertion randomly pass or fail. */
  const seed = [...seedLabel].reduce((value, ch) => ((value * 33) ^ ch.charCodeAt(0)) >>> 0, 0x51a7e);
  const originalRandom = Math.random;
  Math.random = seededRng(seed);
  try {
  /* the sim measures the 12-year economy, so the studio starts as an
     established one that has already climbed the format ladder (the ladder
     itself is covered by format-progression.test.ts) */
  let r: RunState = {
    ...initialRun(`SIM ${seedLabel}`, options.showrunner ?? "steady"),
    mediumsUnlocked: ["fanweb", "ona", "tv", "ova", "special", "movie"],
    ...(options.unlockAllGenres ? { genresUnlocked: GENRES.map((genre) => genre.id) } : {}),
  };
  let greenlit = 0;
  let maxLevelSeen = Math.max(0, ...r.staff.map((s) => s.level));
  let scoreTotal = 0;
  let hallOfFame = 0;
  let releases = 0;
  const weeks = (options.years ?? YEARS) * 48;
  for (let w = 0; w < weeks; w++) {
    /* play pending milestones */
    for (const p of [...r.projects]) {
      if (p.milestone) r = applyMilestone(r, p.id, botOutcome(p, options.skewMix));
    }
    /* release ready shows immediately */
    for (const p of [...r.projects]) {
      if (p.stage === "ready") {
        const res = releaseProject(r, p.id, { spent: 0, hype: 0 });
        if (res) {
          r = res.run;
          if (res.result) {
            releases += 1;
            scoreTotal += res.result.total;
            if (res.result.hallOfFame) hallOfFame += 1;
          }
        }
      }
    }
    /* An established studio hires before spending the week's production
       budget; otherwise the bot can greenlight itself into a no-staff career. */
    r = botHire(r);
    /* greenlight up to capacity when the budget allows it */
    let guard = 0;
    while (guard++ < 4) {
      if (activeProjects(r.projects).length >= projectCapacity(r)) break;
      const draft = botDraft(r, greenlit, options.genrePool);
      if (r.cash < projectUpfront(draft) + 30_000) break;
      const next = startProject(r, draft);
      if (!next) break;
      r = next;
      greenlit++;
    }
    /* climb the format ladder as the milestones allow (RD + shows + fans) */
    for (const medium of FORMAT_ORDER) {
      const unlocked = unlockFormat(r, medium);
      if (unlocked) r = unlocked;
    }
    /* keep teams staffed; hiring already happened before greenlight so
       production budget cannot starve the recruitment step. */
    r = botAssign(r);
    r = botContract(r);
    /* A real player sees ~40 work-check cycles in a seven-day week at 1x.
       Simulate those visible contributions explicitly before the calendar tick. */
    for (let pulse = 0; pulse < 40; pulse++) r = tickStudioWorkPulse(r).run;
    /* advance one week */
    r = advanceWeeks(r, 1);
    maxLevelSeen = Math.max(maxLevelSeen, ...r.staff.map((s) => s.level), ...r.legends.map((l) => l.level));
    /* a sane player avoids runaway debt: cap one measurement point */
    if (w % 48 === 0 && process.env.LONGRUN_LOG) {
      const y = w / 48;
      // eslint-disable-next-line no-console
      console.log(
        `Y${y}  cash=${Math.round(r.cash).toLocaleString("en-GB")}  fans=${Math.round(r.fans).toLocaleString("en-GB")}  rev=${Math.round(r.totalRevenue).toLocaleString("en-GB")}  staff=${r.staff.length}  shows=${r.showsMade}  maxLv=${Math.max(0, ...r.staff.map((s) => s.level))}`
      );
    }
  }
  return {
    run: r,
    maxLevelSeen,
    averageScore: releases ? scoreTotal / releases : 0,
    hallOfFame,
    releases,
  };
  } finally {
    Math.random = originalRandom;
  }
}

describe("long-run simulation", () => {
  it("survives twelve years with a sane economy across several careers", () => {
    const results = [playCareer("A"), playCareer("B"), playCareer("C")];
    for (const { run: r, maxLevelSeen } of results) {
      /* no NaN or Infinity anywhere in the money */
      expect(Number.isFinite(r.cash)).toBe(true);
      expect(Number.isFinite(r.fans)).toBe(true);
      expect(Number.isFinite(r.totalRevenue)).toBe(true);
      /* nobody is infinitely rich or infinitely broke */
      expect(r.cash).toBeGreaterThan(-50_000_000);
      expect(r.fans).toBeGreaterThanOrEqual(0);
      /* a career is actually a career */
      expect(r.showsMade).toBeGreaterThan(0);
      /* staff progress: somebody should have levelled up meaningfully at some
         point in the career, even if a rival later poaches that veteran. */
      expect(maxLevelSeen).toBeGreaterThanOrEqual(4);
    }
  }, 60_000);

  it("rivals keep producing across a career instead of stagnating", () => {
    const { run: r } = playCareer("D");
    const totalRivalReleases = r.rivalWorld.studios.reduce((a, s) => a + s.releases.length, 0);
    expect(totalRivalReleases).toBeGreaterThan(0);
    /* at least one rival studio should be fielding new shows late on */
    const activeLate = r.rivalWorld.studios.filter((s) => s.productions.length > 0).length;
    expect(activeLate).toBeGreaterThan(0);
  }, 60_000);

  it("logs a 25-year Genji comparison for the three experimental archetypes", () => {
    const seeds = ["LAB-A", "LAB-B", "LAB-C", "LAB-D"];
    const allGenres = GENRES.map((genre) => genre.id);
    const dark: GenreId[] = ["grimdark", "vampire", "horror", "cosmic_horror"];
    const bright: GenreId[] = ["romance", "idol", "slice", "magical"];

    const aggregate = (showrunner: string, genrePool: GenreId[], skewMix = false) => {
      /* Keep each scenario on common random seeds across showrunners. The
         showrunner id must not leak into the seed label or the comparison
         becomes different careers rather than the same career with a new perk. */
      const careers = seeds.map((seed) => playCareer(`${seed}-${genrePool.join("-")}-${skewMix ? "skew" : "normal"}`, {
        showrunner,
        years: 25,
        genrePool,
        skewMix,
        unlockAllGenres: true,
      }));
      return {
        cash: Math.round(careers.reduce((sum, x) => sum + x.run.cash, 0) / careers.length),
        revenue: Math.round(careers.reduce((sum, x) => sum + x.run.totalRevenue, 0) / careers.length),
        fans: Math.round(careers.reduce((sum, x) => sum + x.run.fans, 0) / careers.length),
        averageScore: Number((careers.reduce((sum, x) => sum + x.averageScore, 0) / careers.length).toFixed(2)),
        hallOfFame: Number((careers.reduce((sum, x) => sum + x.hallOfFame, 0) / careers.length).toFixed(1)),
        releases: Number((careers.reduce((sum, x) => sum + x.releases, 0) / careers.length).toFixed(1)),
      };
    };

    const results = {
      mixedPortfolio: {
        genji: aggregate("steady", allGenres),
        darkness: aggregate("darkness", allGenres),
        dawn: aggregate("dawn", allGenres),
        unbalanced: aggregate("unbalanced", allGenres),
      },
      darkSpecialist: {
        genji: aggregate("steady", dark),
        darkness: aggregate("darkness", dark),
      },
      brightSpecialist: {
        genji: aggregate("steady", bright),
        dawn: aggregate("dawn", bright),
      },
      deliberatelySkewedDepartments: {
        genji: aggregate("steady", allGenres, true),
        unbalanced: aggregate("unbalanced", allGenres, true),
      },
    };

    // eslint-disable-next-line no-console
    console.log("SHOWRUNNER_PERK_LAB_RESULTS=" + JSON.stringify(results));
    for (const scenario of Object.values(results)) {
      for (const result of Object.values(scenario)) {
        expect(Number.isFinite(result.cash)).toBe(true);
        expect(Number.isFinite(result.revenue)).toBe(true);
        expect(result.releases).toBeGreaterThan(0);
      }
    }
  }, 180_000);
});
