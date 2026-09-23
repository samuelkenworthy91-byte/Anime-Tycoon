import { describe, expect, it } from "vitest";
import { SHOWRUNNERS, type Draft } from "../data";
import { addSlatePlan, rescheduleSlatePlan, slatePreparation } from "../slate";
import { initialRun } from "../state";
import { specialisationProjectEffects, studioSpecialisationProfile } from "../specialisation";
import { audienceProfileForDraft } from "../audienceSegments";
import { STRATEGIC_CAMPAIGNS, strategicCampaignHype } from "../marketing";
import { audienceWhispererMerchMult, publicityAudienceFit } from "../publicity";

const draft: Draft = {
  title: "Test",
  medium: "fanweb",
  budget: "indie",
  scope: "short",
  slot: "web",
  animeType: "shojo",
  genres: ["romance"],
  audience: "teens",
  protag: "kai",
  protagName: "Kai",
  secondary: "none",
  pet: "none",
  villain: "none",
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
};

describe("Depth & Clarity showrunner trio", () => {
  it("uses the approved names and permanent identities", () => {
    expect(SHOWRUNNERS.find((r) => r.id === "planner")?.name).toBe("Jen Wailer");
    expect(SHOWRUNNERS.find((r) => r.id === "auteur")?.name).toBe('James "Jimmy" Santorum');
    expect(SHOWRUNNERS.find((r) => r.id === "audience")?.name).toBe("Ryka Inouway");
  });

  it("Jen builds Slate Readiness 50% faster and protects a three-week move", () => {
    const base = addSlatePlan(initialRun("Plan", "planner"), {
      kind: "original",
      title: "Planned Show",
      targetWeek: 20,
      importance: "standard",
      genres: ["slice"],
    });
    const plan = base.slatePlans![0];
    expect(slatePreparation(plan, 8, "planner").effectiveWeeks).toBe(12);
    expect(slatePreparation(plan, 8, "operations").effectiveWeeks).toBe(10);

    const atWeekEight = { ...base, week: 8 };
    const protectedMove = rescheduleSlatePlan(atWeekEight, plan.id, 23);
    expect(protectedMove.slatePlans![0].createdWeek).toBe(plan.createdWeek);

    const ordinary = { ...atWeekEight, showrunner: "vision" };
    const costlyMove = rescheduleSlatePlan(ordinary, plan.id, 23);
    expect(costlyMove.slatePlans![0].createdWeek).toBe(plan.createdWeek + 3);
  });

  it("Jimmy adds two points of signature expertise, halves outside penalty and reaches Authority sooner", () => {
    const specialist = {
      strategicSpend: [{ id: "studio_specialisation:primary:slice", label: "Signature Genre", amount: 0, week: 0 }],
      franchises: {
        house: {
          genres: ["slice"],
          entries: [
            { week: 1, title: "One", score: 28, hallOfFame: false },
            { week: 2, title: "Two", score: 28, hallOfFame: false },
            { week: 3, title: "Three", score: 24, hallOfFame: false },
          ],
        },
      },
    } as any;

    expect(studioSpecialisationProfile({ ...specialist, showrunner: "vision" }).rank).toBe("studio");
    expect(studioSpecialisationProfile({ ...specialist, showrunner: "auteur" }).rank).toBe("authority");

    // Isolate House Style's scoring effect at the same Studio rank. The
    // three-release fixture above deliberately promotes Jimmy to Authority.
    const sameRank = { ...specialist, franchises: {} };
    const normalSignature = specialisationProjectEffects({ ...sameRank, showrunner: "vision" }, { genres: ["slice"] });
    const auteurSignature = specialisationProjectEffects({ ...sameRank, showrunner: "auteur" }, { genres: ["slice"] });
    expect(auteurSignature.scoreMult - normalSignature.scoreMult).toBeCloseTo(0.02);

    const normalOutside = specialisationProjectEffects({ ...sameRank, showrunner: "vision" }, { genres: ["fantasy"] });
    const auteurOutside = specialisationProjectEffects({ ...sameRank, showrunner: "auteur" }, { genres: ["fantasy"] });
    expect(1 - auteurOutside.scoreMult).toBeCloseTo((1 - normalOutside.scoreMult) / 2);
  });

  it("Ryka predicts audience shape and rewards correctly targeted publicity and merch", () => {
    const profile = audienceProfileForDraft(draft);
    expect(profile.core + profile.casual + profile.online + profile.prestige + profile.collectors).toBe(100);
    expect(profile.online).toBeGreaterThan(profile.prestige);

    const social = STRATEGIC_CAMPAIGNS.find((campaign) => campaign.id === "social")!;
    const fit = publicityAudienceFit(profile, social.id);
    expect(fit).toBeGreaterThanOrEqual(1.04);
    expect(strategicCampaignHype(social, draft, 1, [], profile, "audience"))
      .toBeGreaterThan(strategicCampaignHype(social, draft, 1, [], profile, "vision"));
    expect(audienceWhispererMerchMult("audience", 1.10)).toBe(1.15);
    expect(audienceWhispererMerchMult("audience", 0.90)).toBe(1);
  });
});
