import { describe, expect, it } from "vitest";
import {
  CAREER_WEEKS,
  CAREER_YEARS,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  VILLAINS,
  type Draft,
  type GenreId,
} from "../data";
import { audienceProfileForRelease } from "../audienceSegments";
import {
  internationalAudienceFit,
  merchAudienceFit,
  publicityAudienceFit,
} from "../publicity";
import {
  addSlatePlan,
  plansForQuarter,
  quarterStartWeek,
  slateQuarterWarnings,
} from "../slate";
import { initMarket } from "../market";
import {
  movementSalesMultiplier,
  tickIndustryMovements,
} from "../industryTrends";
import { completeResearchTrack, researchTrackLevel } from "../researchTracks";
import {
  recordRelationshipRelease,
  relationshipRecord,
  type StaffRelationshipRecord,
} from "../staffRelationships";
import { initialRun } from "../state";
import { createFranchise } from "../franchise";
import { studioReputationTraits } from "../studioReputation";
import { careerEraForWeek } from "../careerEras";
import { bondKey } from "../careers";

const makeDraft = (genres: GenreId[] = ["monster_taming"]): Draft => ({
  title: "Depth & Clarity Test",
  medium: "tv",
  budget: "standard",
  scope: "standard",
  slot: "prime",
  animeType: "shonen",
  genres,
  audience: "teens",
  protag: PROTAGONISTS[0].id,
  protagName: PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id,
  pet: PETS[0].id,
  villain: VILLAINS[0].id,
  arcs: ["hook", "lore", "finale"],
  sliders: [50, 50, 50],
  season: 1,
});

describe("Depth & Clarity audience model", () => {
  it("creates one normalized fandom profile that commercial systems can share", () => {
    const profile = audienceProfileForRelease(makeDraft(), {
      total: 32,
      fans: 80_000,
      commercial: { index: 4 } as any,
      chemMult: 1.1,
    });
    expect(profile.core + profile.casual + profile.online + profile.prestige + profile.collectors).toBe(100);
    expect(profile.collectors).toBeGreaterThan(0);
    expect(merchAudienceFit(profile, "figures")).toBeGreaterThan(1);
    expect(publicityAudienceFit(profile, "character")).toBeGreaterThan(0.9);
    expect(internationalAudienceFit(profile, "animation")).toBeGreaterThan(0.9);
  });
});

describe("Depth & Clarity slate", () => {
  it("stores executive intent separately from real projects and warns about tentpole collisions", () => {
    let run = initialRun("Slate Test", "steady");
    const target = quarterStartWeek(4, 0) + 6;
    run = addSlatePlan(run, {
      kind: "original",
      title: "Tentpole A",
      targetWeek: target,
      importance: "tentpole",
    });
    run = addSlatePlan(run, {
      kind: "original",
      title: "Tentpole B",
      targetWeek: target + 2,
      importance: "tentpole",
    });
    expect(run.projects).toHaveLength(0);
    expect(plansForQuarter(run, 4, 0)).toHaveLength(2);
    expect(slateQuarterWarnings(run, 4, 0).some((warning) => warning.includes("Multiple tentpoles"))).toBe(true);
  });
});

describe("Depth & Clarity cultural movements", () => {
  it("turns sustained market heat into a multi-season revival that changes sales, not review points", () => {
    const market = initMarket();
    for (const genre of Object.keys(market.genres) as GenreId[]) market.genres[genre] = 0;
    market.genres.mecha = 2;
    const rolls = [0.1, 0.5, 0.2];
    const tick = tickIndustryMovements([], 12, market, [], Object.keys(market.genres) as GenreId[], () => rolls.shift() ?? 0.2);
    expect(tick.movements).toHaveLength(1);
    expect(tick.movements[0]).toMatchObject({ kind: "revival", genre: "mecha" });
    expect(movementSalesMultiplier(tick.movements, makeDraft(["mecha"]), 24)).toBeGreaterThan(1);
    expect(movementSalesMultiplier(tick.movements, makeDraft(["slice"]), 24)).toBe(1);
  });
});

