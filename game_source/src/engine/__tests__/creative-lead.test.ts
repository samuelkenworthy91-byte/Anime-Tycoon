import { afterEach, describe, expect, it, vi } from "vitest";
import { PROTAGONISTS, SECONDARY, PETS, VILLAINS, rollCandidate, type Draft } from "../data";
import { initialRun, appointProjectLead, assignToProject, creatorFollowingMult, releaseProject, startProject, type RunState } from "../state";

const draft: Draft = {
  title: "Lead Test", medium: "fanweb", budget: "indie", scope: "short", slot: "web", animeType: "shonen",
  genres: ["slice"], audience: "teens", protag: PROTAGONISTS[0].id, protagName: PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id, pet: PETS[0].id, villain: VILLAINS[0].id, arcs: ["hook"], sliders: [50, 50, 50], season: 1,
};

function staffedRun(): RunState {
  const staff = rollCandidate(0, "writer", () => 0.25);
  return { ...initialRun("Lead Studio", "steady"), cash: 5_000_000, staff: [staff], genresUnlocked: ["slice", "fantasy"] };
}

afterEach(() => vi.restoreAllMocks());

describe("universal production leads", () => {
  it("can name any assigned employee and clears the lead when they leave the team", () => {
    let run = startProject(staffedRun(), draft)!;
    const id = run.projects[0].id;
    const staffId = run.staff[0].id;
    expect(appointProjectLead(run, id, staffId)).toBeNull();
    run = assignToProject(run, id, staffId);
    run = appointProjectLead(run, id, staffId)!;
    expect(run.projects[0].creativeLeadId).toBe(staffId);
    run = assignToProject(run, id, staffId);
    expect(run.projects[0].creativeLeadId).toBeUndefined();
  });

  it("turns a named lead following into extra audience and grows it on release", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let base = staffedRun();
    base.staff = [{ ...base.staff[0], creatorFans: 100_000 }];
    const staffId = base.staff[0].id;

    let withLead = startProject(base, draft)!;
    const id = withLead.projects[0].id;
    withLead = assignToProject(withLead, id, staffId);
    withLead = appointProjectLead(withLead, id, staffId)!;
    withLead = { ...withLead, projects: withLead.projects.map((p) => ({ ...p, stage: "ready" as const, points: { story: 100, art: 100, sound: 100 } })) };

    let withoutLead = startProject({ ...base, projects: [] }, { ...draft, title: "Control" })!;
    const controlId = withoutLead.projects[0].id;
    withoutLead = assignToProject(withoutLead, controlId, staffId);
    withoutLead = { ...withoutLead, projects: withoutLead.projects.map((p) => ({ ...p, stage: "ready" as const, points: { story: 100, art: 100, sound: 100 } })) };

    const leadResult = releaseProject(withLead, id, { spent: 0, hype: 30 })!;
    const controlResult = releaseProject(withoutLead, controlId, { spent: 0, hype: 30 })!;
    expect(creatorFollowingMult({ creatorFans: 100_000 })).toBeGreaterThan(1);
    expect(leadResult.result.fans).toBeGreaterThan(controlResult.result.fans);
    expect(leadResult.run.staff[0].creatorFans).toBeGreaterThan(100_000);
  });
});
