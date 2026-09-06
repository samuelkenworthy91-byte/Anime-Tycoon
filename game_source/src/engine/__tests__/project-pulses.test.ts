import { describe, expect, it } from "vitest";
import { initialRun, rollStudioWorkPulses, tickStudioWorkPulse, PROJECT_NOTE_PULSE_CHANCE, PROJECT_RESEARCH_PULSE_CHANCE } from "../state";
import { makeProject } from "../projects";
import type { Draft } from "../data";

const draft = (): Draft => ({
  title: "Pulse Test",
  medium: "fanweb",
  budget: "standard",
  scope: "standard",
  slot: "web",
  animeType: "shonen",
  genres: ["slice"],
  audience: "teens",
  protag: "kai",
  protagName: "Kai",
  secondary: "none",
  pet: "none",
  villain: "none",
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
});

function activeRun(issues = 4) {
  let r = initialRun("Pulse", "steady");
  const st = { ...r.candidates[0], stamina: 100 };
  let project = makeProject(draft(), 0);
  project = { ...project, stage: "animation", milestone: null, issues, staffIds: [st.id] };
  return { ...r, staff: [st], projects: [project], rd: 10 };
}

describe("rare project pulses (DeskPulse system)", () => {
  it("a ~2% roll produces a +1 RD research bubble and applies the RD", () => {
    const r = activeRun();
    const pulses = rollStudioWorkPulses(r, () => 0); // always below research chance
    const research = pulses.filter((p) => p.kind === "research");
    expect(research).toHaveLength(1);
    /* the pulse effect is applied by the same tick that shows bubbles */
    const out = tickStudioWorkPulse({ ...r, rd: 10 }, () => 0).run;
    expect(out.rd).toBeGreaterThan(10);
  });

  it("a ~5% roll produces a +1 editing note bubble and adds an issue", () => {
    const r = activeRun(4);
    /* 0.03: above research (2%), below note (5%) */
    const pulses = rollStudioWorkPulses(r, () => 0.03);
    expect(pulses.some((p) => p.kind === "note")).toBe(true);
    expect(pulses.some((p) => p.kind === "research")).toBe(false);
    const out = tickStudioWorkPulse(r, () => 0.03).run;
    expect(out.projects[0].issues).toBe(5);
  });

  it("no pulse fires on an ordinary roll", () => {
    const r = activeRun();
    expect(rollStudioWorkPulses(r, () => 0.9).some((p) => p.kind)).toBe(false);
  });

  it("Steady Hand narrows the note chance (existing issue-reduction respected)", () => {
    const steady = rollStudioWorkPulses(activeRun(), () => 0.045);
    const harsh = rollStudioWorkPulses({ ...activeRun(), showrunner: "harsh" }, () => 0.045);
    expect(steady.some((p) => p.kind === "note")).toBe(false);
    expect(harsh.some((p) => p.kind === "note")).toBe(true);
  });

  it("contracts never receive project notes; edit bay can never gain notes", () => {
    const r = activeRun();
    const contractOnly = { ...r, projects: [], contractJobs: [] };
    /* no active production -> no project pulse at all */
    expect(rollStudioWorkPulses(contractOnly, () => 0).some((p) => p.kind)).toBe(false);
    /* a milestone (edit bay) project is excluded from pulses */
    const editing = { ...r, projects: [{ ...r.projects[0], milestone: "edit" as const }] };
    expect(rollStudioWorkPulses(editing, () => 0).some((p) => p.kind)).toBe(false);
  });

  it("named constants are the isolated tuning knobs", () => {
    expect(PROJECT_RESEARCH_PULSE_CHANCE).toBeCloseTo(0.02, 3);
    expect(PROJECT_NOTE_PULSE_CHANCE).toBeCloseTo(0.05, 3);
  });
});
