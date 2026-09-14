import { describe, expect, it } from "vitest";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft, type GenreId } from "../data";
import { createFranchise, type FranchiseEntry } from "../franchise";
import { makeProject } from "../projects";
import { BASE_INTERVENTIONS, interventionQuote } from "../spending";
import { contributionEffectiveSkill, initialRun, migrateRun } from "../state";
import {
  SECONDARY_SPECIALISATION_CASH,
  SECONDARY_SPECIALISATION_RD,
  alignRecruitmentPool,
  campaignForecastAccess,
  choosePrimarySpecialisation,
  chooseSecondarySpecialisation,
  secondarySpecialisationBlock,
  specialisationProjectEffects,
  studioSpecialisationProfile,
} from "../specialisation";

const draft = (genres: GenreId[], licensed = false): Draft => ({
  title: licensed ? "Licensed Fantasy" : "House Fantasy",
  medium: "fanweb",
  budget: "indie",
  scope: "short",
  slot: "web",
  animeType: "shonen",
  genres,
  audience: "teens",
  protag: PROTAGONISTS[0].id,
  protagName: licensed ? "Licensed Lead" : PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id,
  pet: PETS[0].id,
  villain: VILLAINS[0].id,
  arcs: ["hook", "lore", "finale"],
  sliders: [50, 50, 50],
  season: 1,
  ...(licensed ? { licensedIpId: "test_ip", licensedArcId: "opening", licensedCharacters: ["Licensed Lead"] } : {}),
});

const entry = (week: number, score: number, title = `Show ${week}`): FranchiseEntry => ({
  kind: "original",
  title,
  score,
  revenue: 100_000,
  fans: 1_000,
  week,
  hallOfFame: score >= 32,
  animeType: "shonen",
});

function withFantasyHistory(scores: number[]) {
  let run = initialRun("House", "steady");
  run.officeLevel = 1;
  run.week = 5;
  run = choosePrimarySpecialisation(run, "fantasy")!;
  const d = draft(["fantasy"]);
  const fr = createFranchise(
    "Fantasy House",
    d,
    { protag: d.protag, protagName: d.protagName, secondary: d.secondary, secondaryName: "S", pet: d.pet, petName: "P", villain: d.villain, villainName: "V" },
    { total: scores[0] ?? 20, revenue: 100_000, fans: 1_000, hallOfFame: (scores[0] ?? 20) >= 32 },
    4,
  );
  fr.entries = [entry(4, 40, "Before Choice"), ...scores.map((score, index) => entry(5 + index, score))];
  fr.bestScore = Math.max(...scores, 0);
  fr.lastScore = scores.at(-1) ?? 0;
  fr.lastEntryWeek = 5 + Math.max(0, scores.length - 1);
  run.franchises = { fantasy: fr };
  return run;
}

