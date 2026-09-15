import { describe, expect, it } from "vitest";
import { generateCreatorVision, genreTitle, visionAlignment, visionEffects } from "../creatorVision";
import type { Draft, Staff } from "../data";

const staff: Staff = { id: "auteur", name: "Auteur", role: "writer", level: 6, story: 80, art: 30, sound: 30, salary: 1000, cost: 5000, portrait: 0, stamina: 100, morale: 80, favGenre: "horror" };

describe("creator vision", () => {
  it("generates deterministic genre-specific passion briefs", () => {
    const a = generateCreatorVision("pitch:auteur:24", "horror", ["horror", "mystery", "romance"], staff);
    const b = generateCreatorVision("pitch:auteur:24", "horror", ["horror", "mystery", "romance"], staff);
    expect(a).toEqual(b);
    expect(a.title).toBe(genreTitle("pitch:auteur:24", "horror"));
    expect(a.arcs.length).toBeGreaterThanOrEqual(2);
  });

  it("rewards following the creator and penalises overriding most of the brief", () => {
    const v = generateCreatorVision("vision", "horror", ["horror", "mystery"], staff);
    const aligned = {
      title: v.title, medium: "tv", budget: "standard", scope: "standard", slot: "midnight", animeType: "shonen",
      genres: [v.primaryGenre, ...(v.secondaryGenre ? [v.secondaryGenre] : [])], audience: v.audience,
      protag: v.cast.protag!, protagName: "Lead", secondary: v.cast.secondary!, pet: v.cast.pet!, villain: v.cast.villain!,
      arcs: [...v.arcs], sliders: [...v.sliders], season: 1,
    } as Draft;
    const ignored = { ...aligned, title: "Management Rewrite", audience: v.audience === "kids" ? "adults" : "kids", genres: ["romance"], protag: "kai", secondary: "none", pet: "none", villain: "none", arcs: [], sliders: [0, 0, 0] } as Draft;
    const good = visionAlignment(aligned, v);
    const bad = visionAlignment(ignored, v);
    expect(good.score).toBeGreaterThan(85);
    expect(bad.score).toBeLessThan(50);
    expect(visionEffects(good).outputMult).toBeGreaterThan(1);
    expect(visionEffects(bad).outputMult).toBeLessThan(1);
  });
});
