import { describe, expect, it } from "vitest";
import { CAST_V2, type Draft } from "../data";
import type { Franchise } from "../franchise";
import { draftCost, makeProject } from "../projects";
import { initRivalWorld } from "../rivals";
import { buildSellerAuction, franchiseFairAppraisal } from "../sellerAuction";
import {
  finalizeFranchiseAuction,
  franchiseSaleBlock,
  initialRun,
  showSaleOffers,
  soldCastRights,
  startBlockReason,
  startFranchiseAuction,
} from "../state";

const byRole = (role: "protag" | "secondary" | "pet" | "villain") => CAST_V2.find((m) => m.role === role)!;
const lead = byRole("protag");
const support = byRole("secondary");
const mascot = byRole("pet");
const villain = byRole("villain");

const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Rookie Gamble",
  medium: "fanweb",
  budget: "standard",
  scope: "standard",
  slot: "midnight",
  animeType: lead.type,
  genres: ["slice"],
  audience: "teens",
  protag: lead.id,
  protagName: lead.name,
  secondary: support.id,
  pet: mascot.id,
  villain: villain.id,
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
  ...over,
});

const franchise = (over: Partial<Franchise> = {}): Franchise => ({
  key: "Iron Hearts",
  baseTitle: "Iron Hearts",
  genres: ["mecha", "martial"],
  animeType: lead.type,
  audience: "teens",
  cast: [
    { role: "protag", id: lead.id, name: lead.name, popularity: 82 },
    { role: "secondary", id: support.id, name: support.name, popularity: 63 },
  ],
  createdWeek: 0,
  entries: [{ kind: "original", title: "Iron Hearts", score: 34, revenue: 1_600_000, fans: 75_000, week: 8, hallOfFame: true, animeType: lead.type }],
  season: 1,
  totalRevenue: 1_600_000,
  lifetimeFans: 75_000,
  bestScore: 34,
  lastScore: 34,
  lastEntryWeek: 8,
  popularity: 78,
  fatigue: 8,
  merchValue: 850_000,
  cult: false,
  merchCooldown: {},
  alive: true,
  ...over,
});

describe("completed-show sale appraisal", () => {
  it("does not protect a rookie studio by guaranteeing production-cost recovery", () => {
    const r = initialRun("Rookie", "steady");
    const p = { ...makeProject(draft(), 0), stage: "ready" as const, spent: 22_000, points: { story: 30, art: 28, sound: 24 }, hype: 12 };
    const run = { ...r, projects: [p] };
    const offers = showSaleOffers(run, p.id);
    expect(offers.length).toBeGreaterThan(0);
    expect(Math.max(...offers.map((o) => o.cash))).toBeLessThan(draftCost(p.draft));
  });

  it("rewards a proven studio and the Rights Broker without making offer rerolls possible", () => {
    const p = { ...makeProject(draft({ medium: "tv" }), 120), stage: "ready" as const, spent: 180_000, points: { story: 150, art: 145, sound: 120 }, hype: 80 };
    const base = { ...initialRun("Proven", "steady"), week: 120, showsMade: 12, bestScore: 33, fans: 120_000, projects: [p], mediumsUnlocked: ["fanweb", "tv"] };
    const normal = showSaleOffers(base, p.id);
    const repeat = showSaleOffers(base, p.id);
    const broker = showSaleOffers({ ...base, showrunner: "dealmaker" }, p.id);
    expect(repeat).toEqual(normal);
    expect(broker[0].cash).toBeGreaterThan(normal[0].cash);
  });
});

describe("seller-side IP auction", () => {
  it("freezes the bidding transcript and can generate both cold rooms and bidding wars", () => {
    const fr = franchise();
    const world = initRivalWorld(0);
    const a = buildSellerAuction(fr.key, fr, 20, world, "steady");
    expect(buildSellerAuction(fr.key, fr, 20, world, "steady")).toEqual(a);
    expect(a.winningBid).toBeGreaterThan(0);
    expect(a.bids.length).toBeGreaterThan(0);

    let cold = false;
    let hot = false;
    const fair = franchiseFairAppraisal(fr);
    for (let week = 0; week < 240; week += 3) {
      const out = buildSellerAuction(`${fr.key}-${week}`, { ...fr, key: `${fr.key}-${week}` }, week, world, "steady");
      cold ||= out.winningBid < fair * 0.45;
      hot ||= out.biddingWar && out.winningBid > out.fairAppraisal;
      if (cold && hot) break;
    }
    expect(cold).toBe(true);
    expect(hot).toBe(true);
  });

  it("transfers the IP and attached cast rights at the hammer", () => {
    const fr = franchise();
    const run = { ...initialRun("Seller", "steady"), week: 30, franchises: { [fr.key]: fr } };
    expect(franchiseSaleBlock(run, fr.key)).toBeNull();
    const listed = startFranchiseAuction(run, fr.key)!;
    expect(listed.sellerAuction?.franchiseKey).toBe(fr.key);
    const sold = finalizeFranchiseAuction(listed)!;
    expect(sold.franchises[fr.key].soldTo).toBeTruthy();
    expect(sold.sellerAuction).toBeNull();
    expect(soldCastRights(sold)[lead.id]?.title).toBe(fr.baseTitle);
    const blocked = startBlockReason(sold, draft({ title: "Reuse Attempt", protag: lead.id, protagName: lead.name }));
    expect(blocked).toMatch(/Cast rights.*sold/i);
  });
});
