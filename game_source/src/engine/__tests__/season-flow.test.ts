import { describe, expect, it } from "vitest";
import {
  initialRun,
  startProject,
  advanceWeeks,
  releaseProject,
  applyMilestone,
  projectById,
  startBlockReason,
  forecastWeek,
  weeklyOutgoings,
  type RunState,
} from "../state";
import { activeProjects, type Project } from "../projects";
import type { Draft } from "../data";

const draft = (over: Partial<Draft>): Draft => ({
  title: "Starfall Blade",
  medium: "tv",
  budget: "standard",
  slot: "midnight",
  genres: ["shonen"],
  audience: "teens",
  protag: "kai",
  protagName: "Kai",
  secondary: "s_ren",
  pet: "p_mochi",
  villain: "v_kurogane",
  arcs: ["hook", "montage", "finale"],
  sliders: [50, 50, 50],
  season: 1,
  ...over,
});

/** resolve milestone gates hands-off until the project is ready */
function driveToReady(r: RunState, p: Project): RunState {
  let guard = 0;
  while (guard++ < 50) {
    const cur = r.projects.find((x) => x.id === p.id);
    if (!cur || cur.stage !== "ready") {
      if (!cur?.milestone) {
        r = advanceWeeks(r, 1);
        continue;
      }
    }
    const c2 = r.projects.find((x) => x.id === p.id)!;
    if (c2.stage === "ready" && !c2.milestone) return r;
    if (c2.milestone) {
      r = applyMilestone(r, c2.id, {
        points: { story: 60, art: 60, sound: 60 },
        issues: 0,
        spent: 0,
        rdGained: 1,
      });
    }
  }
  return r;
}

/** produce S1 end to end and put it on the air; returns [run, franchiseKey, p1id] */
function airSeasonOne(r: RunState): [RunState, string, string] {
  const started = startProject(r, draft({}));
  expect(started).toBeTruthy();
  r = started!;
  const p1id = r.projects[0].id;
  r = driveToReady(r, r.projects[0]);
  expect(projectById(r, p1id)?.stage).toBe("ready");
  const out = releaseProject(r, p1id, { spent: 0, hype: 10 });
  expect(out).toBeTruthy();
  r = out!.run;
  expect(projectById(r, p1id)?.stage).toBe("airing");
  return [r, projectById(r, p1id)!.draft.franchiseKey ?? projectById(r, p1id)!.draft.title, p1id];
}

const seasonDraftFor = (r: RunState, frKey: string): Draft => {
  const fr = r.franchises[frKey];
  return draft({
    title: `${fr.baseTitle} S${fr.season + 1}`,
    genres: fr.genres.slice(0, 2),
    audience: fr.audience,
    franchiseKey: frKey,
    season: fr.season + 1,
    continuation: "season",
  });
};

