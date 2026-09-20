import { describe, expect, it } from "vitest";
import { PROTAGONISTS, SECONDARY, PETS, VILLAINS, type Draft } from "../data";
import { makeProject } from "../projects";
import { initialRun, tickStudioWorkPulse, type RunState } from "../state";
import {
  BASE_INTERVENTIONS,
  INTERVENTIONS,
  applyIntervention,
  capabilitySpend,
  interventionBlock,
  interventionQuote,
  productionCapability,
} from "../spending";

const draft: Draft = {
  title: "Stage Five Test",
  medium: "fanweb",
  budget: "indie",
  scope: "short",
  slot: "web",
  animeType: "shonen",
  genres: ["slice"],
  audience: "teens",
  protag: PROTAGONISTS[0].id,
  protagName: PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id,
  pet: PETS[0].id,
  villain: VILLAINS[0].id,
  arcs: ["hook", "lore", "finale"],
  sliders: [50, 50, 50],
  season: 1,
};

function withProject(stage: "concept" | "preprod" | "animation" | "sound" | "post" | "marketing" | "ready" = "animation"): RunState {
  const run = initialRun("Investment Studio", "steady");
  const p = makeProject(draft, 96, 96 * 7);
  p.stage = stage;
  p.issues = 8;
  return { ...run, week: 96, day: 96 * 7, officeLevel: 2, cash: 25_000_000, rd: 5_000, projects: [p], strategicSpend: [] };
}

const def = (id: string) => BASE_INTERVENTIONS.find((x) => x.id === id)!;

describe("Stage 5 production investment ladder", () => {
  it("makes investment cost rise far faster than craft output", () => {
    const run = withProject("animation");
    const d = def("animation_pass");
    const standard = interventionQuote(run, d, "standard")!;
    const extended = interventionQuote(run, d, "extended")!;
    const prestige = interventionQuote(run, d, "prestige")!;
    const obsessive = interventionQuote(run, d, "obsessive")!;
    expect(standard.cost).toBe(65_000);
    expect(extended.cost / standard.cost).toBeGreaterThan(2.5);
    expect(obsessive.cost / standard.cost).toBeGreaterThan(17);
    expect(obsessive.points / standard.points).toBeLessThan(3);
    expect(obsessive.cost / obsessive.points).toBeGreaterThan(standard.cost / standard.points * 5);
    expect(prestige.points).toBeGreaterThan(extended.points);
  });

  it("puts million-pound Obsessive craft passes into Sakuga Tower", () => {
    const run = withProject("post");
    const quote = interventionQuote(run, def("final_polish"), "obsessive")!;
    expect(run.officeLevel).toBe(2);
    expect(quote.cost).toBeGreaterThan(1_000_000);
    expect(interventionBlock(run, run.projects[0], def("final_polish"), "obsessive")).toBeNull();
  });

  it("gates higher investment tiers by studio progression", () => {
    const run = { ...withProject("animation"), officeLevel: 1 };
    expect(interventionBlock(run, run.projects[0], def("animation_pass"), "extended")).toBeNull();
    expect(interventionBlock(run, run.projects[0], def("animation_pass"), "prestige")).toContain("studio level 3");
    expect(interventionBlock(run, run.projects[0], def("animation_pass"), "obsessive")).toContain("studio level 3");
  });

  it("keeps schedule extension and executive crunch as tactical single-scale actions", () => {
    const run = withProject("animation");
    expect(interventionQuote(run, def("schedule"), "extended")).toBeNull();
    expect(interventionQuote(run, def("crunch"), "prestige")).toBeNull();
    expect(INTERVENTIONS.some((x) => x.id === "schedule::extended")).toBe(false);
    expect(INTERVENTIONS.some((x) => x.id === "crunch::obsessive")).toBe(false);
  });

  it("allows one chosen scale per intervention rather than stacking every tier", () => {
    const run = withProject("animation");
    const p = run.projects[0];
    const out = applyIntervention(run, p.id, "animation_pass::extended", () => 1)!;
    expect(out.projects[0].interventions).toContain("animation_pass");
    expect(applyIntervention(out, p.id, "animation_pass::obsessive", () => 1)).toBeNull();
    expect(out.strategicSpend.at(-1)?.label).toContain("Extended");
  });
});