describe("studio signature-genre specialisation", () => {
  it("does not assign an old save a signature genre during migration", () => {
    const old = initialRun("Legacy", "steady") as Partial<ReturnType<typeof initialRun>>;
    delete old.strategicSpend;
    const migrated = migrateRun(old);
    expect(studioSpecialisationProfile(migrated).primary).toBeNull();
  });

  it("unlocks primary specialisation at Studio 2 and makes the choice permanent", () => {
    let run = initialRun("House", "steady");
    expect(choosePrimarySpecialisation(run, "fantasy")).toBeNull();
    run.officeLevel = 1;
    run = choosePrimarySpecialisation(run, "fantasy")!;
    expect(studioSpecialisationProfile(run).primary).toBe("fantasy");
    expect(choosePrimarySpecialisation(run, "slice")).toBeNull();
    const restored = migrateRun(JSON.parse(JSON.stringify(run)));
    expect(studioSpecialisationProfile(restored).primary).toBe("fantasy");
  });

  it("counts only post-choice signature releases and advances Studio → Authority → Institution", () => {
    const authority = withFantasyHistory([27, 28, 22, 23]);
    expect(studioSpecialisationProfile(authority)).toMatchObject({ releases: 4, hits: 2, rank: "authority" });
    const institution = withFantasyHistory([32, 30, 29, 28, 25, 24, 23, 22]);
    expect(studioSpecialisationProfile(institution)).toMatchObject({ releases: 8, hits: 4, masterpieces: 1, rank: "institution" });
  });

  it("applies identical house expertise to originals and licensed IPs with the same underlying genre", () => {
    const run = withFantasyHistory([]);
    const original = specialisationProjectEffects(run, draft(["fantasy", "horror"], false));
    const licensed = specialisationProjectEffects(run, draft(["fantasy", "horror"], true));
    expect(licensed).toEqual(original);
    expect(original.signature).toBe(true);
    expect(original.outputMult).toBeGreaterThan(1);
  });

  it("keeps outside-genre work viable but slower, riskier and more intervention-expensive", () => {
    const run = withFantasyHistory([27, 28, 22, 23]);
    const house = specialisationProjectEffects(run, draft(["fantasy"]));
    const outside = specialisationProjectEffects(run, draft(["slice"]));
    expect(house.outputMult).toBeGreaterThan(1);
    expect(house.paceMult).toBeGreaterThan(1);
    expect(outside.outputMult).toBeLessThan(1);
    expect(outside.paceMult).toBeLessThan(1);
    expect(outside.interventionCostMult).toBeGreaterThan(1);
    expect(outside.issueChanceMult).toBeGreaterThan(1);
  });

  it("feeds specialisation into live worker output rather than adding a flat review bonus", () => {
    let run = withFantasyHistory([]);
    const worker = {
      ...run.candidates[0],
      stamina: 100,
      favGenre: "horror" as GenreId,
      spec: undefined,
      genreExperience: { fantasy: 3, slice: 3 },
    };
    const sig = makeProject(draft(["fantasy"]), run.week, run.day);
    sig.staffIds = [worker.id];
    const out = makeProject(draft(["slice"]), run.week, run.day);
    out.staffIds = [worker.id];
    run = { ...run, staff: [worker], projects: [sig] };
    const signatureSkill = contributionEffectiveSkill(run, worker, "story");
    const outsideSkill = contributionEffectiveSkill({ ...run, projects: [out] }, worker, "story");
    expect(signatureSkill).toBeGreaterThan(outsideSkill);
  });

  it("makes signature rescue work cheaper/better and outside rescue work dearer/riskier", () => {
    const run = { ...withFantasyHistory([27, 28, 22, 23]), cash: 10_000_000, officeLevel: 2 };
    const intervention = BASE_INTERVENTIONS.find((item) => item.id === "animation_pass")!;
    const house = interventionQuote(run, intervention, "extended", draft(["fantasy"]))!;
    const outside = interventionQuote(run, intervention, "extended", draft(["slice"]))!;
    expect(house.cost).toBeLessThan(outside.cost);
    expect(house.points).toBeGreaterThan(outside.points);
    expect(house.risk).toBeLessThan(outside.risk);
  });

  it("improves campaign forecasting in-house while outside work needs a stronger Data Lab", () => {
    const run = withFantasyHistory([27, 28, 22, 23]);
    expect(campaignForecastAccess(run, draft(["fantasy"]), 0)).toBe("exact");
    expect(campaignForecastAccess(run, draft(["slice"]), 0)).toBe("hidden");
    expect(campaignForecastAccess(run, draft(["slice"]), 1)).toBe("band");
    expect(campaignForecastAccess(run, draft(["slice"]), 2)).toBe("exact");
  });

  it("pulls aligned specialists into recruitment pools at Authority and Institution", () => {
    const authority = withFantasyHistory([27, 28, 22, 23]);
    const authorityPool = alignRecruitmentPool(authority, authority.candidates);
    expect(authorityPool[0].favGenre).toBe("fantasy");
    const institution = withFantasyHistory([32, 30, 29, 28, 25, 24, 23, 22]);
    const institutionPool = alignRecruitmentPool(institution, institution.candidates);
    expect(institutionPool[0].favGenre).toBe("fantasy");
    expect(institutionPool[1].favGenre).toBe("fantasy");
  });

  it("reserves the second signature genre for a costly late Institution choice", () => {
    let run = withFantasyHistory([32, 30, 29, 28, 25, 24, 23, 22]);
    run = { ...run, officeLevel: 3, cash: 5_000_000, rd: 1_000, genresUnlocked: [...new Set([...run.genresUnlocked, "horror" as GenreId])] };
    expect(secondarySpecialisationBlock(run, "horror")).toBeNull();
    const cash = run.cash;
    const rd = run.rd;
    run = chooseSecondarySpecialisation(run, "horror")!;
    expect(studioSpecialisationProfile(run).secondary).toBe("horror");
    expect(run.cash).toBe(cash - SECONDARY_SPECIALISATION_CASH);
    expect(run.rd).toBe(rd - SECONDARY_SPECIALISATION_RD);
    expect(chooseSecondarySpecialisation(run, "slice")).toBeNull();
  });
});
