import { describe, expect, it } from "vitest";
import { AUCTION_IPS, initIPMarket, type IPContract, type IPMarketState } from "../ip";
import {
  IP_RENEWAL_WARNING_WEEKS,
  ipRenewalCost,
  ipRenewalQuote,
  renewIPContract,
  setIPAutoRenew,
  tickIPRenewals,
} from "../ipRenewal";

const ip = AUCTION_IPS[0];

function contract(over: Partial<IPContract> = {}): IPContract {
  return {
    ipId: ip.id,
    acquiredWeek: 0,
    expiresWeek: 48,
    purchasePrice: Math.max(100_000, ip.minimumBid),
    royaltyRate: ip.royaltyRate,
    ownershipShare: 0.3,
    sequelRights: true,
    merchRights: false,
    internationalRights: false,
    adaptations: 0,
    bestScore: 0,
    discoveredArcs: [],
    acquisition: "auction",
    auctionId: "test-auction",
    ownerStudioId: "player",
    ...over,
  };
}

function market(c = contract()): IPMarketState {
  const m = initIPMarket(0, () => 0.99);
  return { ...m, owned: { [ip.id]: c }, history: [] };
}

describe("independent IP renewals", () => {
  it("makes proven successful properties more expensive to retain", () => {
    const quiet = market(contract({ adaptations: 0, bestScore: 20 }));
    const hit = market(contract({ adaptations: 4, bestScore: 36 }));
    expect(ipRenewalCost(hit, ip.id, 0)!).toBeGreaterThan(ipRenewalCost(quiet, ip.id, 0)!);
  });

  it("lets the Legal Desk reduce the renewal quote", () => {
    const m = market(contract({ adaptations: 2, bestScore: 32 }));
    expect(ipRenewalCost(m, ip.id, 3)!).toBeLessThan(ipRenewalCost(m, ip.id, 0)!);
  });

  it("does not allow manual renewal years before the renewal window", () => {
    const m = market(contract({ expiresWeek: 100 }));
    expect(ipRenewalQuote(m, ip.id, 40, 1)!.available).toBe(false);
    expect(renewIPContract(m, ip.id, 40, 1)).toBeNull();
  });

  it("opens a renewal window, renews manually, and preserves negotiated rights terms", () => {
    const m = market(contract({ expiresWeek: 60, royaltyRate: 0.06, ownershipShare: 0.55, sequelRights: true, merchRights: true }));
    const q = ipRenewalQuote(m, ip.id, 40, 2)!;
    expect(q.available).toBe(true);
    const out = renewIPContract(m, ip.id, 40, 2)!;
    const renewed = out.market.owned[ip.id];
    expect(renewed.expiresWeek).toBe(60 + ip.licenseLength);
    expect(renewed.royaltyRate).toBe(0.06);
    expect(renewed.ownershipShare).toBe(0.55);
    expect(renewed.sequelRights).toBe(true);
    expect(renewed.merchRights).toBe(true);
  });

  it("warns once as expiry approaches", () => {
    const m = market(contract({ expiresWeek: 100 }));
    const first = tickIPRenewals(m, 100 - IP_RENEWAL_WARNING_WEEKS, 5_000_000, 1);
    expect(first.notices.some((n) => n.includes("rights expire"))).toBe(true);
    const second = tickIPRenewals(first.market, 89, 5_000_000, 1);
    expect(second.notices.some((n) => n.includes("rights expire"))).toBe(false);
  });

  it("auto-renews at expiry when the quote is affordable and below the stored ceiling", () => {
    let m = market(contract({ expiresWeek: 48, adaptations: 1, bestScore: 30 }));
    const quote = ipRenewalCost(m, ip.id, 1)!;
    m = setIPAutoRenew(m, ip.id, true, quote + 50_000);
    const out = tickIPRenewals(m, 48, quote + 1_000_000, 1);
    expect(out.cashDelta).toBe(-quote);
    expect(out.market.owned[ip.id].expiresWeek).toBe(48 + ip.licenseLength);
    expect(out.notices.some((n) => n.includes("auto-renewed"))).toBe(true);
  });

  it("stops auto-renew instead of overspending when a successful IP exceeds its cap", () => {
    let m = market(contract({ expiresWeek: 48, adaptations: 5, bestScore: 38 }));
    const quote = ipRenewalCost(m, ip.id, 0)!;
    m = setIPAutoRenew(m, ip.id, true, Math.max(5_000, quote - 5_000));
    const out = tickIPRenewals(m, 48, quote + 1_000_000, 0);
    expect(out.cashDelta).toBe(0);
    expect(out.market.owned[ip.id].expiresWeek).toBe(48);
    expect(ipRenewalQuote(out.market, ip.id, 48, 0)!.autoRenew).toBe(false);
    expect(out.notices.some((n) => n.includes("exceeded"))).toBe(true);
  });
});
