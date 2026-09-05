import { describe, expect, it, vi } from "vitest";
import { initialRun, startContractAssignment, tickStudioDay, tickStudioWorkPulse } from "../state";
import { makeProject } from "../projects";
import type { Draft } from "../data";

const draft = (): Draft => ({ title:"Desk Test", medium:"tv", budget:"standard", scope:"standard", slot:"midnight", animeType: "shonen", genres:["sports"], audience:"teens", protag:"kai", protagName:"Kai", secondary:"s_ren", pet:"none", villain:"v_oni", arcs:[], sliders:[50,50,50], season:1 });

describe("visible daily studio work", () => {
  it("drains energy while assigned and eventually sends an employee to recover", () => {
    let r = initialRun("Test", "producer");
    const staff = { ...r.candidates[0], stamina: 12 };
    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };
    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };
    r = tickStudioDay(r).run;
    r = tickStudioDay(r).run;
    expect(r.staffResting[staff.id]).toBe(true);
    expect(r.staff[0].stamina).toBe(0);
  });

  it("recovers an exhausted employee before returning them to work", () => {
    let r = initialRun("Test", "producer");
    const staff = { ...r.candidates[0], stamina: 0 };
    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };
    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1), staffResting:{ [staff.id]: true } };
    for (let i=0;i<4;i++) r = tickStudioDay(r).run;
    expect(r.staff[0].stamina).toBeGreaterThanOrEqual(82);
    expect(r.staffResting[staff.id]).toBeUndefined();
  });

  it("ordinary desk work emits a visible multi-discipline contribution bubble", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let r = initialRun("Test", "producer");
    const staff = { ...r.candidates[0], story:99, stamina:100 };
    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };
    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };
    const before = r.projects[0].points.story + r.projects[0].points.art + r.projects[0].points.sound;
    const out = tickStudioWorkPulse(r);
    expect(out.pulses.length).toBeGreaterThan(0);
    expect(["story", "art", "sound"]).toContain(out.pulses[0].type);
    expect(out.pulses[0].points).toBeGreaterThan(0);
    const after = out.run.projects[0].points.story + out.run.projects[0].points.art + out.run.projects[0].points.sound;
    expect(after).toBeGreaterThan(before);
    vi.restoreAllMocks();
  });

  it("contract bubbles advance the bar immediately and may deliver before a week boundary", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let r = initialRun("Test", "producer");
    const staff = { ...r.candidates[0], art:99, stamina:100 };
    const contract = { id:"instant", name:"One-Day Cleanup", type:"art" as const, target:1, weeks:2, pay:12000, rd:3 };
    r = { ...r, staff:[staff], candidates:r.candidates.slice(1), contracts:[contract] };
    r = startContractAssignment(r, contract, [staff.id], false)!;
    const cash = r.cash;
    const out = tickStudioWorkPulse(r);
    expect(out.pulses.some((p) => p.source === "contract")).toBe(true);
    expect(out.run.contractJobs).toHaveLength(0);
    expect(out.run.cash).toBe(cash + contract.pay);
    expect(out.run.rd).toBeGreaterThan(r.rd);
    vi.restoreAllMocks();
  });
});
