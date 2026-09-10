import { describe, expect, it } from "vitest";
import type { Draft } from "../data";
import { createFranchise } from "../franchise";
import { initialRun, startBlockReason, startProject } from "../state";

const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Threshold Story",
  medium: "tv",
  budget: "indie",
  slot: "midnight",
  animeType: "shonen",
  genres: ["sports"],
  audience: "teens",
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  secondaryName: "Riko",
  pet: "none",
  villain: "warlord",
  villainName: "Gharn",
  arcs: ["hook", "montage", "finale"],
  sliders: [50, 50, 50],
  season: 1,
  ...over,
});

const seed = {
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  secondaryName: "Riko",
  pet: "",
  petName: "",
  villain: "warlord",
  villainName: "Gharn",
};

const result = (total: number) => ({ total, revenue: 100_000, fans: 10_000, hallOfFame: total >= 32 });

function runWithScore(score: number) {
  const fr = createFranchise("Threshold Story", draft(), seed, result(score), 10);
  return {
    ...initialRun("Threshold Studio", "steady"),
    cash: 5_000_000,
    officeLevel: 2,
    mediumsUnlocked: ["fanweb", "ona", "tv", "ova", "special", "movie"] as const,
    franchises: { "Threshold Story": fr },
  };
}

describe("state-level sequel rights", () => {
  it("refuses Season 2 at 31/40 but leaves the reboot route greenlightable", () => {
    const run = runWithScore(31);
    const season = draft({ franchiseKey: "Threshold Story", continuation: "season", season: 2 });
    const reboot = draft({ franchiseKey: "Threshold Story", continuation: "reboot", season: 2 });
    expect(startBlockReason(run, season)).toContain("32/40");
    expect(startProject(run, season)).toBeNull();
    expect(startBlockReason(run, reboot)).toBeNull();
    expect(startProject(run, reboot)).toBeTruthy();
  });

  it("permits Season 2 at exactly 32/40", () => {
    const run = runWithScore(32);
    const season = draft({ franchiseKey: "Threshold Story", continuation: "season", season: 2 });
    expect(startBlockReason(run, season)).toBeNull();
    expect(startProject(run, season)).toBeTruthy();
  });
});
