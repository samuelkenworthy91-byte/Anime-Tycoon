/* ======================================================================
 *  LONG-RUN QA — run a simple bot through multiple full 12-year careers
 *  and assert the economy stays sane: nobody NaN's, nobody spirals into
 *  an unavoidable death, staff actually progress, and rivals keep making
 *  shows instead of stagnating.
 * ==================================================================== */
import { describe, expect, it } from "vitest";
import { FORMAT_ORDER, MEDIUMS, type Draft, type MediumId, type SlotId } from "../data";
import { rollHire } from "../careers";
import { activeProjects, projectOfStaff, projectUpfront, type MilestoneOutcome, type Project } from "../projects";
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

const botDraft = (r: RunState, i: number): Draft => {
  const genres = r.genresUnlocked;
  const g = genres[i % genres.length];
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
    genres: [g],
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

const botOutcome = (p: Project): MilestoneOutcome => {
  const team = p.staffIds.length;
  const power = 18 + team * 6;
  return p.milestone === "edit"
    ? { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 2_000, rdGained: 2, squashed: Math.max(0, p.issues) }
    : {
        points: { story: power, art: power, sound: power },
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

function playCareer(seedLabel: string): RunState {
  /* the sim measures the 12-year economy, so the studio starts as an
     established one that has already climbed the format ladder (the ladder
     itself is covered by format-progression.test.ts) */
  let r: RunState = {
    ...initialRun(`SIM ${seedLabel}`, "steady"),
    mediumsUnlocked: ["fanweb", "ona", "tv", "ova", "special", "movie"],
  };
  let greenlit = 0;
  for (let w = 0; w < WEEKS; w++) {
    /* play pending milestones */
    for (const p of [...r.projects]) {
      if (p.milestone) r = applyMilestone(r, p.id, botOutcome(p));
    }
    /* release ready shows immediately */
    for (const p of [...r.projects]) {
      if (p.stage === "ready") {
        const res = releaseProject(r, p.id, { spent: 0, hype: 0 });
        if (res) r = res.run;
      }
    }
    /* greenlight up to capacity when the budget allows it */
    let guard = 0;
    while (guard++ < 4) {
      if (activeProjects(r.projects).length >= projectCapacity(r)) break;
      const draft = botDraft(r, greenlit);
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
    /* keep teams staffed and staff hired */
    r = botAssign(r);
    r = botHire(r);
    r = botContract(r);
    /* A real player sees ~40 work-check cycles in a seven-day week at 1x.
       Simulate those visible contributions explicitly before the calendar tick. */
    for (let pulse = 0; pulse < 40; pulse++) r = tickStudioWorkPulse(r).run;
    /* advance one week */
    r = advanceWeeks(r, 1);
    /* a sane player avoids runaway debt: cap one measurement point */
    if (w % 48 === 0 && process.env.LONGRUN_LOG) {
      const y = w / 48;
      // eslint-disable-next-line no-console
      console.log(
        `Y${y}  cash=${Math.round(r.cash).toLocaleString("en-GB")}  fans=${Math.round(r.fans).toLocaleString("en-GB")}  rev=${Math.round(r.totalRevenue).toLocaleString("en-GB")}  staff=${r.staff.length}  shows=${r.showsMade}  maxLv=${Math.max(0, ...r.staff.map((s) => s.level))}`
      );
    }
  }
  return r;
}

describe("long-run simulation", () => {
  it("survives twelve years with a sane economy across several careers", () => {
    const results = [playCareer("A"), playCareer("B"), playCareer("C")];
    for (const r of results) {
      /* no NaN or Infinity anywhere in the money */
      expect(Number.isFinite(r.cash)).toBe(true);
      expect(Number.isFinite(r.fans)).toBe(true);
      expect(Number.isFinite(r.totalRevenue)).toBe(true);
      /* nobody is infinitely rich or infinitely broke */
      expect(r.cash).toBeGreaterThan(-50_000_000);
      expect(r.fans).toBeGreaterThanOrEqual(0);
      /* a career is actually a career */
      expect(r.showsMade).toBeGreaterThan(0);
      /* staff progress: somebody should have levelled up meaningfully */
      expect(Math.max(...r.staff.map((s) => s.level))).toBeGreaterThanOrEqual(4);
    }
  }, 60_000);

  it("rivals keep producing across a career instead of stagnating", () => {
    const r = playCareer("D");
    const totalRivalReleases = r.rivalWorld.studios.reduce((a, s) => a + s.releases.length, 0);
    expect(totalRivalReleases).toBeGreaterThan(0);
    /* at least one rival studio should be fielding new shows late on */
    const activeLate = r.rivalWorld.studios.filter((s) => s.productions.length > 0).length;
    expect(activeLate).toBeGreaterThan(0);
  }, 60_000);
});
