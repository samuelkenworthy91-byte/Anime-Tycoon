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
  it("requires genuine advance planning before bonuses activate", () => {
    let run = initialRun("Slate House", "steady");
    run = addSlatePlan(run, { kind: "original", title: "Future Show", targetWeek: 12, importance: "standard" });
    const plan = run.slatePlans![0];
    expect(slatePreparation(plan, 3).ready).toBe(false);
    const prepared = slatePreparation(plan, 4);
    expect(prepared.ready).toBe(true);
    expect(prepared.hypeBonus).toBe(7);
    expect(prepared.burnDiscount).toBeCloseTo(0.06);
  });

  it("arms the chosen plan and consumes it only for a matching setup", () => {
    let run = initialRun("Slate House", "steady");
    run = addSlatePlan(run, { kind: "original", title: "Future Show", targetWeek: 12, importance: "tentpole" });
    const plan = run.slatePlans![0];
    run.week = 6;
    run = armSlatePlan(run, plan.id);
    const consumed = consumeArmedSlatePlan(run, draft());
    expect(consumed.preparation?.ready).toBe(true);
    expect(consumed.preparation?.hypeBonus).toBe(10);
    expect(consumed.run.slatePlans).toHaveLength(0);
    expect(consumed.run.activeSlateSetupPlanId).toBeUndefined();
  });
});
