import { describe, expect, it } from "vitest";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft } from "../data";
import { awardCategoryById, awardPayoutFor, type AwardNominee } from "../awards";
import { createFranchise, creditFranchiseAward } from "../franchise";
import { advanceWeeks, initialRun } from "../state";
import { franchiseFanAppraisal } from "../sellerAuction";

const draft = (): Draft => ({
  title: "Award Darling",
  medium: "fanweb",
  budget: "standard",
  scope: "standard",
  slot: "web",
  animeType: "shonen",
  genres: ["slice"],
  audience: "teens",
  protag: PROTAGONISTS[0].id,
  protagName: PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id,
  secondaryName: SECONDARY[0].name,
  pet: PETS[0].id,
  petName: PETS[0].name,
  villain: VILLAINS[0].id,
  villainName: VILLAINS[0].name,
  arcs: ["hook", "finale"],
  sliders: [50, 50, 50],
  season: 1,
});

const seed = (d: Draft) => ({
  protag: d.protag,
  protagName: d.protagName,
  secondary: d.secondary,
  secondaryName: d.secondaryName ?? "Secondary",
  pet: d.pet,
  petName: d.petName ?? "Pet",
  villain: d.villain,
  villainName: d.villainName ?? "Villain",
});

describe("award fan economy", () => {
  it("compounds fan prizes through the 25-year career and caps the endless sandbox at Year 25", () => {
    const aoty = awardCategoryById("aoty");
    expect(awardPayoutFor(aoty, 1).fans).toBe(15_000);
    expect(awardPayoutFor(aoty, 10).fans).toBe(Math.round(15_000 * Math.pow(1.10, 9)));
    expect(awardPayoutFor(aoty, 25).fans).toBe(Math.round(15_000 * Math.pow(1.10, 24)));
    expect(awardPayoutFor(aoty, 40).fans).toBe(awardPayoutFor(aoty, 25).fans);
  });

  it("credits award fans to the exact release, franchise lifetime audience and merch value without double-crediting", () => {
    const d = draft();
    const fr = createFranchise(
      d.title,
      d,
      seed(d),
      { total: 34, revenue: 1_000_000, fans: 40_000, hallOfFame: true, sourceId: "project-1" },
      12
    );
    const beforeMerch = fr.merchValue;
    const award = { year: 5, category: "writing", name: "Best Writing", fans: 7_321 };
    const credited = creditFranchiseAward(fr, "project-1", d.title, award);
    expect(credited.entries[0].fans).toBe(47_321);
    expect(credited.entries[0].awardFans).toBe(7_321);
    expect(credited.entries[0].awards).toEqual([award]);
    expect(credited.lifetimeFans).toBe(47_321);
    expect(credited.merchValue).toBeGreaterThan(beforeMerch);
    expect(creditFranchiseAward(credited, "project-1", d.title, award)).toEqual(credited);
  });

  it("credits a full ceremony sweep to the winning franchise as well as the studio fan total", () => {
    const d = draft();
    let run = initialRun("Awards Test", "steady");
    run.week = 47;
    run.fans = 5_000;
    run.franchises = {
      [d.title]: createFranchise(
        d.title,
        d,
        seed(d),
        { total: 40, revenue: 1_000_000, fans: 50_000, hallOfFame: true, sourceId: "award-project" },
        10
      ),
    };
    const nominee: AwardNominee = {
      title: d.title,
      studio: run.studio,
      studioId: "player",
      player: true,
      animeType: "shonen",
      genres: [...d.genres],
      score: 40,
      story: 60,
      art: 60,
      sound: 60,
      audience: 500_000,
      sourceId: "award-project",
      posterId: null,
      draft: d,
      protag: d.protag,
      licensedIpAward: null,
    };
    run.yearShows = [nominee];

    const next = advanceWeeks(run, 1, { liveDaysAlreadyApplied: true });
    const ceremony = next.awardsCeremony!;
    expect(ceremony.playerAwards).toBeGreaterThan(0);
    expect(next.fans).toBe(run.fans + ceremony.playerFans);
    expect(next.franchises[d.title].lifetimeFans).toBe(50_000 + ceremony.playerFans);
    expect(next.franchises[d.title].entries[0].awardFans).toBe(ceremony.playerFans);
    expect(next.franchises[d.title].entries[0].awards).toHaveLength(ceremony.playerAwards);
  });

  it("uses diminishing fan value in rights appraisals", () => {
    expect(franchiseFanAppraisal(100_000)).toBe(4_200_000);
    expect(franchiseFanAppraisal(500_000)).toBe(12_200_000);
    expect(franchiseFanAppraisal(1_000_000)).toBe(17_200_000);
    expect(franchiseFanAppraisal(2_000_000)).toBe(22_200_000);
    expect(franchiseFanAppraisal(2_000_000) - franchiseFanAppraisal(1_000_000)).toBe(5_000_000);
  });
});
