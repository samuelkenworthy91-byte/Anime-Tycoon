import { describe, expect, it } from "vitest";
import { initialRun, type RunState } from "../state";
import {
  AWARD_CRAFT_OUTPUT_BASE,
  AWARD_CRAFT_OUTPUT_YEAR_STEP,
  awardCraftOutputFloor,
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
  score: 30,
  story: 28,
  art: 28,
  sound: 28,
  audience: 50_000,
  sourceId: "legacy-craft-row",
  posterId: null,
  draft: null,
  protag: null,
  ...over,
});

describe("rising awards craft expectations", () => {
  it("raises the raw discipline floor every single year", () => {
    expect(awardCraftOutputFloor(1)).toBe(AWARD_CRAFT_OUTPUT_BASE);
    expect(awardCraftOutputFloor(2)).toBe(AWARD_CRAFT_OUTPUT_BASE + AWARD_CRAFT_OUTPUT_YEAR_STEP);
    expect(awardCraftOutputFloor(3)).toBe(AWARD_CRAFT_OUTPUT_BASE + AWARD_CRAFT_OUTPUT_YEAR_STEP * 2);
    expect(awardCraftOutputFloor(12)).toBe(380);
  });

  it("uses the exact project discipline points when the player release is still in project history", () => {
    const seed = initialRun("Test Studio", "steady");
    const entry = nominee({ sourceId: "released-project" });
    const run = {
      ...seed,
      projects: [{ id: "released-project", points: { story: 211, art: 287, sound: 164 } }],
    } as unknown as RunState;
    expect(awardDisciplineOutput(run, entry, "writing")).toBe(211);
    expect(awardDisciplineOutput(run, entry, "animation")).toBe(287);
    expect(awardDisciplineOutput(run, entry, "score")).toBe(164);
  });

  it("keeps a legacy/rival-compatible fallback on the same hundreds-scale", () => {
    const run = initialRun("Test Studio", "steady");
    const entry = nominee({ story: 30, art: 35, sound: 40 });
    expect(awardDisciplineOutput(run, entry, "writing")).toBe(180);
    expect(awardDisciplineOutput(run, entry, "animation")).toBe(210);
    expect(awardDisciplineOutput(run, entry, "score")).toBe(240);
  });

  it("allows Year 1 craft that clears 160 but rejects the same output once Year 2 expects 180", () => {
    const row = nominee({ story: 28, art: 28, sound: 28 }); // fallback output 168
    const y1 = freezeNominationsIfDue({ ...initialRun("Test Studio", "steady"), week: 43, yearShows: [row] });
    const y1Frozen = y1.yearShows.find((n) => n.nominationYear === 1 && n.player)!;
    expect(y1Frozen.nominationCategories).toContain("writing");
    expect(y1Frozen.nominationCategories).toContain("animation");
    expect(y1Frozen.nominationCategories).toContain("score");

    const y2 = freezeNominationsIfDue({ ...initialRun("Test Studio", "steady"), week: 91, yearShows: [row] });
    const y2Frozen = y2.yearShows.find((n) => n.nominationYear === 2 && n.player)!;
    expect(y2Frozen.nominationCategories).not.toContain("writing");
    expect(y2Frozen.nominationCategories).not.toContain("animation");
    expect(y2Frozen.nominationCategories).not.toContain("score");
    expect(y2Frozen.nominationCategories).toContain("aoty");
  });
});
