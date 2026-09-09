import { describe, expect, it } from "vitest";
import type { Draft } from "../data";
import { facilityFX } from "../facilities";
import { STRATEGIC_CAMPAIGNS, campaignFit, strategicCampaignHype } from "../marketing";
import { makeProject } from "../projects";
import { CAPITAL_PROJECTS, coProductionOffer, startCoProduction } from "../spending";
import { initialRun } from "../state";

const draft: Draft = {
  title: "Test Production",
  medium: "tv",
  budget: "indie",
  scope: "standard",
  slot: "midnight",
  animeType: "shonen",
  genres: ["sports"],
  audience: "teens",
  protag: "test_protag",
  protagName: "Test Protagonist",
  secondary: "test_secondary",
  secondaryName: "Test Secondary",
  pet: "test_pet",
  petName: "Test Pet",
  villain: "test_villain",
  villainName: "Test Villain",
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
};

describe("strategic economy expansion", () => {
  it("adds dedicated Legal and Data facility effects", () => {
    const fx = facilityFX({ legal: 2, data: 3 });
    expect(fx.legalNegotiationBonus).toBeCloseTo(.28);
    expect(fx.coProductionShareReduction).toBeCloseTo(.04);
    expect(fx.dataReveal).toBe(3);
    expect(fx.appraisalRdDiscount).toBe(3);
    expect(fx.campaignForecast).toBe(true);
  });

  it("keeps the prestige capital-project ladder at seven real investments", () => {
    expect(CAPITAL_PROJECTS).toHaveLength(7);
    expect(CAPITAL_PROJECTS.map((x) => x.id)).toContain("distribution_network");
    expect(CAPITAL_PROJECTS.map((x) => x.id)).toContain("flagship_hq");
  });

  it("makes campaign fit change reach without changing production points", () => {
    const social = STRATEGIC_CAMPAIGNS.find((x) => x.id === "social")!;
    const fitted = campaignFit(social, draft);
    const offBrief = campaignFit(social, { ...draft, genres: ["nordic"], audience: "adults" });
    expect(fitted).toBeGreaterThan(offBrief);
    expect(strategicCampaignHype(social, draft, 1, [])).toBeGreaterThan(strategicCampaignHype(social, { ...draft, genres: ["nordic"], audience: "adults" }, 1, []));
  });

  it("lets a rival co-producer inject cash in exchange for a release share", () => {
    const run = initialRun("Test Studio", "steady");
    const project = makeProject(draft, 0, 0);
    const withProject = { ...run, projects: [project] };
    const offer = coProductionOffer(withProject, project.id);
    expect(offer).not.toBeNull();
    const signed = startCoProduction(withProject, project.id)!;
    expect(signed.cash).toBeGreaterThan(withProject.cash);
    expect(signed.projects[0].commission?.partnerId.startsWith("coprod:")).toBe(true);
    expect(signed.projects[0].commission?.share).toBeGreaterThan(0);
  });
});
