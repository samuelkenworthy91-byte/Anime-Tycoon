import { beforeEach, describe, expect, it } from "vitest";
import type { Draft } from "../data";
import { beginDynastyMode, buyInvestment, chooseDynastyPath } from "../legacy";
import { setManagementPolicy, shouldAutoDelegateProject } from "../management";
import { createNewGamePlusRun } from "../newGamePlus";
import { overseasOf, overseasPresetRequest, signOverseas } from "../overseas";
import { makeProject } from "../projects";
import { buildSaveData, restoreRunFromSave, safeResumeScreen } from "../session";
import { choosePrimarySpecialisation, specialisationProjectEffects } from "../specialisation";
import { MAX_WEEKS, initialRun, releaseProject } from "../state";
import { loadSlot, saveSlotDetailed } from "../storage";

class MemoryStorage {
  private data = new Map<string, string>();
  get length(){ return this.data.size; }
  clear(){ this.data.clear(); }
  getItem(key:string){ return this.data.get(key) ?? null; }
  key(index:number){ return [...this.data.keys()][index] ?? null; }
  removeItem(key:string){ this.data.delete(key); }
  setItem(key:string,value:string){ this.data.set(key,String(value)); }
}

const draft: Draft = {
  title: "Final Polish Journey",
  medium: "fanweb",
  budget: "standard",
  scope: "standard",
  slot: "web",
  animeType: "shonen",
  genres: ["slice"],
  audience: "teens",
  protag: "kai",
  protagName: "Kai",
  secondary: "s_ice",
  pet: "p_mochi",
  villain: "v_lovelace",
  arcs: ["hook", "finale"],
  sliders: [50, 50, 50],
  season: 1,
};

describe("final systems polish journey", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
  });

  it("survives production → release → save/reload → overseas → dynasty → NG+ with policy and DNA intact", () => {
    let run = initialRun("Polish House", "steady");
    run = {
      ...run,
      cash: 3_000_000_000,
      officeLevel: 2,
      capitalProjects: ["overseas_tier_4"],
    };

    run = choosePrimarySpecialisation(run, "slice")!;
    run = setManagementPolicy(run, {
      projectMode: "auto-except-prestige",
      contractMode: "fastest",
      alertMode: "exceptions",
    });

    const project = {
      ...makeProject(draft, 0, 0),
      id: "journey-project",
      stage: "ready" as const,
      distributionOwner: "player" as const,
      points: { story: 280, art: 260, sound: 220 },
    };
    run = { ...run, projects: [project] };

    expect(shouldAutoDelegateProject(run, project)).toBe(true);
    expect(specialisationProjectEffects(run, draft).signature).toBe(true);

    const released = releaseProject(run, project.id, { spent: 0, hype: 20 });
    expect(released).not.toBeNull();
    run = released!.run;
    expect(run.projects[0].result).toBeTruthy();

    const snapshot = buildSaveData(
      run,
      { studio: run.studio, showrunner: run.showrunner },
      { day: 2, phase: 0.4, acc: 500, dayCount: 2 },
    );
    expect(saveSlotDetailed("1", snapshot).ok).toBe(true);
    const loaded = loadSlot("1")!;
    run = restoreRunFromSave(loaded, "1");
    expect(safeResumeScreen(run)).toBe("office");
    expect(run.managementPolicy?.projectMode).toBe("auto-except-prestige");

    const request = overseasPresetRequest(run, project.id, "aurora", "recommended");
    expect(request).toBeTruthy();
    const overseas = signOverseas(run, request!);
    expect(overseas).not.toBeNull();
    run = overseas!;
    expect(overseasOf(run).releases).toHaveLength(1);

    run = beginDynastyMode({ ...run, week: MAX_WEEKS });
    run = chooseDynastyPath(run, "global")!;
    run = buyInvestment(run, "worldDistribution")!;
    expect(run.dynasty?.path).toBe("global");
    expect(run.dynasty?.investments.some((entry) => entry.id === "worldDistribution")).toBe(true);

    const next = createNewGamePlusRun(run, "Legacy House", "steady", "global");
    expect(next.week).toBe(0);
    expect(next.cash).not.toBe(run.cash);
    expect(next.newGamePlusLegacy).toBe("global");
    expect(next.researchTrackLevels?.business).toBe(1);
    expect(next.genresUnlocked).toContain("slice");
    expect(next.franchises).toEqual({});
  });
});
