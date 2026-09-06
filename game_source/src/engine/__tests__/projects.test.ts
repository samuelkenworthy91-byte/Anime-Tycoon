import { describe, expect, it, vi } from "vitest";
import type { Draft, Staff } from "../data";
import {
  DEADLINE_SLACK,
  PRODUCTION_STAGES,
  TEAM_MAX,
  activeProjects,
  applyMilestoneOutcome,
  assignedStaffIds,
  draftCost,
  makeProject,
  projectOfStaff,
  stagePlan,
  tickProjectsWeek,
  toggleAssign,
  type MilestoneOutcome,
  type Project,
} from "../projects";
import {
  applyMilestone,
  assignToProject,
  initialRun,
  migrateRun,
  projectById,
  projectCapacity,
  releaseProject,
  startBlockReason,
  startProject,
  type RunState,
} from "../state";

/* ------------------------------------------------------------ helpers */
const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Test Show",
  medium: "tv",
  budget: "indie",
  slot: "midnight", animeType:"shonen",
  genres: ["sports"],
  audience: "teens",
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  pet: "none",
  villain: "warlord",
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
  ...over,
});

const worker = (id: string, over: Partial<Staff> = {}): Staff => ({
  id,
  name: `W-${id}`,
  role: "writer",
  story: 60,
  art: 40,
  sound: 40,
  level: 2,
  salary: 800,
  cost: 0,
  stamina: 90,
  portrait: 0,
  ...over,
});

const richRun = (over: Partial<RunState> = {}): RunState => ({
  ...initialRun("Test Studio", "steady"),
  cash: 10_000_000,
  officeLevel: 2, // Sakuga Tower: 3 project slots
  staff: [worker("a"), worker("b"), worker("c")],
  ...over,
});

/** play whatever milestone is pending with a neutral outcome */
const neutralOutcome = (): MilestoneOutcome => ({
  points: { story: 10, art: 10, sound: 10 },
  issues: 1,
  spent: 0,
  rdGained: 1,
});

/** run weeks until the project reaches `stage`, auto-playing milestones */
function runUntil(r: RunState, id: string, stage: Project["stage"], maxWeeks = 200): RunState {
  for (let i = 0; i < maxWeeks; i++) {
    let p = projectById(r, id)!;
    if (p.stage === stage) return r;
    if (p.milestone) {
      const o = neutralOutcome();
      if (p.milestone === "edit") o.squashed = p.issues;
      r = applyMilestone(r, id, o);
      p = projectById(r, id)!;
      if (p.stage === stage) return r;
    }
    const t = tickProjectsWeek(r.projects, r.staff, r.week + 1);
    r = { ...r, week: r.week + 1, projects: t.projects, cash: r.cash + t.cashDelta };
  }
  throw new Error(`never reached ${stage}`);
}

/* ------------------------------------------------------------ capacity */
describe("capacity", () => {
  it("limits simultaneous productions to the office's project slots", () => {
    let r = richRun({ officeLevel: 0 }); // Bedroom Studio: 1 slot
    expect(projectCapacity(r)).toBe(1);
    r = startProject(r, draft({ title: "One" }))!;
    expect(r).toBeTruthy();
    expect(startBlockReason(r)).toMatch(/only run 1/i);
    expect(startProject(r, draft({ title: "Two" }))).toBeNull();
  });

  it("bigger offices allow overlapping projects", () => {
    let r = richRun(); // 3 slots
    r = startProject(r, draft({ title: "One" }))!;
    r = startProject(r, draft({ title: "Two" }))!;
    r = startProject(r, draft({ title: "Three" }))!;
    expect(activeProjects(r.projects)).toHaveLength(3);
    expect(startProject(r, draft({ title: "Four" }))).toBeNull();
  });

  it("charges the greenlight payment up front", () => {
    const r0 = richRun();
    const d = draft();
    const r1 = startProject(r0, d)!;
    expect(r0.cash - r1.cash).toBe(Math.round(draftCost(d) * 0.4));
  });
});

