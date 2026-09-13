import { describe, expect, it } from "vitest";
import { ARC_COMBOS, SHOWRUNNERS, comboMult, type Draft } from "../data";
import { contrarianComboMult, engineerEyeRange, narrativeMomentumFanMult, storyStructureMult, trailblazerProductionMult } from "../showrunnerPerks";

const draft = (arcs: string[] = []): Draft => ({
  title: "Test", medium: "fanweb", budget: "indie", scope: "short", slot: "web",
  animeType: "shonen", genres: ["mecha", "romance"], audience: "teens",
  protag: "kai", protagName: "Kai", secondary: "none", pet: "none", villain: "none",
  arcs, sliders: [50, 50, 50], season: 1,
});

describe("new showrunner quartet", () => {
  it("wires dedicated art with no placeholder flags", () => {
    const ids = ["casting", "festival", "dealmaker", "genre"];
    const four = SHOWRUNNERS.filter((s) => ids.includes(s.id));
    expect(four).toHaveLength(4);
    for (const s of four) {
      expect(s.artPending).not.toBe(true);
      expect(s.sprite).toMatch(/sprite-showrunner-(hype|contrarian|savant|trailblazer)\.webp$/);
      expect(s.portrait).toMatch(/portrait-showrunner-(hype|contrarian|savant|trailblazer)\.webp$/);
    }
  });

  it("Hype Architect strengthens positive story structures and fan conversion", () => {
    expect(storyStructureMult("casting", 10)).toBeCloseTo(11.5);
    expect(storyStructureMult("casting", -4)).toBe(-4);
    const positive = ARC_COMBOS.find((c) => c.q > 0 || c.f > 0);
    expect(positive).toBeTruthy();
    expect(narrativeMomentumFanMult("casting", draft(positive!.arcs), { story: 90, art: 70, sound: 60 })).toBe(1.5);
    expect(narrativeMomentumFanMult("casting", draft([]), { story: 90, art: 70, sound: 60 })).toBe(1.25);
  });

  it("Contrarian specifically amplifies experimental pairings", () => {
    const base = comboMult(["mecha", "romance"], true);
    expect(base).toBeGreaterThan(1);
    expect(contrarianComboMult("festival", ["mecha", "romance"])).toBeCloseTo(1 + (base - 1) * 1.6);
    expect(contrarianComboMult("steady", ["mecha", "romance"])).toBeCloseTo(base);
  });

  it("Production Savant exposes a 20-point range but not when exact knowledge is known", () => {
    expect(engineerEyeRange("dealmaker", 63, false)).toEqual({ low: 53, high: 73 });
    expect(engineerEyeRange("dealmaker", 63, true)).toBeNull();
    expect(engineerEyeRange("steady", 63, false)).toBeNull();
  });

  it("Trailblazer boosts only an untried two-genre combination", () => {
    expect(trailblazerProductionMult("genre", ["mecha", "romance"], {})).toBe(1.35);
    expect(trailblazerProductionMult("genre", ["mecha", "romance"], { "mecha|romance": 1 })).toBe(1);
    expect(trailblazerProductionMult("steady", ["mecha", "romance"], {})).toBe(1);
  });
});
