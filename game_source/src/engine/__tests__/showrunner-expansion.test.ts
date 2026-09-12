import { describe, expect, it, vi, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { SHOWRUNNERS, RESEARCH, type Draft } from "../data";
import { initialRun, migrateRun, startResearchProject, tickStudioDay, advanceWeeks, forecastWeek } from "../state";
import { studioProduction, gainXp, WEEKLY_XP } from "../careers";
import { makeProject } from "../projects";
import { createFranchise, recordContinuation } from "../franchise";
import { researchWeeks } from "../studioOps";

const draft: Draft = { title: "Test IP", medium: "fanweb", budget: "standard", scope: "standard", slot: "web", animeType: "shonen", genres: ["slice"], audience: "teens", protag: "kai", protagName: "Kai", secondary: "none", pet: "none", villain: "none", arcs: [], sliders: [50, 50, 50], season: 1 };
afterEach(() => vi.restoreAllMocks());

describe("showrunner expansion", () => {
  it("exposes twelve unique playable identities with valid temporary or final artwork and stable save IDs", () => {
    expect(SHOWRUNNERS.map(s => s.id)).toEqual(["steady", "vision", "producer", "marketer", "operations", "franchise", "mentor", "research", "casting", "festival", "dealmaker", "genre"]);
    for (const s of SHOWRUNNERS) {
      for (const path of [s.sprite, s.portrait, s.img]) expect(existsSync(resolve("public", path)), path).toBe(true);
      const old = initialRun("Saved Studio", s.id);
      const loaded = migrateRun(JSON.parse(JSON.stringify({ ...old, cash: 12345, rd: 67 })));
      expect(loaded.showrunner).toBe(s.id);
      expect(loaded.cash).toBe(12345);
      expect(loaded.rd).toBe(67);
    }
  });

  it("Ravi applies exactly 0.75 duration after archive bonuses, without changing RD", () => {
    for (const tier of [0, 1, 3]) for (const cost of [18, 36, 85]) {
      expect(researchWeeks(cost, tier, "research")).toBe(researchWeeks(cost, tier, "vision") * 0.75);
    }
    const def = RESEARCH.find(x => !x.requires && !x.repeatable)!;
    const seed = { ...initialRun("Research", "vision"), rd: 1000, day: 3, facilities: { archive: 1 } };
    const normal = startResearchProject(seed, def.id, def.rd)!;
    const ravi = startResearchProject({ ...seed, showrunner: "research" }, def.id, def.rd)!;
    expect(ravi.rd).toBe(normal.rd);
    expect(ravi.researchJobs[0].completesDay! - 3).toBe((normal.researchJobs[0].completesDay! - 3) * 0.75);
    const due = ravi.researchJobs[0].completesDay!;
    expect(tickStudioDay({ ...ravi, day: Math.ceil(due) - 1 }).run.research).not.toContain(def.id);
    expect(tickStudioDay({ ...ravi, day: Math.ceil(due) }).run.research).toContain(def.id);
    expect(advanceWeeks(ravi, Math.ceil(ravi.researchJobs[0].completesWeek)).research).toContain(def.id);
    const noJobs = { ...seed, projects: [], researchJobs: [] };
    expect(advanceWeeks({ ...noJobs, showrunner: "research" }, 1).rd).toBe(advanceWeeks(noJobs, 1).rd);
  });

  it("Elliot speeds the live schedule and lowers both actual burn and its forecast", () => {
    const seed = initialRun("Operations", "vision");
    const p = { ...makeProject(draft, 0), stage: "animation" as const, milestone: null, weeklyBurn: 7000 };
    const normal = { ...seed, day: 1, projects: [p] };
    const ops = { ...normal, showrunner: "operations" };
    expect(studioProduction({}, [], "operations")).toEqual({ speed: 0.1, burnMult: 0.9 });
    const a = tickStudioDay(normal).run;
    const b = tickStudioDay(ops).run;
    expect(b.cash - a.cash).toBe(100);
    expect(b.projects[0].progress).toBeGreaterThan(a.projects[0].progress);
    expect(forecastWeek(ops).burn).toBe(forecastWeek(normal).burn * 0.9);
    const worker = seed.candidates[0];
    expect(studioProduction({ production: worker.id }, [worker], "operations").burnMult).toBeCloseTo(0.81);
  });

  it("Amara improves rest in both clocks and weekly work XP without changing others", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const seed = initialRun("Mentor", "vision");
    const worker = { ...seed.candidates[0], stamina: 20, xp: 0, level: 1, traits: [] };
    const a = { ...seed, staff: [worker], day: 1 };
    const b = { ...a, showrunner: "mentor" };
    expect(tickStudioDay(a).run.staff[0].stamina).toBe(38);
    expect(tickStudioDay(b).run.staff[0].stamina).toBe(42.5);
    expect(advanceWeeks(b, 1).staff[0].stamina - 20).toBe((advanceWeeks(a, 1).staff[0].stamina - 20) * 1.25);
    const job = { id: "course", staffId: worker.id, staffName: worker.name, focus: "art" as const, tier: 1, startWeek: 0, completesWeek: 8 };
    const active = { ...b, trainingJobs: [job] };
    const expected = gainXp(worker, Math.max(1, WEEKLY_XP - 1) * 1.25).staff;
    expect(advanceWeeks(active, 1).staff[0].xp).toBe(expected.xp);
  });

  it("Freja's fatigue multiplier applies only to newly added continuation fatigue", () => {
    const result = { total: 28, revenue: 500000, fans: 40000, hallOfFame: false };
    const seed = { protag: "kai", protagName: "Kai", secondary: "none", pet: "none", villain: "none" };
    const fr = { ...createFranchise("IP", draft, seed, result, 0), fatigue: 20 };
    const d = { ...draft, continuation: "season" as const };
    const normal = recordContinuation(fr, d, result, 10).franchise;
    const freja = recordContinuation(fr, d, result, 10, { fatigueMult: 0.75 }).franchise;
    expect(freja.fatigue - fr.fatigue).toBe((normal.fatigue - fr.fatigue) * 0.75);
    expect(freja.popularity).toBe(normal.popularity);
    expect(freja.entries).toEqual(normal.entries);
  });
});
