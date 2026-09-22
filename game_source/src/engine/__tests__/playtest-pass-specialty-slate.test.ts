import { describe, expect, it } from "vitest";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft } from "../data";
import {
  MAX_RESEARCH_TRACK_LEVEL,
  RESEARCH_TRACKS,
  businessTrackRevenueMultiplier,
  productionTrackProjectMultiplier,
  trackSkillMultiplier,
} from "../researchTracks";
import { addSlatePlan, armSlatePlan, consumeArmedSlatePlan, slatePreparation } from "../slate";
import { initialRun } from "../state";

const draft = (): Draft => ({
  title: "Prepared Original",
  medium: "fanweb",
  budget: "indie",
  scope: "short",
  slot: "web",
  animeType: "shonen",
  genres: ["mecha"],
  audience: "teens",
  protag: PROTAGONISTS[0].id,
  protagName: PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id,
  pet: PETS[0].id,
  villain: VILLAINS[0].id,
  arcs: ["hook"],
  sliders: [50, 50, 50],
  season: 1,
});

describe("playtest research progression", () => {
  it("gives every discipline a named unlock at every paid level", () => {
    for (const track of RESEARCH_TRACKS) {
      expect(track.milestones).toHaveLength(MAX_RESEARCH_TRACK_LEVEL);
      expect(track.milestones.map((m) => m.level)).toEqual([1,2,3,4,5,6,7,8]);
      expect(track.milestones.every((m) => m.label.length > 2 && m.effect.length > 8)).toBe(true);
    }
  });

  it("makes every level mechanically stronger", () => {
    for (let level = 1; level <= MAX_RESEARCH_TRACK_LEVEL; level += 1) {
      expect(trackSkillMultiplier(level)).toBeGreaterThan(trackSkillMultiplier(level - 1));
      expect(productionTrackProjectMultiplier(level)).toBeGreaterThan(productionTrackProjectMultiplier(level - 1));
      expect(businessTrackRevenueMultiplier(level)).toBeGreaterThan(businessTrackRevenueMultiplier(level - 1));
    }
  });
});

describe("prepared Studio Slate", () => {
  it("grows through meaningful readiness tiers", () => {
    let run = initialRun("Slate House", "steady");
    run = addSlatePlan(run, { kind: "original", title: "Future Show", targetWeek: 30, importance: "standard", genres: ["mecha"] });
    const plan = run.slatePlans![0];
    expect(slatePreparation(plan, 3).label).toBe("IMPROVISED");
    const prepared = slatePreparation(plan, 4);
    expect(prepared.ready).toBe(true);
    expect(prepared.label).toBe("PREPARED");
    expect(prepared.hypeBonus).toBe(3);
    expect(prepared.burnDiscount).toBeCloseTo(0.03);
    expect(slatePreparation(plan, 8).label).toBe("READY");
    expect(slatePreparation(plan, 12).label).toBe("LOCKED");
    const longLead = slatePreparation(plan, 20);
    expect(longLead.label).toBe("LONG LEAD");
    expect(longLead.burnDiscount).toBeCloseTo(0.08);
    expect(longLead.deadlineBufferWeeks).toBe(2);
  });

  it("accelerates planning for Elliot and Freja in their niches", () => {
    let run = initialRun("Slate House", "steady");
    run = addSlatePlan(run, { kind: "original", title: "Original", targetWeek: 20, importance: "standard" });
    const original = run.slatePlans![0];
    expect(slatePreparation(original, 3, "steady").label).toBe("IMPROVISED");
    expect(slatePreparation(original, 3, "operations").label).toBe("PREPARED");

    run = addSlatePlan(run, { kind: "franchise", title: "Season Two", targetWeek: 20, importance: "standard", franchiseKey: "f1" });
    const franchise = run.slatePlans![1];
    expect(slatePreparation(franchise, 3, "franchise").label).toBe("PREPARED");
  });

  it("arms the chosen plan and consumes it only for a matching setup", () => {
    let run = initialRun("Slate House", "steady");
    run = addSlatePlan(run, { kind: "original", title: "Future Show", targetWeek: 28, importance: "tentpole", genres: ["mecha"] });
    const plan = run.slatePlans![0];
    run.week = 20;
    run = armSlatePlan(run, plan.id);
    const consumed = consumeArmedSlatePlan(run, draft());
    expect(consumed.preparation?.ready).toBe(true);
    expect(consumed.preparation?.label).toBe("LONG LEAD");
    expect(consumed.preparation?.hypeBonus).toBe(10);
    expect(consumed.run.slatePlans).toHaveLength(0);
    expect(consumed.run.activeSlateSetupPlanId).toBeUndefined();
  });
});
