import { describe, expect, it } from "vitest";
import {
  FANBASE_SALES_CAP,
  fanBaseSalesMultiplier,
  industryPressure,
  managementOutputMult,
  talentPoachTerms,
} from "../difficulty";

describe("campaign anti-snowball difficulty", () => {
  it("starts neutral, then reacts to an early breakout rather than waiting for Dynasty Mode", () => {
    const rookie = industryPressure({ week: 0, cash: 90_000, fans: 0, awards: 0, hits: 0, bestScore: 0, showsMade: 0, playerRank: 1 });
    const breakout = industryPressure({ week: 30, cash: 750_000, fans: 100_000, awards: 0, hits: 2, bestScore: 33, showsMade: 2, playerRank: 1 });
    const champion = industryPressure({ week: 144, cash: 8_000_000, fans: 750_000, awards: 10, hits: 12, bestScore: 37, showsMade: 18, playerRank: 1 });
    expect(rookie.level).toBe(0);
    expect(breakout.level).toBeGreaterThan(1);
    expect(champion.level).toBeGreaterThan(breakout.level);
    expect(champion.rivalBoost).toBeGreaterThan(3);
  });

  it("keeps fanbase valuable but caps the compounding lifetime sales multiplier", () => {
    expect(fanBaseSalesMultiplier(0)).toBe(1);
    expect(fanBaseSalesMultiplier(75_000)).toBeGreaterThan(1.25);
    expect(fanBaseSalesMultiplier(300_000)).toBeLessThanOrEqual(FANBASE_SALES_CAP);
    expect(fanBaseSalesMultiplier(50_000_000)).toBe(FANBASE_SALES_CAP);
  });

  it("makes parallel productions a management problem that infrastructure can mitigate", () => {
    expect(managementOutputMult(1, 0, 0)).toBe(1);
    const overloaded = managementOutputMult(4, 1, 0);
    const managed = managementOutputMult(4, 4, 3, true);
    expect(overloaded).toBeLessThan(0.85);
    expect(managed).toBeGreaterThan(overloaded);
    expect(managed).toBeLessThanOrEqual(1);
  });

  it("prevents a cash-rich rookie from instantly stripping elite rival talent", () => {
    const talent = { skill: 92, level: 8, cost: 85_000 };
    const studio = { tier: 4, reputation: 78, rivalry: 0 };
    const rookie = talentPoachTerms({ week: 20, cash: 50_000_000, fans: 20_000, awards: 0, hits: 1, bestScore: 31, showsMade: 2, playerRank: 1, officeLevel: 0 }, talent, studio);
    expect(rookie.askingPrice).toBeGreaterThan(500_000);
    expect(rookie.blockedReason).not.toBeNull();

    const established = talentPoachTerms({ week: 144, cash: 50_000_000, fans: 1_000_000, awards: 12, hits: 14, bestScore: 38, showsMade: 22, playerRank: 1, officeLevel: 4 }, talent, studio);
    expect(established.blockedReason).toBeNull();
    expect(established.askingPrice).toBeGreaterThan(rookie.askingPrice);
  });
});
