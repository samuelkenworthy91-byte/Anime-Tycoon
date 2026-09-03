import { describe, expect, it } from "vitest";
import { initialRun, startContractAssignment } from "../state";
import { makeProject, applyMilestoneOutcome } from "../projects";
import { rushResearchCost, rushStreamPoint, showrunnerContractSkill } from "../studioOps";
import type { Draft } from "../data";

const draft = (): Draft => ({
  title: "Working Title",
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

describe("playtest QoL pass", () => {
  it("lets the showrunner take a contract without staff", () => {
    const r = initialRun("Test", "producer");
    const c = r.contracts[0];
    const next = startContractAssignment(r, c, [], true);
    expect(next).not.toBeNull();
    expect(next!.contractJobs[0].showrunner).toBe(true);
    expect(next!.contractJobs[0].staffIds).toEqual([]);
  });

  it("showrunner contract skill has a useful floor", () => {
    expect(showrunnerContractSkill("producer", 0, "story")).toBeGreaterThanOrEqual(50);
  });

  it("better rush leaders need less RD for the same confidence", () => {
    expect(rushResearchCost(90, 0.8)).toBeLessThan(rushResearchCost(25, 0.8));
  });

  it("lead streams add positive points", () => {
    expect(rushStreamPoint(70, 0.5)).toBeGreaterThan(0);
  });

  it("edit milestone can lock final title and cast names", () => {
    let p = makeProject(draft(), 0);
    p = { ...p, stage: "post", milestone: "edit" };
    const out = applyMilestoneOutcome(p, {
      points: { story: 0, art: 0, sound: 0 },
      issues: 0,
      spent: 0,
      rdGained: 0,
      squashed: 0,
      rename: {
        title: "Final Cut",
        protagName: "Renamed Hero",
        secondaryName: "Renamed Support",
        petName: "Renamed Pet",
        villainName: "Renamed Villain",
      },
    });
    expect(out.draft.title).toBe("Final Cut");
    expect(out.draft.protagName).toBe("Renamed Hero");
    expect(out.draft.secondaryName).toBe("Renamed Support");
    expect(out.draft.villainName).toBe("Renamed Villain");
  });
});