describe("Depth & Clarity research disciplines", () => {
  it("levels disciplines while old technology ids unlock only as milestones", () => {
    let carrier = {
      research: [] as string[],
      notices: [] as string[],
      researchTrackLevels: {},
    };
    carrier = completeResearchTrack(carrier, "production");
    expect(researchTrackLevel(carrier, "production")).toBe(1);
    expect(carrier.research).toContain("pipeline");
    carrier = completeResearchTrack(carrier, "production");
    expect(researchTrackLevel(carrier, "production")).toBe(2);
    expect(carrier.research).toContain("qa");
  });
});

describe("Depth & Clarity staff relationships", () => {
  it("turns repeated acclaimed collaboration into a Golden Pair", () => {
    let run = initialRun("People Test", "steady");
    const a = { ...run.candidates[0], id: "rel_a", name: "Aiko Test" };
    const b = { ...run.candidates[1], id: "rel_b", name: "Ren Test" };
    const key = bondKey(a.id, b.id);
    const record: StaffRelationshipRecord = {
      key,
      staffIds: [a.id, b.id],
      kind: "partnership",
      formedWeek: 1,
      lastActiveWeek: 1,
      sharedReleases: 0,
      acclaimedReleases: 0,
      bestScore: 0,
      goldenPair: false,
    };
    run = { ...run, staff: [a, b], staffRelationships: [record], bonds: {} };
    run = recordRelationshipRelease(run, [a.id, b.id], "Hit One", 28);
    run = recordRelationshipRelease(run, [a.id, b.id], "Hit Two", 30);
    run = recordRelationshipRelease(run, [a.id, b.id], "Hit Three", 32);
    const relationship = relationshipRecord(run, a.id, b.id)!;
    expect(relationship.sharedReleases).toBe(3);
    expect(relationship.acclaimedReleases).toBe(3);
    expect(relationship.goldenPair).toBe(true);
    expect(relationship.bestTitle).toBe("Hit Three");
  });
});


describe("Depth & Clarity earned studio reputation", () => {
  it("derives a franchise-machine reputation from the career the player actually built", () => {
    let run = initialRun("Reputation Test", "steady");
    const d = makeDraft(["fantasy"]);
    const franchise = createFranchise(
      "House Line",
      d,
      {
        protag: d.protag,
        protagName: d.protagName,
        secondary: d.secondary,
        secondaryName: "S",
        pet: d.pet,
        petName: "P",
        villain: d.villain,
        villainName: "V",
      },
      { total: 28, revenue: 500_000, fans: 20_000, hallOfFame: false },
      4,
    );
    franchise.entries.push(
      { kind: "season", title: "House Line S2", score: 29, revenue: 600_000, fans: 25_000, week: 52, animeType: "shonen" },
      { kind: "season", title: "House Line S3", score: 30, revenue: 700_000, fans: 30_000, week: 100, animeType: "shonen" },
    );
    franchise.totalRevenue = 1_800_000;
    franchise.lifetimeFans = 75_000;
    franchise.bestScore = 30;
    franchise.lastScore = 30;
    franchise.lastEntryWeek = 100;
    franchise.season = 3;
    run = { ...run, franchises: { house: franchise }, showsMade: 3, hits: 3 };
    expect(studioReputationTraits(run).map((trait) => trait.id)).toContain("franchise_machine");
  });
});

describe("Depth & Clarity formal career boundary", () => {
  it("ends the scored career after exactly 25 years and then becomes sandbox", () => {
    expect(CAREER_YEARS).toBe(25);
    expect(CAREER_WEEKS).toBe(25 * 48);
    expect(careerEraForWeek(CAREER_WEEKS - 1).id).toBe("legacy");
    expect(careerEraForWeek(CAREER_WEEKS).id).toBe("sandbox");
  });
});
