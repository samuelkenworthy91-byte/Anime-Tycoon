import { describe, expect, it } from "vitest";
import {
  ARCS,
  ARC_COMBOS,
  PRODUCTION_SCOPES,
  RESEARCH,
  arcComboRating,
  arcCombosFor,
  arcGenreFit,
  arcGenreKey,
} from "../data";
import { initialRun, migrateRun } from "../state";

describe("creative discovery", () => {
  it("expands the story board to a sixty-arc catalogue", () => {
    expect(ARCS.length).toBeGreaterThanOrEqual(60);
  });

  it("ordered structures care about sequence", () => {
    expect(arcCombosFor(["montage", "tournament", "finale"]).some((c) => c.id === "earned_victory")).toBe(true);
    expect(arcCombosFor(["tournament", "montage", "finale"]).some((c) => c.id === "earned_victory")).toBe(false);
    expect(arcCombosFor(["tournament", "montage"]).some((c) => c.id === "backwards_training")).toBe(true);
  });

  it("learned structures classify as great, good or risky", () => {
    const great = ARC_COMBOS.find((c) => c.id === "earned_victory")!;
    const risky = ARC_COMBOS.find((c) => c.id === "backwards_training")!;
    expect(arcComboRating(great).label).toMatch(/GREAT/);
    expect(arcComboRating(risky).label).toMatch(/RISKY/);
  });

  it("arc-to-genre fit can be positive, neutral or risky", () => {
    const slow = ARCS.find((a) => a.id === "narr_slowburn")!;
    expect(arcGenreFit(slow, "slice").label).toMatch(/GREAT|GOOD/);
    expect(arcGenreFit(slow, "sports").label).toMatch(/RISKY/);
    expect(arcGenreFit(slow, "space").label).toBe("NEUTRAL");
    expect(arcGenreKey(slow.id, "slice")).toBe("narr_slowburn|slice");
  });

  it("scope controls how much story a production can carry", () => {
    expect(PRODUCTION_SCOPES.short.arcLimit).toBe(3);
    expect(PRODUCTION_SCOPES.standard.arcLimit).toBe(4);
    expect(PRODUCTION_SCOPES.extended.arcLimit).toBe(5);
    expect(PRODUCTION_SCOPES.prestige.arcLimit).toBe(6);
  });

  it("creative research routes exist alongside experimentation", () => {
    expect(RESEARCH.some((r) => r.id === "genre_studies")).toBe(true);
    expect(RESEARCH.some((r) => r.id === "narrative_analytics")).toBe(true);
  });

  it("legacy saves migrate with empty relationship knowledge", () => {
    const raw = initialRun("Legacy", "steady") as unknown as Record<string, unknown>;
    delete raw.arcGenreKnowledge;
    const migrated = migrateRun(raw);
    expect(migrated.arcGenreKnowledge).toEqual({});
  });
});
