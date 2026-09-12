import type { Franchise } from "./franchise";
import type { RivalWorld } from "./rivals";

export interface SellerAuctionBid {
  bidderType: "network" | "rival";
  bidderId: string;
  bidderName: string;
  amount: number;
  round: number;
}

export interface SellerAuction {
  id: string;
  franchiseKey: string;
  title: string;
  openedWeek: number;
  fairAppraisal: number;
  bids: SellerAuctionBid[];
  winningBid: number;
  winnerType: "network" | "rival";
  winnerId: string;
  winnerName: string;
  /** true when two or more serious bidders pushed the hammer above appraisal */
  biddingWar: boolean;
}

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const rngFrom = (seed: string) => {
  let x = hash(seed) || 0x6d2b79f5;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4_294_967_296; };
};
const round25 = (n: number) => Math.max(25_000, Math.round(n / 25_000) * 25_000);

export function franchiseFairAppraisal(fr: Franchise): number {
  const hof = fr.entries.some((e) => e.hallOfFame) ? 500_000 : 0;
  const momentum = fr.entries.slice(-2).reduce((sum, e) => sum + Math.max(0, e.score - 20) * 18_000, 0);
  return round25(Math.max(
    300_000,
    fr.totalRevenue * 0.48 +
    fr.lifetimeFans * 42 +
    fr.bestScore * 28_000 +
    fr.popularity * 11_000 +
    fr.merchValue * 0.22 +
    hof + momentum,
  ));
}

interface Bidder { bidderType: "network" | "rival"; bidderId: string; bidderName: string; ceiling: number; }

/** Build the entire no-reserve bidding transcript once and save it. Reopening
 * the ceremony can never reroll the outcome. Appetite is intentionally broad:
 * a great IP can still meet a cold room, while two genre-hungry rivals can
 * irrationally chase one another far above the desk appraisal. */
export function buildSellerAuction(franchiseKey: string, fr: Franchise, week: number, world: RivalWorld, showrunner: string): SellerAuction {
  const rng = rngFrom(`${franchiseKey}|${fr.entries.length}|${week}|seller-auction-v2`);
  const fair = franchiseFairAppraisal(fr);
  const dealHeat = showrunner === "dealmaker" ? 1.14 : 1;
  const networks = [
    { id: "network:zenith", name: "Zenith Media Group", genreBias: 0.05 },
    { id: "network:kousei", name: "Kousei Broadcast Network", genreBias: 0.12 },
    { id: "network:streamline", name: "Streamline Media", genreBias: 0.18 },
    { id: "network:orion", name: "Orion Global Streaming", genreBias: 0.25 },
  ];
  const bidders: Bidder[] = [];
  for (const n of networks) {
    const interest = rng();
    if (interest < 0.20) continue;
    const ceiling = round25(fair * (0.22 + interest * 1.18 + n.genreBias) * dealHeat);
    bidders.push({ bidderType: "network", bidderId: n.id, bidderName: n.name, ceiling });
  }
  for (const studio of world.studios.filter((s) => s.status !== "collapsed")) {
    const fit = studio.preferred.filter((g) => fr.genres.includes(g)).length + studio.specialist.filter((g) => fr.genres.includes(g)).length * 1.35;
    const appetite = rng();
    // Studios with no fit are often simply not in the room.
    if (appetite < Math.max(0.08, 0.40 - fit * 0.10)) continue;
    const stature = 0.48 + studio.reputation / 180 + studio.tier * 0.09;
    const rivalryMadness = fit > 0 ? rng() * 0.65 : rng() * 0.22;
    const ceiling = round25(fair * (0.16 + appetite * 0.72 + stature * 0.42 + fit * 0.16 + rivalryMadness) * dealHeat);
    bidders.push({ bidderType: "rival", bidderId: studio.id, bidderName: studio.name, ceiling });
  }

  // No reserve means the player can get punished. A liquidation buyer always
  // exists, but in a cold room its ceiling can be a tiny fraction of appraisal.
  bidders.push({
    bidderType: "network",
    bidderId: "network:liquidation",
    bidderName: "Mizuho Content Liquidation",
    ceiling: round25(fair * (0.07 + rng() * 0.16) * (showrunner === "dealmaker" ? 1.08 : 1)),
  });

  const maxCeiling = Math.max(...bidders.map((b) => b.ceiling));
  let current = 0;
  let leader: Bidder | null = null;
  const bids: SellerAuctionBid[] = [];
  let round = 0;
  // Each pass gives another willing bidder a chance to top the room. Dynamic
  // increments make a real two-studio fight accelerate rather than crawl.
  while (round < 36) {
    const increment = Math.max(25_000, round25(Math.max(25_000, current * (0.07 + rng() * 0.08))));
    const eligible = bidders.filter((b) => b.bidderId !== leader?.bidderId && b.ceiling >= current + increment);
    if (!eligible.length) break;
    const weighted = [...eligible].sort((a, b) => (b.ceiling + rng() * fair * 0.35) - (a.ceiling + rng() * fair * 0.35));
    const next = weighted[0];
    current = Math.min(next.ceiling, current + increment);
    round += 1;
    leader = next;
    bids.push({ bidderType: next.bidderType, bidderId: next.bidderId, bidderName: next.bidderName, amount: round25(current), round });
  }

  // If nobody could clear the first increment, the lowball liquidator takes it.
  if (!leader) {
    leader = bidders.reduce((a, b) => a.ceiling >= b.ceiling ? a : b);
    current = Math.min(leader.ceiling, 25_000);
    bids.push({ bidderType: leader.bidderType, bidderId: leader.bidderId, bidderName: leader.bidderName, amount: round25(current), round: 1 });
  }
  const final = bids[bids.length - 1];
  const distinctSerious = new Set(bids.filter((b) => b.amount >= fair * 0.75).map((b) => b.bidderId)).size;
  return {
    id: `seller_${week}_${hash(franchiseKey).toString(36)}`,
    franchiseKey,
    title: fr.baseTitle,
    openedWeek: week,
    fairAppraisal: fair,
    bids,
    winningBid: final.amount,
    winnerType: final.bidderType,
    winnerId: final.bidderId,
    winnerName: final.bidderName,
    biddingWar: distinctSerious >= 2 && final.amount > fair,
  };
}
