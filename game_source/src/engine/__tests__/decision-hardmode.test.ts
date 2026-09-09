import { describe, expect, it, vi } from "vitest";
import { genreTargetFor } from "../genreTargets";
import { initialRun, startResearchProject } from "../state";
import { makeProject, applyMilestoneOutcome } from "../projects";
import { scrapProject } from "../projectActions";
import type { Draft } from "../data";

const draft: Draft = {
  title: "Hard Mode", medium: "fanweb", budget: "indie", slot: "web", animeType: "shonen",
  genres: ["slice", "fantasy"], audience: "teens", protag: "kai", protagName: "Kai",
  secondary: "s_aoi", pet: "p_mochi", villain: "v_akuma", arcs: [], sliders: [50,50,50], season: 1,
};

describe("hard-mode production targets", () => {
  it("gives different genre pairs distinct exact targets", () => {
    expect(genreTargetFor(["slice", "fantasy"]).ideal).not.toEqual(genreTargetFor(["slice", "horror"]).ideal);
    expect(genreTargetFor(["slice"]).ideal).not.toEqual(genreTargetFor(["fantasy"]).ideal);
  });
});

describe("project control", () => {
  it("scraps an unfinished project and writes off the slot", () => {
    const run = initialRun("Test", "steady");
    const p = makeProject(draft, 0);
    const out = scrapProject({ ...run, projects: [p] }, p.id)!;
    expect(out.projects).toHaveLength(0);
    expect(out.notices.at(-1)).toContain("SCRAPPED");
  });

  it("can award a last-minute craft bubble after edit", () => {
    const p = { ...makeProject(draft, 0), stage: "post" as const, milestone: "edit" as const };
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const out = applyMilestoneOutcome(p, { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0, squashed: 0 });
    expect(out.lastMinuteBoost).toBeTruthy();
    vi.restoreAllMocks();
  });
});

describe("decision modifiers", () => {
  it("can accelerate the next R&D job", () => {
    const base = { ...initialRun("Test", "steady"), rd: 100 };
    const boosted = { ...base, decisionModifiers: [{ id: "x", kind: "researchSpeed" as const, label: "boost", createdWeek: 0, expiresWeek: 20, uses: 1, mult: 0.5 }] };
    const a = startResearchProject(base, "storyboard", 20)!;
    const b = startResearchProject(boosted, "storyboard", 20)!;
    expect((b.researchJobs[0].completesDay ?? 999)).toBeLessThan(a.researchJobs[0].completesDay ?? 0);
    expect(b.decisionModifiers).toHaveLength(0);
  });
});