/* ------------------------------------------------------- staff exclusivity */
describe("staff assignment", () => {
  it("a staff member can only be on one project at a time", () => {
    let r = richRun();
    r = startProject(r, draft({ title: "One" }))!;
    r = startProject(r, draft({ title: "Two" }))!;
    const [p1, p2] = r.projects;

    r = assignToProject(r, p1.id, "a");
    expect(projectById(r, p1.id)!.staffIds).toContain("a");

    // pulling them onto project 2 removes them from project 1
    r = assignToProject(r, p2.id, "a");
    expect(projectById(r, p1.id)!.staffIds).not.toContain("a");
    expect(projectById(r, p2.id)!.staffIds).toContain("a");
    expect(projectOfStaff(r.projects, "a")!.id).toBe(p2.id);

    // never duplicated across the set
    const ids = assignedStaffIds(r.projects);
    expect([...ids].filter((x) => x === "a")).toHaveLength(1);
  });

  it("toggling twice unassigns", () => {
    const p = makeProject(draft(), 0);
    let ps = toggleAssign([p], p.id, "a");
    ps = toggleAssign(ps, p.id, "a");
    expect(ps[0].staffIds).toHaveLength(0);
  });

  it("caps team size", () => {
    const p = makeProject(draft(), 0);
    let ps = [p];
    for (let i = 0; i < TEAM_MAX + 3; i++) ps = toggleAssign(ps, p.id, `s${i}`);
    expect(ps[0].staffIds.length).toBeLessThanOrEqual(TEAM_MAX);
  });
});

/* ------------------------------------------------------------ progression */
describe("weekly progression", () => {
  it("projects advance over weeks, gate on milestones, and reach ready", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    r = assignToProject(r, id, "b");

    // first gate: story sprint at end of concept
    r = runUntil(r, id, "preprod");
    let p = projectById(r, id)!;
    expect(p.milestonesDone).toContain("story");
    expect(p.points.story).toBeGreaterThan(0);

    r = runUntil(r, id, "ready");
    p = projectById(r, id)!;
    expect(p.milestonesDone).toEqual(expect.arrayContaining(["story", "art", "sound", "edit"]));
    expect(p.spent).toBeGreaterThan(Math.round(draftCost(p.draft) * 0.4)); // burn accumulated
  });

  it("a pending milestone halts stage progress until it is played", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    // run until the story milestone fires
    for (let i = 0; i < 50 && !projectById(r, id)!.milestone; i++) {
      const t = tickProjectsWeek(r.projects, r.staff, r.week + 1);
      r = { ...r, week: r.week + 1, projects: t.projects };
    }
    const before = projectById(r, id)!;
    expect(before.milestone).toBe("story");
    const t = tickProjectsWeek(r.projects, r.staff, r.week + 1);
    const after = t.projects.find((p) => p.id === id)!;
    expect(after.stage).toBe(before.stage);
    expect(after.progress).toBe(before.progress);
  });

  it("milestone outcomes fold sliders and points into the project", () => {
    let p = makeProject(draft(), 0);
    p = { ...p, milestone: "story" };
    const out = applyMilestoneOutcome(p, {
      points: { story: 25, art: 0, sound: 5 },
      issues: 2,
      spent: 1000,
      rdGained: 3,
      slider: { index: 0, value: 77 },
    });
    expect(out.stage).toBe("preprod");
    expect(out.points.story).toBe(25);
    expect(out.draft.sliders[0]).toBe(77);
    expect(out.milestone).toBeNull();
    expect(out.milestonesDone).toContain("story");
  });
});

