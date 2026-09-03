import { describe, expect, it, vi } from "vitest";
import { initialRun, startMilestoneRush, tickRushDay, respondRushBoost, crunchRush, RUSH_CRUNCH_COST } from "../state";
import { makeProject } from "../projects";
import type { Draft } from "../data";

const draft = (): Draft => ({ title:"Rush Test", medium:"tv", budget:"standard", scope:"standard", slot:"midnight", genres:["shonen"], audience:"teens", protag:"kai", protagName:"Kai", secondary:"s_ren", pet:"none", villain:"v_oni", arcs:[], sliders:[50,50,50], season:1 });

describe("continuous GDS-style production", () => {
  it("starts a live rush instead of resolving the milestone immediately", () => {
    const r = initialRun("Test", "producer");
    const pr = { ...makeProject(draft(), 0), milestone: "story" as const, progress: 1 };
    const run = { ...r, projects:[pr] };
    const out = startMilestoneRush(run, pr.id, { leadId:"showrunner", leadName:"Runner", skill:60, type:"story", cost:0, slider:65 });
    expect(out?.projects[0].rush?.daysWorked).toBe(0);
    expect(out?.projects[0].milestone).toBe("story");
    expect(out?.projects[0].draft.sliders[0]).toBe(65);
  });

  it("adds bounded lead points each day and completes after four days", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let r = initialRun("Test", "producer");
    const pr = { ...makeProject(draft(), 0), milestone: "story" as const, progress: 1 };
    r = { ...r, projects:[pr] };
    r = startMilestoneRush(r, pr.id, { leadId:"showrunner", leadName:"Runner", skill:60, type:"story", cost:0, slider:50 })!;
    for (let i=0;i<4;i++) r = tickRushDay(r).run;
    expect(r.projects[0].points.story).toBeGreaterThan(0);
    expect(r.projects[0].rush).toBeNull();
    expect(r.projects[0].milestonesDone).toContain("story");
    vi.restoreAllMocks();
  });

  it("research boost spends RD and resolves the pending idea", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let r = initialRun("Test", "producer");
    const pr = { ...makeProject(draft(), 0), milestone:"story" as const, rush:{ milestone:"story" as const, type:"story" as const, leadId:"showrunner", leadName:"Runner", skill:70, cost:0, slider:50, daysWorked:1, durationDays:4, pointsAdded:4, boostAsked:false, boostPrompt:{actorId:"showrunner",name:"Runner",skill:70,type:"story" as const}, crunchDays:0 } };
    r = { ...r, rd:50, projects:[pr] };
    const before = r.rd;
    r = respondRushBoost(r, pr.id, 0.8);
    expect(r.rd).toBeLessThan(before);
    expect(r.projects[0].rush?.boostPrompt).toBeNull();
    expect(r.projects[0].rush?.boostAsked).toBe(true);
    vi.restoreAllMocks();
  });

  it("crunch costs cash and powers the next two rush days", () => {
    let r = initialRun("Test", "producer");
    const pr = { ...makeProject(draft(), 0), milestone:"art" as const, rush:{ milestone:"art" as const, type:"art" as const, leadId:"showrunner", leadName:"Runner", skill:70, cost:0, slider:50, daysWorked:1, durationDays:4, pointsAdded:4, boostAsked:true, boostPrompt:null, crunchDays:0 } };
    r = { ...r, projects:[pr] };
    const cash = r.cash;
    r = crunchRush(r, pr.id);
    expect(r.cash).toBe(cash - RUSH_CRUNCH_COST);
    expect(r.projects[0].rush?.crunchDays).toBe(2);
  });
});
