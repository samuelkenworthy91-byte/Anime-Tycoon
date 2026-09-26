import { describe, expect, it } from "vitest";
import { createNewGamePlusRun } from "../newGamePlus";
import { initialRun } from "../state";

describe("New Game+ knowledge legacy", () => {
  it("keeps information while resetting economic and production power", () => {
    const old = initialRun("Old Empire", "steady");
    old.week = 1200;
    old.cash = 99_000_000;
    old.fans = 4_000_000;
    old.officeLevel = 4;
    old.genresUnlocked = ["slice","romance","mecha"];
    old.comboLevels = { "romance|slice":5 };
    old.genreKnowledge = { slice:9, romance:7 };
    old.castCombos = ["chem_known"];
    old.castAffinityDiscovered = ["cast_a"];
    old.arcCombos = ["arc_combo"];
    old.arcUnlocked = ["hook"];
    old.arcKnowledge = { hook:4 };
    old.arcGenreKnowledge = { "hook|slice":3 };
    old.research = ["pipeline","marketing","staff_appraisal","talent_scouting","experimental_combo_romance__slice"];
    old.capitalProjects = ["flagship_hq"];

    const next = createNewGamePlusRun(old,"Fresh House","audience");
    expect(next.studio).toBe("Fresh House");
    expect(next.showrunner).toBe("audience");
    expect(next.week).toBe(0);
    expect(next.officeLevel).toBe(0);
    expect(next.cash).not.toBe(old.cash);
    expect(next.fans).toBe(0);
    expect(next.staff).toHaveLength(0);
    expect(next.franchises).toEqual({});
    expect(next.capitalProjects).toEqual([]);
    expect(next.genresUnlocked).toEqual(old.genresUnlocked);
    expect(next.comboLevels["romance|slice"]).toBe(1);
    expect(next.genreKnowledge).toEqual(old.genreKnowledge);
    expect(next.castCombos).toContain("chem_known");
    expect(next.arcGenreKnowledge["hook|slice"]).toBe(3);
    expect(next.research).toEqual(expect.arrayContaining(["staff_appraisal","talent_scouting","experimental_combo_romance__slice"]));
    expect(next.research).not.toContain("pipeline");
    expect(next.research).not.toContain("marketing");
    expect(next.newGamePlusGeneration).toBe(1);
  });

  it("increments generation on repeat NG+", () => {
    const old = { ...initialRun("NG+", "steady"), newGamePlusGeneration: 2 };
    expect(createNewGamePlusRun(old,"NG+3","planner").newGamePlusGeneration).toBe(3);
  });
});