/* ------------------------------------------------------------- deadlines */
describe("deadlines", () => {
  it("missing the deadline costs cash and hype without adding issues", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    // no staff assigned → slow; jump the clock past the deadline
    const p0 = projectById(r, id)!;
    let projects = r.projects.map((p) => (p.id === id ? { ...p, hype: 20 } : p));
    const week = p0.deadlineWeek + 1;
    const t1 = tickProjectsWeek(projects, r.staff, week);
    const t2 = tickProjectsWeek(t1.projects, r.staff, week + 1);
    const late = t2.projects.find((p) => p.id === id)!;
    expect(late.lateWeeks).toBe(2);
    expect(t1.cashDelta).toBeLessThan(-late.weeklyBurn); // burn + late fee
    expect(late.hype).toBeLessThan(20);
    expect(late.issues).toBe(p0.issues);
  });

  it("deadline includes planned weeks plus slack", () => {
    const d = draft();
    const p = makeProject(d, 10);
    const plan = stagePlan(d);
    const total = PRODUCTION_STAGES.reduce((a, s) => a + plan[s], 0);
    expect(p.deadlineWeek).toBe(10 + total + DEADLINE_SLACK);
  });

  it("late delivery docks release revenue", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    r = assignToProject(r, id, "b");
    r = runUntil(r, id, "ready");

    const onTime = releaseProject(r, id, { spent: 0, hype: 50 })!;
    const lateRun: RunState = {
      ...r,
      projects: r.projects.map((p) => (p.id === id ? { ...p, lateWeeks: 8 } : p)),
    };
    const late = releaseProject(lateRun, id, { spent: 0, hype: 50 })!;
    expect(late.result.revenue).toBeLessThan(onTime.result.revenue);
  });
});

/* ------------------------------------------------------------ release */
describe("release", () => {
  it("releasing schedules payouts, starts airing, then completes", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    r = runUntil(r, id, "ready");

    const out = releaseProject(r, id, { spent: 0, hype: 40 })!;
    expect(out).toBeTruthy();
    r = out.run;
    const p = projectById(r, id)!;
    expect(p.stage).toBe("airing");
    expect(p.staffIds).toHaveLength(0); // team freed
    expect(r.payouts.some((x) => x.week > r.week)).toBe(true);
    expect(r.showsMade).toBe(1);

    // broadcast run ends after AIR_WEEKS weeks
    let projects = r.projects;
    for (let w = r.week + 1; w <= r.week + 13; w++) {
      projects = tickProjectsWeek(projects, r.staff, w).projects;
    }
    expect(projects.find((x) => x.id === id)!.stage).toBe("done");
  });

  it("cannot release a project that is not ready", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    expect(releaseProject(r, r.projects[0].id, { spent: 0, hype: 0 })).toBeNull();
  });

  it("projects can be finished in a different order than they started", () => {
    let r = richRun();
    r = startProject(r, draft({ title: "First (movie, slow)", medium: "movie" }))!;
    r = startProject(r, draft({ title: "Second (ona, fast)", medium: "ona" }))!;
    const [slow, fast] = r.projects.map((p) => p.id);
    // staff the second project only
    r = assignToProject(r, fast, "a");
    r = assignToProject(r, fast, "b");
    r = assignToProject(r, fast, "c");

    r = runUntil(r, fast, "ready");
    expect(projectById(r, slow)!.stage).not.toBe("ready");
    r = releaseProject(r, fast, { spent: 0, hype: 30 })!.run;
    expect(projectById(r, fast)!.stage).toBe("airing");

    // now finish the first
    r = assignToProject(r, slow, "a");
    r = assignToProject(r, slow, "b");
    r = assignToProject(r, slow, "c");
    r = runUntil(r, slow, "ready");
    r = releaseProject(r, slow, { spent: 0, hype: 30 })!.run;
    expect(r.showsMade).toBe(2);
  });
});

/* --------------------------------------------------------------- saves */
describe("save / load", () => {
  it("projects survive a JSON round-trip mid-production", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    r = runUntil(r, id, "preprod");

    const loaded = migrateRun(JSON.parse(JSON.stringify(r)));
    expect(loaded.projects).toHaveLength(r.projects.length);
    const p = projectById(loaded, id)!;
    expect(p.stage).toBe("preprod");
    expect(p.staffIds).toContain("a");

    // and the loaded run keeps ticking
    const t = tickProjectsWeek(loaded.projects, loaded.staff, loaded.week + 1);
    expect(t.projects[0].progress).toBeGreaterThan(0);
  });

  it("legacy saves without a projects array migrate cleanly", () => {
    const legacy = JSON.parse(JSON.stringify(richRun())) as Record<string, unknown>;
    delete legacy.projects;
    const r = migrateRun(legacy);
    expect(r.projects).toEqual([]);
    expect(startProject(r, draft())).toBeTruthy();
  });
});
