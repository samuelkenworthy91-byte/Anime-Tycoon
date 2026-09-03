import { describe, expect, it, vi } from "vitest";
import type { Draft } from "../data";
import { applyMilestoneOutcome, makeProject, tickProjectsDay } from "../projects";
import { showrunnerBubbleOutput } from "../studioOps";

const draft = (): Draft => ({
  title: "Balance Test",
  medium: "tv",
  budget: "standard",
  scope: "standard",
  slot: "midnight",
  genres: ["shonen"],
  audience: "teens",
  protag: "kai",
  protagName: "Kai",
  secondary: "s_ren",
  pet: "none",
  villain: "v_oni",
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
});

describe("editing tradeoff and showrunner balance", () => {
  it("gives every showrunner personal bubble a senior +1 floor", () => {
    expect(showrunnerBubbleOutput(0, 0.99)).toBe(1);
    expect(showrunnerBubbleOutput(77.5, 0.99)).toBe(1);
    expect(showrunnerBubbleOutput(77.5, 0)).toBe(2);
    expect(showrunnerBubbleOutput(175, 0.99)).toBe(2);
  });

  it("allows final editing outcomes to reduce notes but never add them", () => {
    const project = { ...makeProject(draft(), 0), stage: "post" as const, milestone: "edit" as const, issues: 3 };
    const out = applyMilestoneOutcome(project, {
      points: { story: 0, art: 0, sound: 0 },
      issues: 5,
      spent: 0,
      rdGained: 0,
      squashed: 1,
    });
    expect(out.issues).toBe(2);
  });

  it("lets lateness drain cash without manufacturing another note", () => {
    const project = {
      ...makeProject(draft(), 0, 0),
      stage: "ready" as const,
      issues: 2,
      deadlineDay: 0,
      deadlineWeek: 0,
      lateDays: 13,
      lateWeeks: 2,
    };
    const out = tickProjectsDay([project], [], 14);
    expect(out.projects[0].issues).toBe(2);
    expect(out.projects[0].lateDays).toBe(14);
    expect(out.cashDelta).toBeLessThan(0);
  });

  it("lets Steady Hand suppress a pre-edit overload note at its 25% boundary", () => {
    const base = { ...makeProject(draft(), 0, 0), stage: "animation" as const, issues: 0 };
    const load = { [base.id]: 0.5 };
    const random = vi.spyOn(Math, "random").mockReturnValue(0.8);
    const normal = tickProjectsDay([base], [], 14, undefined, undefined, { speed: 0, burnMult: 1, issueChanceMult: 1 }, load);
    const steady = tickProjectsDay([base], [], 14, undefined, undefined, { speed: 0, burnMult: 1, issueChanceMult: 0.75 }, load);
    random.mockRestore();
    expect(normal.projects[0].issues).toBe(1);
    expect(steady.projects[0].issues).toBe(0);
  });
});
