import { describe, expect, it } from "vitest";
import { PRODUCTION_SCOPES, type Draft, type Staff } from "../data";
import { departmentStatuses } from "../capacity";
import { partnerTier } from "../market";
import { draftCost, draftWeeks, makeProject, rawTeamCapacity, teamSpeed } from "../projects";
import { advanceWeeks, buyFacility, initialRun, startContractAssignment, startResearchProject, trainStaff, type RunState } from "../state";

const draft = (over: Partial<Draft> = {}): Draft => ({ title: "Test", medium: "tv", budget: "standard", scope: "standard", slot: "midnight", genres: ["shonen"], audience: "teens", protag: "kai", protagName: "Kai", secondary: "none", pet: "none", villain: "none", arcs: ["origin", "rival", "finale"], sliders: [50, 50, 50], season: 1, ...over });
const worker = (id: string, role: Staff["role"], n = 80): Staff => ({ id, name: id, role, story: n, art: n, sound: n, level: 6, salary: 1000, cost: 0, stamina: 100, portrait: 0 });

describe("deeper studio loop", () => {
  it("scope increases real duration and cost", () => {
    const standard = draft({ scope: "standard" });
    const prestige = draft({ scope: "prestige" });
    expect(draftWeeks(prestige)).toBeGreaterThan(draftWeeks(standard));
    expect(draftCost(prestige)).toBeGreaterThan(draftCost(standard));
    expect(PRODUCTION_SCOPES.prestige.workMult).toBeGreaterThan(1.5);
  });

  it("elite crew capacity stops deleting calendar time", () => {
    const p = makeProject(draft(), 0);
    const crew = [worker("a", "writer", 99), worker("b", "animator", 99), worker("c", "composer", 99), worker("d", "writer", 99), worker("e", "animator", 99), worker("f", "composer", 99)];
    expect(rawTeamCapacity(p, crew)).toBeGreaterThan(1.35);
    expect(teamSpeed(p, crew)).toBeLessThanOrEqual(1.35);
  });

  it("simultaneous prestige animation can overload the department", () => {
    const p1 = { ...makeProject(draft({ title: "A", scope: "prestige", budget: "blockbuster" }), 0), stage: "animation" as const };
    const p2 = { ...makeProject(draft({ title: "B", scope: "prestige", budget: "blockbuster" }), 0), stage: "animation" as const };
    const s = departmentStatuses([p1, p2], [worker("a", "animator", 70), worker("b", "animator", 70)], {}, []);
    expect(s.find((x) => x.id === "animation")!.overloaded).toBe(true);
  });

  it("partner reputation has meaningful relationship tiers", () => {
    expect(partnerTier(25).id).toBe("unknown");
    expect(partnerTier(50).id).toBe("trusted");
    expect(partnerTier(70).id).toBe("preferred");
    expect(partnerTier(90).id).toBe("strategic");
  });

  it("small contracts become background assignments without an immediate time jump", () => {
    let r = initialRun("Test", "steady");
    r = { ...r, staff: [worker("a", "writer", 95)] } as RunState;
    const c = { ...r.contracts[0], type: "story" as const, target: 10, weeks: 3 };
    r = { ...r, contracts: [c] };
    const started = startContractAssignment(r, c, ["a"])!;
    expect(started.week).toBe(0);
    expect(started.contractJobs).toHaveLength(1);
    const after = advanceWeeks(started, 1);
    expect(after.contractJobs.length).toBeLessThanOrEqual(1);
  });

  it("training and research occupy calendar time", () => {
    let r = initialRun("Test", "steady");
    r = { ...r, cash: 1_000_000, rd: 500, staff: [worker("a", "writer", 60)] } as RunState;
    r = buyFacility(r, "training")!;
    const trained = trainStaff(r, "a", "story")!;
    expect(trained.staff[0].story).toBe(60);
    expect(trained.trainingJobs).toHaveLength(1);
    const tw = trained.trainingJobs[0].completesWeek - trained.week;
    const done = advanceWeeks(trained, tw);
    expect(done.staff[0].story).toBe(61);
    const research = startResearchProject(done, "pipeline", 28)!;
    expect(research.research.includes("pipeline")).toBe(false);
    const rw = research.researchJobs[0].completesWeek - research.week;
    expect(advanceWeeks(research, rw).research.includes("pipeline")).toBe(true);
  });
});
