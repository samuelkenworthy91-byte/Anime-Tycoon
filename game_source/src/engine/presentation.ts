export type PresentationScreen =
  | "title"
  | "office"
  | "create"
  | "licensed"
  | "produce"
  | "ship"
  | "contract"
  | "release"
  | "gameover"
  | "retrospective"
  | "awards"
  | "auction";

/**
 * Presentation priority is deliberately centralised so future pop-ups can join
 * the same policy instead of competing through z-index. Mechanical effects
 * still resolve immediately; only their presentation waits.
 */
export const PRESENTATION_PRIORITY = {
  criticalReveal: 100,
  playerDecision: 80,
  productionReveal: 60,
  majorAnnouncement: 50,
  levelUp: 20,
  routineNotice: 10,
} as const;

export interface DeferredLevelUpContext {
  screen: PresentationScreen;
  paused: boolean;
  sellerAuctionOpen: boolean;
  decisionEventOpen: boolean;
  auctionForecastOpen: boolean;
}

/**
 * Level-up records already live durably on RunState. They are therefore the
 * queue: only surface them when the player is back in an unobstructed office.
 * This prevents staff/showrunner growth from covering reveals, negotiations,
 * auctions, awards, releases or the pause/save UI.
 */
export function canPresentDeferredLevelUp(context: DeferredLevelUpContext): boolean {
  return (
    context.screen === "office" &&
    !context.paused &&
    !context.sellerAuctionOpen &&
    !context.decisionEventOpen &&
    !context.auctionForecastOpen
  );
}
