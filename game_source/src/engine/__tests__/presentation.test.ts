import { describe, expect, it } from "vitest";
import { canPresentDeferredLevelUp, PRESENTATION_PRIORITY, type DeferredLevelUpContext } from "../presentation";

const base: DeferredLevelUpContext = {
  screen: "office",
  paused: false,
  sellerAuctionOpen: false,
  decisionEventOpen: false,
  auctionForecastOpen: false,
};

describe("deferred presentation priority", () => {
  it("shows queued level-ups only in an unobstructed office", () => {
    expect(canPresentDeferredLevelUp(base)).toBe(true);
  });

  it.each(["create", "licensed", "produce", "ship", "contract", "release", "awards", "auction"] as const)(
    "defers level-ups while the %s surface owns presentation",
    (screen) => expect(canPresentDeferredLevelUp({ ...base, screen })).toBe(false),
  );

  it("defers behind pause/save, decisions and auction attention surfaces", () => {
    expect(canPresentDeferredLevelUp({ ...base, paused: true })).toBe(false);
    expect(canPresentDeferredLevelUp({ ...base, sellerAuctionOpen: true })).toBe(false);
    expect(canPresentDeferredLevelUp({ ...base, decisionEventOpen: true })).toBe(false);
    expect(canPresentDeferredLevelUp({ ...base, auctionForecastOpen: true })).toBe(false);
  });

  it("keeps level-ups below all reveal/decision priority bands", () => {
    expect(PRESENTATION_PRIORITY.levelUp).toBeLessThan(PRESENTATION_PRIORITY.majorAnnouncement);
    expect(PRESENTATION_PRIORITY.levelUp).toBeLessThan(PRESENTATION_PRIORITY.productionReveal);
    expect(PRESENTATION_PRIORITY.levelUp).toBeLessThan(PRESENTATION_PRIORITY.playerDecision);
    expect(PRESENTATION_PRIORITY.levelUp).toBeLessThan(PRESENTATION_PRIORITY.criticalReveal);
  });
});
