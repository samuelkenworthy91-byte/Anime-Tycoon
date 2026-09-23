import { describe, expect, it } from "vitest";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, castById, type Draft } from "../data";
import {
  MAX_RESEARCH_TRACK_LEVEL,
  RESEARCH_TRACKS,
  businessTrackRevenueMultiplier,
  productionTrackProjectMultiplier,
  trackSkillMultiplier,
} from "../researchTracks";
import { addSlatePlan, armSlatePlan, consumeArmedSlatePlan, slatePreparation } from "../slate";
import { contributionEffectiveSkill, initialRun, startFullyDelegatedProject } from "../state";

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
    const ready = slatePreparation(plan, 8);
    expect(ready.label).toBe("READY");
    expect(ready.paceBonus).toBeCloseTo(0.03);
    const locked = slatePreparation(plan, 12);
    expect(locked.label).toBe("LOCKED");
    expect(locked.paceBonus).toBeCloseTo(0.05);
    expect(locked.issueChanceMult).toBeCloseTo(0.90);
    const longLead = slatePreparation(plan, 20);
    expect(longLead.label).toBe("LONG LEAD");
    expect(longLead.burnDiscount).toBeCloseTo(0.08);
    expect(longLead.paceBonus).toBeCloseTo(0.05);
    expect(longLead.issueChanceMult).toBeCloseTo(0.85);
    expect(longLead.deadlineBufferWeeks).toBe(2);
    expect(longLead.targetWeek).toBe(30);
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


describe("full creator delegation", () => {
  it("lets one named employee originate and run a competent original at 80% live contribution strength", () => {
    let run = initialRun("Delegation House", "steady");
    const director = { ...run.candidates[0], id: "director_test", favGenre: run.genresUnlocked[0], stamina: 100 };
    run = { ...run, cash: 2_000_000, staff: [director], candidates: [] };
    const delegated = startFullyDelegatedProject(run, director.id, () => 0.2);
    expect(delegated).toBeTruthy();
    const project = delegated!.projects.at(-1)!;
    expect(project.auto?.mode).toBe("full");
    expect(project.auto?.directorStaffId).toBe(director.id);
    expect(project.creativeLeadId).toBe(director.id);
    expect(project.staffIds).toContain(director.id);
    expect(project.draft.genres.every((genre) => delegated!.genresUnlocked.includes(genre))).toBe(true);
    expect(castById(project.draft.protag).type).toBe(project.draft.animeType);
    expect(castById(project.draft.secondary).type).toBe(project.draft.animeType);
    expect(castById(project.draft.pet).type).toBe(project.draft.animeType);
    expect(castById(project.draft.villain).type).toBe(project.draft.animeType);

    const delegatedSkill = contributionEffectiveSkill(delegated!, delegated!.staff[0], "story");
    const handsOnRun = {
      ...delegated!,
      projects: delegated!.projects.map((item) => item.id === project.id
        ? { ...item, auto: { ...item.auto!, mode: "milestones" as const } }
        : item),
    };
    const handsOnSkill = contributionEffectiveSkill(handsOnRun, handsOnRun.staff[0], "story");
    expect(delegatedSkill / handsOnSkill).toBeCloseTo(0.8, 5);
  });
});
