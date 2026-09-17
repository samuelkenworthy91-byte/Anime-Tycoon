import { describe, expect, it } from "vitest";
import { initialRun, type RunState } from "../state";
import {
  awardCraftOutputFloor,
  awardCraftOutputFloors,
  awardDisciplineOutput,
  freezeNominationsIfDue,
} from "../awardCycle";
import type { AwardNominee } from "../awards";
import type { GenreId } from "../data";

const nominee = (over: Partial<AwardNominee> = {}): AwardNominee => ({
  title: "Craft Candidate",
  studio: "Test Studio",
  studioId: "player",
  player: true,
  animeType: "shonen",
  genres: ["slice" as GenreId],
  score: 36,
  story: 40,
  art: 40,
  sound: 40,
  audience: 250_000,
  sourceId: "craft-row",
  posterId: null,
  draft: null,
  protag: null,
  ...over,
});

describe("sim-calibrated annual awards craft expectations", () => {
  it("uses separate discipline curves derived from full-studio capacity", () => {
    expect(awardCraftOutputFloors(1)).toEqual({ writing: 150, animation: 300, score: 150 });
    expect(awardCraftOutputFloors(6)).toEqual({ writing: 1200, animation: 1500, score: 975 });
    expect(awardCraftOutputFloors(12)).toEqual({ writing: 1700, animation: 2150, score: 1475 });
    expect(awardCraftOutputFloor(12, "animation")).toBeGreaterThan(awardCraftOutputFloor(6, "animation"));
  });

  it("continues escalating after Year 12 for Dynasty saves", () => {
    expect(awardCraftOutputFloor(13, "writing")).toBe(1750);
    expect(awardCraftOutputFloor(13, "animation")).toBe(2300);
    expect(awardCraftOutputFloor(13, "score")).toBe(1550);
  });

  it("uses the same normalized craft scale for player and rival entries", () => {
    const run = initialRun("Test Studio", "steady");
    const player = nominee({ story: 32, art: 32, sound: 32, sourceId: "released-project" });
    const rival = nominee({ player: false, studioId: "rival", sourceId: "rival-row", story: 32, art: 32, sound: 32 });
    expect(awardDisciplineOutput(run, player, "writing", 6)).toBe(1200);
    expect(awardDisciplineOutput(run, rival, "writing", 6)).toBe(1200);
    expect(awardDisciplineOutput(run, player, "animation", 6)).toBe(1500);
    expect(awardDisciplineOutput(run, rival, "score", 6)).toBe(975);
  });

  it("projects rivals and legacy rows onto the current-year raw scale", () => {
    const run = initialRun("Test Studio", "steady");
    const rival = nominee({ player: false, studioId: "rival", sourceId: "rival-row", story: 32, art: 32, sound: 32 });
    // Year 6 craft-quality minimum is 32, so a rival exactly on that
    // compressed metric floor maps exactly to each simulated raw floor.
    expect(awardDisciplineOutput(run, rival, "writing", 6)).toBe(1200);
    expect(awardDisciplineOutput(run, rival, "animation", 6)).toBe(1500);
    expect(awardDisciplineOutput(run, rival, "score", 6)).toBe(975);
  });

  it("applies the same Year 6 craft gate to player disciplines", () => {
    const seed = initialRun("Test Studio", "steady");
    const row = nominee({ sourceId: "year6-project", story: 31, art: 32, sound: 32 });
    const run = { ...seed, week: 283, day: 283 * 7, yearShows: [row] } as unknown as RunState;
    const frozen = freezeNominationsIfDue(run);
    const entry = frozen.yearShows.find((n) => n.nominationYear === 6 && n.player)!;
    expect(entry.nominationCategories).not.toContain("writing");
    expect(entry.nominationCategories).toContain("animation");
    expect(entry.nominationCategories).toContain("score");
  });
});
