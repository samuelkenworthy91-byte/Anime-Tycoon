import { describe, expect, it, vi } from "vitest";
import { initialRun, tickStudioDay } from "../state";
import { makeProject } from "../projects";
import type { Draft } from "../data";

const draft = (): Draft => ({ title:"Desk Test", medium:"tv", budget:"standard", scope:"standard", slot:"midnight", genres:["shonen"], audience:"teens", protag:"kai", protagName:"Kai", secondary:"s_ren", pet:"none", villain:"v_oni", arcs:[], sliders:[50,50,50], season:1 });

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

  it("ordinary desk work emits a visible contribution bubble of the correct type", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let r = initialRun("Test", "producer");
    const staff = { ...r.candidates[0], story:99, stamina:100 };
    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };
    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };
    const out = tickStudioDay(r);
    expect(out.pulses.length).toBeGreaterThan(0);
    expect(out.pulses[0].type).toBe("story");
    expect(out.pulses[0].points).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });
});
