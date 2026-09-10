import { describe, expect, it } from "vitest";
import { industryPressure, rookieCredibilityBar } from "../difficulty";

const base = {
  cash: 90_000,
  fans: 0,
  awards: 0,
  hits: 0,
  bestScore: 0,
  showsMade: 0,
  playerRank: 4,
};

describe("early-career critical credibility", () => {
  it("makes a debut studio earn reviewer trust instead of starting neutral", () => {
    const rookie = industryPressure({ ...base, week: 0 });
    expect(rookie.level).toBe(0);
    expect(rookieCredibilityBar({ ...base, week: 0 })).toBe(18);
    expect(rookie.audienceBar).toBe(18);
    expect(rookie.reasons).toContain("new-studio critic scepticism");
  });

  it("fades the rookie hurdle over the opening years without one hit deleting it", () => {
    const year1AfterHit = industryPressure({
      ...base,
      week: 30,
      showsMade: 2,
      hits: 1,
      bestScore: 34,
      fans: 40_000,
    });
    const year2 = industryPressure({ ...base, week: 48, showsMade: 3, hits: 1 });
    const year3 = industryPressure({ ...base, week: 96, showsMade: 5, hits: 2 });
    expect(year1AfterHit.audienceBar).toBeGreaterThan(14);
    expect(year2.audienceBar).toBeLessThan(year1AfterHit.audienceBar);
    expect(year3.audienceBar).toBeLessThan(year2.audienceBar);
  });

  it("removes rookie scepticism by Year 5 while keeping success pressure intact", () => {
    const veteranInput = {
      ...base,
      week: 192,
      cash: 2_000_000,
      fans: 250_000,
      awards: 4,
      hits: 7,
      bestScore: 35,
      showsMade: 16,
      playerRank: 2,
    };
    expect(rookieCredibilityBar(veteranInput)).toBe(0);
    const veteran = industryPressure(veteranInput);
    expect(veteran.audienceBar).toBeGreaterThan(0);
    expect(veteran.audienceBar).toBeLessThanOrEqual(6);
  });
});