describe("multi-season airing loop", () => {
  it("greenlights and finishes S2 while S1 is still on air", () => {
    let r: RunState = { ...initialRun("Test Studio", "steady"), cash: 5_000_000 };
    let frKey: string, p1id: string;
    [r, frKey, p1id] = airSeasonOne(r);

    /* greenlight S2 while S1 is STILL airing — capacity should allow it */
    const started2 = startProject(r, seasonDraftFor(r, frKey));
    expect(started2).toBeTruthy();
    r = started2!;
    const p2 = activeProjects(r.projects)[0];

    /* weeks tick by: S2 progresses while S1 finishes broadcasting */
    let guard = 0;
    while (guard++ < 40) {
      r = advanceWeeks(r, 1);
      const p2now = r.projects.find((x) => x.id === p2.id)!;
      if (p2now.milestone) {
        r = applyMilestone(r, p2now.id, {
          points: { story: 60, art: 60, sound: 60 },
          issues: 0,
          spent: 0,
          rdGained: 1,
        });
      }
      if (r.projects.find((x) => x.id === p2.id)!.stage === "ready") break;
    }
    expect(projectById(r, p1id)?.stage).toBe("done");
    expect(projectById(r, p2.id)?.stage).toBe("ready");

    /* S2 releases and the franchise season counter moves */
    const out2 = releaseProject(r, p2.id, { spent: 0, hype: 10 });
    expect(out2).toBeTruthy();
    r = out2!.run;
    expect(r.franchises[frKey].season).toBe(2);
    expect(r.franchises[frKey].entries.length).toBe(2);
  }, 30000);

  it("blocks a second production of the same next season", () => {
    /* office 1 = 2 concurrent productions, so the capacity guard can't mask
       the duplicate-season guard we're testing */
    let r: RunState = { ...initialRun("Test Studio", "steady"), cash: 5_000_000, officeLevel: 1 };
    let frKey: string;
    [r, frKey] = airSeasonOne(r);

    /* S2 #1 is on the floor */
    r = startProject(r, seasonDraftFor(r, frKey))!;

    /* S2 #2 must be refused by the duplicate guard */
    const dup = seasonDraftFor(r, frKey);
    const reason = startBlockReason(r, dup);
    expect(reason).toMatch(/already in production/i);
    const cash = r.cash;
    expect(startProject(r, dup)).toBeNull();
    expect(r.cash).toBe(cash); /* nothing charged for the refusal */
  }, 30000);

  it("spends the quick-start pendingSequel the moment the season is greenlit", () => {
    let r: RunState = { ...initialRun("Test Studio", "steady"), cash: 5_000_000 };
    let frKey: string;
    [r, frKey] = airSeasonOne(r);

    /* a strong release arms the quick SEASON button; either way the greenlit
       season must leave it spent (null) afterwards */
    r = startProject(r, seasonDraftFor(r, frKey))!;
    expect(r.pendingSequel).toBeNull();
  }, 30000);

  it("startBlockReason explains a greenlight the studio cannot afford", () => {
    const r: RunState = { ...initialRun("Test Studio", "steady"), cash: 0 };
    const d = draft({});
    expect(startBlockReason(r, d)).toMatch(/not enough cash/i);
    expect(startProject(r, d)).toBeNull();
  });
});

describe("forecastWeek", () => {
  it("is a pure read and itemises exactly what tickWeek will move", () => {
    let r: RunState = { ...initialRun("Test Studio", "steady"), cash: 5_000_000 };
    let frKey: string;
    [r, frKey] = airSeasonOne(r);
    /* S1 airing (income) + S2 in production (burn) + payroll week */
    r = startProject(r, seasonDraftFor(r, frKey))!;
    /* walk the calendar to the eve of a payroll week while S1 payouts are
       still landing (12 weekly chunks from release) */
    while ((r.week + 1) % 4 !== 0) r = advanceWeeks(r, 1);
    expect(r.payouts.some((p) => p.week === r.week + 1)).toBe(true);

    const before = structuredClone(r);
    const fc = forecastWeek(r);
    expect(r).toEqual(before);

    const w = r.week + 1;
    expect(fc.week).toBe(w);
    expect(fc.income).toBe(r.payouts.reduce((a, p) => (p.week === w ? a + p.amount : a), 0));
    expect(fc.payday).toBe(weeklyOutgoings(r) * 4); /* lands every 4th week */
    expect(fc.burn).toBeGreaterThan(0); /* S2 is on the floor */
    expect(fc.income).toBeGreaterThan(0); /* S1 is on the air */
    expect(fc.net).toBe(fc.income - fc.burn - fc.lateFees - fc.payday);
    expect(fc.cashAfter).toBe(r.cash + fc.net);
  }, 30000);

  it("non-payroll weeks carry no wages, and airing projects do not burn", () => {
    let r: RunState = { ...initialRun("Test Studio", "steady"), cash: 5_000_000 };
    [r] = airSeasonOne(r);
    r = { ...r, week: 1 };

    const fc = forecastWeek(r);
    expect(fc.payday).toBe(0);
    /* only the aired S1 exists — nothing in the pipeline, nothing burning */
    expect(fc.burn).toBe(0);
    expect(activeProjects(r.projects).length).toBe(0);
    expect(fc.net).toBe(fc.income); /* income minus nothing */
  }, 30000);
});
