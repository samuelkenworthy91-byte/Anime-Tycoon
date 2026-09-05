import { describe, expect, it, vi } from "vitest";
import { initialRun, migrateRun, percentileSkillOutput, tickEditWorkPulse, tickStudioWorkPulse } from "../state";
import { makeProject } from "../projects";
import { GENRES, PROTAGONISTS, SECONDARY, PETS, VILLAINS, type Draft } from "../data";

const draft = (): Draft => ({ title:"Test", medium:"tv", budget:"indie", scope:"standard", slot:"midnight", animeType: "shonen", genres:["romance","slice"], audience:"teens", protag:PROTAGONISTS[0].id, protagName:"Lead", secondary:SECONDARY[0].id, pet:PETS[0].id, villain:VILLAINS[0].id, arcs:[], sliders:[50,50,50], season:1 });

describe("Kairosoft live production", () => {
  it("percentile skill scales cleanly beyond 100 and 200", () => {
    expect(percentileSkillOutput(65, 0.64)).toBe(1);
    expect(percentileSkillOutput(65, 0.66)).toBe(0);
    expect(percentileSkillOutput(175, 0.74)).toBe(2);
    expect(percentileSkillOutput(175, 0.76)).toBe(1);
    expect(percentileSkillOutput(247, 0.46)).toBe(3);
    expect(percentileSkillOutput(247, 0.48)).toBe(2);
  });

  it("visible project bubbles immediately change project quality", () => {
    let r = initialRun("Live", "steady");
    const st = { ...r.candidates[0], id:"worker", story:99, art:99, sound:99, stamina:100 };
    const p = { ...makeProject(draft(), 0), staffIds:[st.id] };
    r = { ...r, staff:[st], projects:[p] };
    vi.spyOn(Math, "random").mockReturnValue(0);
    const before = r.projects[0].points.story + r.projects[0].points.art + r.projects[0].points.sound;
    const out = tickStudioWorkPulse(r);
    const after = out.run.projects[0].points.story + out.run.projects[0].points.art + out.run.projects[0].points.sound;
    expect(out.pulses.length).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(before);
    vi.restoreAllMocks();
  });

  it("editing bubbles clear notes and award exactly one RD per note", () => {
    let r = initialRun("Edit", "steady");
    const st = { ...r.candidates[0], id:"editor", story:99, art:99, sound:99, stamina:100 };
    const p = { ...makeProject(draft(),0), staffIds:[st.id], stage:"post" as const, milestone:"edit" as const, issues:5 };
    r = { ...r, staff:[st], projects:[p] };
    vi.spyOn(Math, "random").mockReturnValue(0);
    const rd = r.rd;
    const out = tickEditWorkPulse(r,p.id);
    const cleared = 5 - out.run.projects[0].issues;
    expect(cleared).toBeGreaterThan(0);
    expect(out.run.rd-rd).toBe(cleared);
    expect(out.pulses.every((x)=>x.source==="edit")).toBe(true);
    vi.restoreAllMocks();
  });

  it("old saves gain an empty genre knowledge ledger", () => {
    const old = initialRun("Old","steady") as any;
    delete old.genreKnowledge;
    expect(migrateRun(old).genreKnowledge).toEqual({});
  });

  it("Romance is practical in every role and Romance x Slice is covered", () => {
    for (const pool of [PROTAGONISTS, SECONDARY, PETS, VILLAINS]) {
      expect(pool.some((m) => [...m.visibleAff, m.hiddenAff].includes("romance"))).toBe(true);
    }
    const all = [...PROTAGONISTS, ...SECONDARY, ...PETS, ...VILLAINS];
    expect(all.some((m) => {
      const affinity = [...m.visibleAff, m.hiddenAff];
      return affinity.includes("romance") && affinity.includes("slice");
    })).toBe(true);
  });

  it("all twenty-one active genres remain present", () => expect(GENRES).toHaveLength(21));
});
