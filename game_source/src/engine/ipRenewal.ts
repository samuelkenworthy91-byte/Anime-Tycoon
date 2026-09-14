import { ipById, type IPContract, type IPMarketState } from "./ip";

export const IP_RENEWAL_WARNING_WEEKS = 12;
export const IP_RENEWAL_WINDOW_WEEKS = 24;
export const IP_AUTO_RENEW_HEADROOM = 1.25;

type RenewalContract = IPContract & {
  autoRenew?: boolean;
  autoRenewMaxCost?: number;
  renewalWarnedForExpiry?: number;
  lastRenewalWeek?: number;
  lastRenewalCost?: number;
};

export interface IPRenewalQuote {
  ipId: string;
  cost: number;
  expiresWeek: number;
  weeksRemaining: number;
  available: boolean;
  expired: boolean;
  autoRenew: boolean;
  autoRenewMaxCost: number;
}

const rounded5k = (value: number) => Math.max(5_000, Math.round(value / 5_000) * 5_000);
const renewalContract = (c: IPContract): RenewalContract => c as RenewalContract;

/** Renewal value rises with the property's market prestige and with what the
 * player's studio has proved it can earn from the licence. A Legal Desk and
 * accumulated legal reputation shave the quote, but a breakout adaptation is
 * intentionally expensive to keep. */
export function ipRenewalCost(market: IPMarketState, ipId: string, legalTier = 0): number | null {
  const baseContract = market.owned[ipId];
  const ip = ipById(ipId);
  if (!baseContract || !ip) return null;
  const contract = renewalContract(baseContract);
  const adaptationPremium = Math.min(0.55, Math.max(0, contract.adaptations) * 0.10);
  const scorePremium = Math.min(0.45, Math.max(0, contract.bestScore - 24) * 0.025);
  const prestigePremium = Math.min(0.38, ip.prestige / 260);
  const legalDiscount = Math.min(0.24, Math.max(0, legalTier) * 0.045 + Math.max(0, market.legalReputation) * 0.004);
  const marketValue = ip.rightsBaseValue * (0.52 + adaptationPremium + scorePremium + prestigePremium);
  return rounded5k(Math.max(contract.purchasePrice * 0.35, marketValue * (1 - legalDiscount)));
}

export function ipRenewalQuote(market: IPMarketState, ipId: string, week: number, legalTier = 0): IPRenewalQuote | null {
  const baseContract = market.owned[ipId];
  const cost = ipRenewalCost(market, ipId, legalTier);
  if (!baseContract || cost === null) return null;
  const contract = renewalContract(baseContract);
  const weeksRemaining = baseContract.expiresWeek - week;
  return {
    ipId,
    cost,
    expiresWeek: baseContract.expiresWeek,
    weeksRemaining,
    available: weeksRemaining <= IP_RENEWAL_WINDOW_WEEKS,
    expired: weeksRemaining <= 0,
    autoRenew: contract.autoRenew === true,
    autoRenewMaxCost: Math.max(0, contract.autoRenewMaxCost ?? rounded5k(cost * IP_AUTO_RENEW_HEADROOM)),
  };
}

export function setIPAutoRenew(market: IPMarketState, ipId: string, enabled: boolean, maxCost?: number): IPMarketState {
  const baseContract = market.owned[ipId];
  if (!baseContract) return market;
  const cost = maxCost ?? ipRenewalCost(market, ipId, 0) ?? 0;
  const contract = renewalContract(baseContract);
  const next = {
    ...contract,
    autoRenew: enabled,
    autoRenewMaxCost: enabled ? Math.max(0, rounded5k(cost)) : contract.autoRenewMaxCost,
  } as IPContract;
  return {
    ...market,
    owned: { ...market.owned, [ipId]: next },
    history: [...market.history, `${ipById(ipId)?.title ?? ipId}: auto-renew ${enabled ? "enabled" : "disabled"}.`].slice(-100),
  };
}

/** Manual renewal is deterministic: the Legal Desk has already improved the
 * quote. Existing royalty/ownership/sequel/merch/international terms survive,
 * so negotiating those terms remains a separate Legal Desk decision. */
export function renewIPContract(
  market: IPMarketState,
  ipId: string,
  week: number,
  legalTier = 0
): { market: IPMarketState; cost: number } | null {
  const baseContract = market.owned[ipId];
  const ip = ipById(ipId);
  const cost = ipRenewalCost(market, ipId, legalTier);
  if (!baseContract || !ip || cost === null) return null;
  const contract = renewalContract(baseContract);
  const starts = Math.max(week, baseContract.expiresWeek);
  const next = {
    ...contract,
    expiresWeek: starts + ip.licenseLength,
    lastRenewalWeek: week,
    lastRenewalCost: cost,
    renewalWarnedForExpiry: undefined,
  } as IPContract;
  return {
    cost,
    market: {
      ...market,
      owned: { ...market.owned, [ipId]: next },
      history: [...market.history, `Rights renewed: ${ip.title} for £${cost.toLocaleString("en-GB")}.`].slice(-100),
    },
  };
}

export interface IPRenewalTick {
  market: IPMarketState;
  cashDelta: number;
  notices: string[];
}

/** Weekly lifecycle pass: warn once at 12 weeks, then execute an enabled
 * auto-renewal at expiry only when the negotiated quote fits both cash and the
 * player's stored ceiling. A failed auto-renew is switched off rather than
 * retrying/spamming forever. */
export function tickIPRenewals(
  market: IPMarketState,
  week: number,
  cash: number,
  legalTier = 0
): IPRenewalTick {
  let next = { ...market, owned: { ...market.owned }, history: [...market.history] };
  let cashDelta = 0;
  const notices: string[] = [];

  for (const [ipId, base] of Object.entries(next.owned)) {
    const ip = ipById(ipId);
    if (!ip) continue;
    let contract = renewalContract(base);
    const remaining = contract.expiresWeek - week;

    if (remaining <= IP_RENEWAL_WARNING_WEEKS && remaining > 0 && contract.renewalWarnedForExpiry !== contract.expiresWeek) {
      const quote = ipRenewalCost(next, ipId, legalTier) ?? 0;
      notices.push(`⚖ ${ip.title} rights expire in ${remaining} week${remaining === 1 ? "" : "s"}. Current renewal quote: £${quote.toLocaleString("en-GB")}.`);
      contract = { ...contract, renewalWarnedForExpiry: contract.expiresWeek };
      next.owned[ipId] = contract as IPContract;
    }

    if (remaining > 0 || contract.autoRenew !== true) continue;
    const quote = ipRenewalCost(next, ipId, legalTier);
    if (quote === null) continue;
    const cap = Math.max(0, contract.autoRenewMaxCost ?? 0);
    const affordable = cash + cashDelta >= quote;
    if (quote <= cap && affordable) {
      const renewed = renewIPContract(next, ipId, week, legalTier);
      if (!renewed) continue;
      next = renewed.market;
      cashDelta -= renewed.cost;
      notices.push(`✅ ${ip.title} auto-renewed for £${renewed.cost.toLocaleString("en-GB")}.`);
    } else {
      next = setIPAutoRenew(next, ipId, false);
      notices.push(
        quote > cap
          ? `⚠ ${ip.title} auto-renewal stopped: £${quote.toLocaleString("en-GB")} exceeded your £${cap.toLocaleString("en-GB")} ceiling.`
          : `⚠ ${ip.title} auto-renewal stopped: the studio could not cover £${quote.toLocaleString("en-GB")}.`
      );
    }
  }

  if (notices.length) next.history = [...next.history, ...notices].slice(-100);
  return { market: next, cashDelta, notices };
}
