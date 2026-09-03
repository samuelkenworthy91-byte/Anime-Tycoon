import { describe, expect, it } from "vitest";
import { initialRun, tickEditDay, tickStudioDay } from "../state";
import { makeProject } from "../projects";
import { rushOutcomeRange } from "../studioOps";
import type { Draft } from "../data";

const draft = (): Draft => ({
  title: "Cut Test", medium: "tv", budget: "standard", scope: "standard", slot: "midnight",
  genres: ["shonen"], audience: "teens", protag: "kai", protagName: "Kai",
  secondary: "s_ren", pet: "none", villain: "v_oni", arcs: [], sliders: [50, 50, 50], season: 1,
});

describe("rush spectacle and live editing tuning", () => {
  it("high skill has a much stronger rush floor and ceiling", () => {
    const junior = rushOutcomeRange(30);
    const master = rushOutcomeRange(90);
    expect(master.min).toBeGreaterThan(junior.min + 20);
    expect(master.max).toBeGreaterThan(junior.max + 45);
  });

  it("a fully exhausted worker recovers fast enough to return in two game days", () => {
    let r = initialRun("Recovery Test", "steady");
    const st = { ...r.candidates[0], stamina: 0 };
    r = { ...r, staff: [st], staffResting: { [st.id]: true } };
    r = tickStudioDay(r).run;
    expect(r.staff[0].stamina).toBeGreaterThanOrEqual(38);
    r = tickStudioDay(r).run;
    expect(r.staffResting[st.id]).not.toBe(true);
    expect(r.staff[0].stamina).toBeGreaterThanOrEqual(68);
  });

  it("live editing clears notes and awards one RD for every note removed", () => {
    let r = initialRun("Edit Test", "steady");
    const st = { ...r.candidates[0], stamina: 100 };
    let project = makeProject(draft(), 0);
    project = { ...project, stage: "post", milestone: "edit", issues: 6, staffIds: [st.id] };
    r = { ...r, staff: [st], projects: [project], rd: 0 };
    const out = tickEditDay(r, project.id).run;
    const remaining = out.projects[0].issues;
    const cleared = 6 - remaining;
    expect(cleared).toBeGreaterThan(0);
    expect(out.rd).toBe(cleared);
  });
});