describe("QoL2 timed production interventions", () => {
  it("Executive Rush creates a 14-day double-output window without instant quality", () => {
    const run = withProject("animation");
    const before = { ...run.projects[0].points };
    const out = applyIntervention(run, run.projects[0].id, "crunch", () => 1)!;
    expect(out.projects[0].executiveRushUntilDay).toBe((run.day ?? run.week * 7) + 14);
    expect(out.projects[0].points).toEqual(before);
    expect(out.projects[0].issues).toBe(run.projects[0].issues);
  });

  it("Executive Rush duplicates ordinary visible project bubbles", () => {
    const base = withProject("animation");
    const rushed = applyIntervention(base, base.projects[0].id, "crunch", () => 1)!;
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      const noRare = () => 0.99;
      const normal = tickStudioWorkPulse(base, noRare).pulses.filter((p) => p.source === "project" && !p.kind);
      const doubled = tickStudioWorkPulse(rushed, noRare).pulses.filter((p) => p.source === "project" && !p.kind);
      expect(normal.length).toBeGreaterThan(0);
      expect(doubled.length).toBe(normal.length * 2);
    } finally {
      Math.random = originalRandom;
    }
  });

  it("Specialist Consultant creates a 14-day error-learning window", () => {
    const run = withProject("animation");
    const before = { ...run.projects[0].points };
    const out = applyIntervention(run, run.projects[0].id, "consultant", () => 0.5)!;
    expect(out.projects[0].consultantUntilDay).toBe((run.day ?? run.week * 7) + 14);
    expect(out.projects[0].consultantConverted).toBe(0);
    expect(out.projects[0].points).toEqual(before);
    expect(out.projects[0].issues).toBe(run.projects[0].issues);
  });

  it("Specialist Consultant converts each would-be error to R&D on a 50/50 roll", () => {
    let run = withProject("animation");
    run = applyIntervention(run, run.projects[0].id, "consultant", () => 0.5)!;
    const rdBefore = run.rd;
    const issuesBefore = run.projects[0].issues;

    const conversionRolls = [0.99, 0.01, 0.49];
    let conversionIndex = 0;
    const converted = tickStudioWorkPulse(run, () => conversionRolls[conversionIndex++] ?? 0.99);
    expect(converted.pulses.some((p) => p.kind === "research")).toBe(true);
    expect(converted.run.rd).toBe(rdBefore + 1);
    expect(converted.run.projects[0].issues).toBe(issuesBefore);
    expect(converted.run.projects[0].consultantConverted).toBe(1);

    const noteRolls = [0.99, 0.01, 0.50];
    let noteIndex = 0;
    const remainedError = tickStudioWorkPulse(run, () => noteRolls[noteIndex++] ?? 0.99);
    expect(remainedError.run.rd).toBe(rdBefore);
    expect(remainedError.run.projects[0].issues).toBe(issuesBefore + 1);
    expect(remainedError.run.projects[0].consultantConverted ?? 0).toBe(0);
  });

  it("Continuity Repair fixes existing notes but no longer owns the learning window", () => {
    const run = withProject("post");
    const out = applyIntervention(run, run.projects[0].id, "continuity", () => 0.5)!;
    expect(out.projects[0].issues).toBeLessThan(run.projects[0].issues);
    expect(out.projects[0].consultantUntilDay).toBeUndefined();
    expect(out.projects[0].noteToRdUntilDay).toBeUndefined();
  });
});

describe("Stage 5 permanent production capability", () => {
  it("recognises historic pre-Stage-5 intervention labels without a save migration", () => {
    const run = withProject();
    run.strategicSpend = [
      { id: "old1", label: "Extra Animation Pass", amount: 300_000, week: 40 },
      { id: "old2", label: "Extra Animation Pass", amount: 200_000, week: 60 },
      { id: "unrelated", label: "IP rights renewal", amount: 5_000_000, week: 70 },
    ];
    expect(capabilitySpend(run, "animation")).toBe(500_000);
    expect(productionCapability(run, "animation").level).toBe(2);
  });

  it("persists capability deterministically through a JSON save/reload", () => {
    const run = withProject();
    run.strategicSpend = [{ id: "a", label: "Soundtrack Enhancement · Prestige", amount: 600_000, week: 90 }];
    const before = productionCapability(run, "sound");
    const reloaded = JSON.parse(JSON.stringify(run)) as RunState;
    const after = productionCapability(reloaded, "sound");
    expect(after.level).toBe(before.level);
    expect(after.spend).toBe(before.spend);
  });

  it("crossing a spend threshold permanently improves future related intervention output", () => {
    const run = withProject("animation");
    run.strategicSpend = [{ id: "seed", label: "Extra Animation Pass", amount: 145_000, week: 80 }];
    const before = interventionQuote(run, def("animation_pass"), "standard")!;
    const out = applyIntervention(run, run.projects[0].id, "animation_pass", () => 1)!;
    expect(productionCapability(out, "animation").level).toBe(1);
    const future = { ...out, projects: [{ ...makeProject({ ...draft, title: "Future" }, 100, 700), stage: "animation" as const }] };
    const after = interventionQuote(future, def("animation_pass"), "standard")!;
    expect(after.points).toBeGreaterThan(before.points);
  });

  it("post-production capability reduces risk while marketing capability increases launch effect", () => {
    const base = withProject("post");
    const experienced = { ...base, strategicSpend: [
      { id: "post", label: "Final Polish Pass · Obsessive", amount: 2_500_000, week: 70 },
      { id: "mkt", label: "Launch Materials Upgrade · Obsessive", amount: 2_500_000, week: 75 },
    ] };
    expect(interventionQuote(experienced, def("final_polish"), "standard")!.risk).toBeLessThan(interventionQuote(base, def("final_polish"), "standard")!.risk);
    expect(interventionQuote(experienced, def("launch_upgrade"), "standard")!.hype).toBeGreaterThan(interventionQuote(base, def("launch_upgrade"), "standard")!.hype);
  });
});
