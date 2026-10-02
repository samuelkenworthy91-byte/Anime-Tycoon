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
  | "auction"
  | "arcball";

/**
 * Presentation priority is deliberately centralised so future pop-ups can join
 * the same policy instead of competing through z-index. Mechanical effects
 * still resolve immediately; only their presentation waits.
 */
export const PRESENTATION_PRIORITY = {
  criticalReveal: 100,
  playerDecision: 80,
  culturalReveal: 70,
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
  productionRevealOpen: boolean;
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
    !context.auctionForecastOpen &&
    !context.productionRevealOpen
  );
}


/* ---------------------------------------------------- unified presentation queue
 * This selector is intentionally pure. Mechanical state can resolve whenever it
 * needs to; only one attention surface is allowed to own the screen at a time. */
export type PresentationKind =
  | "sellerAuction"
  | "studioDecision"
  | "auctionForecast"
  | "bigThree"
  | "nomination"
  | "staffRequest"
  | "levelUp";

export interface PresentationQueueContext {
  screen: PresentationScreen;
  paused: boolean;
  sellerAuction: boolean;
  studioDecision: boolean;
  auctionForecast: boolean;
  bigThree: boolean;
  nomination: boolean;
  staffRequest: boolean;
  levelUp: boolean;
  productionReveal?: boolean;
}

const PRESENTATION_KIND_PRIORITY: Record<PresentationKind, number> = {
  sellerAuction: PRESENTATION_PRIORITY.criticalReveal,
  studioDecision: PRESENTATION_PRIORITY.playerDecision,
  auctionForecast: PRESENTATION_PRIORITY.playerDecision - 1,
  bigThree: PRESENTATION_PRIORITY.culturalReveal,
  nomination: PRESENTATION_PRIORITY.majorAnnouncement + 5,
  staffRequest: PRESENTATION_PRIORITY.majorAnnouncement,
  levelUp: PRESENTATION_PRIORITY.levelUp,
};

export function selectPresentation(context: PresentationQueueContext): PresentationKind | null {
  if (context.paused || context.productionReveal) return null;
  /* Creation, release, contract selection, ceremonies and Arcball own the
     screen. Queued attention resumes when the player returns to office/editing. */
  if (context.screen !== "office" && context.screen !== "produce") return null;
  const ready: PresentationKind[] = [];
  if (context.sellerAuction) ready.push("sellerAuction");
  if (context.studioDecision) ready.push("studioDecision");
  if (context.auctionForecast) ready.push("auctionForecast");
  if (context.bigThree) ready.push("bigThree");
  if (context.nomination) ready.push("nomination");
  if (context.staffRequest) ready.push("staffRequest");
  if (context.levelUp) ready.push("levelUp");
  ready.sort((a, b) => PRESENTATION_KIND_PRIORITY[b] - PRESENTATION_KIND_PRIORITY[a]);
  return ready[0] ?? null;
}
