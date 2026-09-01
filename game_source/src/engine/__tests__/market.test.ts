import { afterEach, describe, expect, it, vi } from "vitest";
import { GENRES, type Draft } from "../data";
import {
  GENRE_HEAT_MULT,
  HEAT_LABEL,
  NEGOTIATE_ADVANCE_MULT,
  PARTNERS,
  REP_DELIVERED,
  REP_EXCELLENT,
  REP_LATE,
  REP_MISSED_QUALITY,
  REP_START,
  SATURATION_WINDOW,
  attentionMult,
  driftMarket,
  effectiveHeat,
  initMarket,
  marketMult,
  negotiationChance,
  partnerById,
  pruneReleases,
  repAdvanceMult,
  repLabel,
  repShareDelta,
  rollCommission,
  saturationOf,
  saturationPenalty,
  type Commission,
  type MarketState,
  type ReleaseRecord,
} from "../market";
import {
  advanceWeeks,
  initialRun,
  marketMultiplierFor,
  migrateRun,
  negotiateCommission,
  releaseProject,
  resolveMarketEvent,
  startProject,
  type RunState,
} from "../state";

/* ------------------------------------------------------------ helpers */
const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Test Show",
  medium: "tv",
  budget: "indie",
  slot: "midnight",
  genres: ["shonen"],
  audience: "teens",
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  pet: "none",
  villain: "warlord",
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
  ...over,
});

const richRun = (over: Partial<RunState> = {}): RunState => ({
  ...initialRun("Test Studio", "steady"),
  cash: 50_000_000,
  rd: 500,
  officeLevel: 4,
  ...over,
});

const com = (over: Partial<Commission> = {}): Commission => ({
  id: "test_com",
  partnerId: "ntv8",
  genre: "shonen",
  audience: "teens",
  medium: "tv",
  advance: 200_000,
  share: 0.5,
  minQuality: 0,
  bonus: 50_000,
  maxWeeks: 20,
  expiresWeek: 100,
  restriction: "Keep it prime-time friendly.",
  ...over,
});

/** flat market — every multiplier neutral */
const flatMarket = (): MarketState => {
  const m = initMarket();
  for (const k of Object.keys(m.genres)) m.genres[k as keyof typeof m.genres] = 0;
  for (const k of Object.keys(m.audiences)) m.audiences[k as keyof typeof m.audiences] = 0;
  for (const k of Object.keys(m.mediums)) m.mediums[k as keyof typeof m.mediums] = 0;
  return m;
};

/** force a project straight to the release gate */
const readyRun = (over: Partial<RunState> = {}, c?: Commission): RunState => {
  let r = richRun({ market: flatMarket(), ...over });
  r = startProject(r, draft(), c)!;
  return { ...r, projects: r.projects.map((p) => ({ ...p, stage: "ready" as const })) };
};

afterEach(() => vi.restoreAllMocks());

/* ------------------------------------------------------------- trends */
describe("market trends", () => {
  it("initialises every genre, audience and medium within bounds", () => {
    const m = initMarket();
    for (const g of GENRES) {
      const h = m.genres[g.id];
      expect(h).toBeGreaterThanOrEqual(-2);
      expect(h).toBeLessThanOrEqual(2);
    }
    for (const v of Object.values(m.audiences)) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    for (const v of Object.values(m.mediums)) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    /* the launch market is never completely flat */
    expect(Object.values(m.genres).some((v) => v !== 0)).toBe(true);
  });

  it("drifts gradually and stays within bounds over many seasons", () => {
    let m = initMarket();
    for (let i = 0; i < 60; i++) {
      const step = driftMarket(m);
      m = step.market;
      expect(Array.isArray(step.notices)).toBe(true);
      for (const v of Object.values(m.genres)) {
        expect(v).toBeGreaterThanOrEqual(-2);
        expect(v).toBeLessThanOrEqual(2);
      }
      for (const v of Object.values(m.audiences)) expect(Math.abs(v)).toBeLessThanOrEqual(1);
      for (const v of Object.values(m.mediums)) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    }
  });

  it("labels every heat level", () => {
    expect(HEAT_LABEL).toHaveLength(5);
    expect(GENRE_HEAT_MULT).toHaveLength(5);
    for (let i = 1; i < 5; i++) expect(GENRE_HEAT_MULT[i]).toBeGreaterThan(GENRE_HEAT_MULT[i - 1]);
  });
});

/* --------------------------------------------------------- saturation */
describe("saturation", () => {
  const recs: ReleaseRecord[] = [
    { genre: "shonen", week: 10, weight: 2 },
    { genre: "shonen", week: 12, weight: 1 },
    { genre: "mecha", week: 12, weight: 1 },
  ];

  it("counts weighted releases inside the window only", () => {
    expect(saturationOf(recs, "shonen", 14)).toBe(3);
    expect(saturationOf(recs, "mecha", 14)).toBe(1);
    expect(saturationOf(recs, "shonen", 10 + SATURATION_WINDOW + 1)).toBe(1);
  });

  it("prunes expired records", () => {
    expect(pruneReleases(recs, 14)).toHaveLength(3);
    expect(pruneReleases(recs, 11 + SATURATION_WINDOW)).toHaveLength(2);
  });

  it("penalises flooded genres in steps", () => {
    expect(saturationPenalty(0)).toBe(0);
    expect(saturationPenalty(3)).toBe(0);
    expect(saturationPenalty(4)).toBe(1);
    expect(saturationPenalty(8)).toBe(2);
  });

  it("drags effective heat down but never below the floor", () => {
    const m = flatMarket();
    m.genres.shonen = 1;
    const flood: ReleaseRecord[] = Array.from({ length: 5 }, (_, i) => ({ genre: "shonen" as const, week: 10 + i, weight: 2 }));
    expect(effectiveHeat(m, [], "shonen", 20)).toBe(1);
    expect(effectiveHeat(m, flood, "shonen", 20)).toBe(-1); // 10 weight → −2
    m.genres.shonen = -2;
    expect(effectiveHeat(m, flood, "shonen", 20)).toBe(-2); // clamped
  });
});

/* ------------------------------------------------------- multipliers */
describe("market multipliers", () => {
  it("is neutral in a flat market", () => {
    expect(marketMult(flatMarket(), [], draft(), 10)).toBeCloseTo(1, 5);
  });

  it("pays more for booming genres than oversaturated ones, within clamps", () => {
    const hot = flatMarket();
    hot.genres.shonen = 2;
    const cold = flatMarket();
    cold.genres.shonen = -2;
    const up = marketMult(hot, [], draft(), 10);
    const down = marketMult(cold, [], draft(), 10);
    expect(up).toBeGreaterThan(1);
    expect(down).toBeLessThan(1);
    expect(up).toBeLessThanOrEqual(1.5);
    expect(down).toBeGreaterThanOrEqual(0.6);
  });

  it("never zeroes out a show — a brilliant show in a dead genre still earns", () => {
    const worst = flatMarket();
    for (const k of Object.keys(worst.genres)) worst.genres[k as keyof typeof worst.genres] = -2;
    for (const k of Object.keys(worst.audiences)) worst.audiences[k as keyof typeof worst.audiences] = -1;
    for (const k of Object.keys(worst.mediums)) worst.mediums[k as keyof typeof worst.mediums] = -1;
    const flood: ReleaseRecord[] = Array.from({ length: 10 }, (_, i) => ({ genre: "shonen" as const, week: i, weight: 2 }));
    expect(marketMult(worst, flood, draft(), 5)).toBeGreaterThanOrEqual(0.6);
  });

  it("splits audience attention across simultaneous releases", () => {
    expect(attentionMult(0)).toBe(1);
    expect(attentionMult(1)).toBeCloseTo(0.93, 5);
    expect(attentionMult(10)).toBe(0.8); // floor
  });

  it("marketMultiplierFor reflects airing rivals and licensing boosts", () => {
    const base = readyRun();
    const p = base.projects[0];
    const solo = marketMultiplierFor(base, p);
    const busy = {
      ...base,
      projects: [
        p,
        { ...p, id: "x1", stage: "airing" as const },
        { ...p, id: "x2", stage: "airing" as const },
      ],
    };
    expect(marketMultiplierFor(busy, p)).toBeLessThan(solo);
    const boosted = { ...base, revBoostUntil: base.week + 10 };
    expect(marketMultiplierFor(boosted, p)).toBeGreaterThan(solo);
  });
});

/* -------------------------------------------------------- commissions */
describe("commission offers", () => {
  const reps = Object.fromEntries(PARTNERS.map((p) => [p.id, REP_START]));

  it("rolls well-formed briefs", () => {
    for (let i = 0; i < 25; i++) {
      const c = rollCommission(10, reps, initMarket());
      const partner = partnerById(c.partnerId);
      expect(partner).toBeTruthy();
      expect(partner.mediums).toContain(c.medium);
      expect(GENRES.some((g) => g.id === c.genre)).toBe(true);
      expect(c.advance).toBeGreaterThan(0);
      expect(c.advance % 5000).toBe(0);
      expect(c.share).toBeGreaterThan(0);
      expect(c.share).toBeLessThan(1);
      expect(c.minQuality).toBeGreaterThanOrEqual(14);
      expect(c.minQuality).toBeLessThanOrEqual(30);
      expect(c.maxWeeks).toBeGreaterThan(0);
      expect(c.expiresWeek).toBe(20);
      expect(typeof c.restriction).toBe("string");
    }
  });

  it("reputation buys better advances and softer shares", () => {
    expect(repAdvanceMult(90)).toBeGreaterThan(repAdvanceMult(45));
    expect(repAdvanceMult(10)).toBeLessThan(repAdvanceMult(45));
    expect(repShareDelta(90)).toBeLessThan(repShareDelta(45));
    expect(repShareDelta(10)).toBeGreaterThan(repShareDelta(45));
    expect(repLabel(90)).not.toBe(repLabel(10));
  });

  it("negotiation odds rise with reputation and cap out", () => {
    expect(negotiationChance(0)).toBeCloseTo(0.25, 5);
    expect(negotiationChance(60)).toBeGreaterThan(negotiationChance(30));
    expect(negotiationChance(100)).toBeLessThanOrEqual(0.8);
  });
});

/* ------------------------------------------------- accepting a brief */
describe("starting a commissioned project", () => {
  it("rejects drafts that break the brief", () => {
    const r = richRun();
    expect(startProject(r, draft({ genres: ["mecha"] }), com())).toBeNull();
    expect(startProject(r, draft({ audience: "adults" }), com())).toBeNull();
    expect(startProject(r, draft(), com({ medium: "movie" }))).toBeNull(); // tv draft vs movie brief
  });

  it("pays the advance up front and binds deadline, share and quality bar", () => {
    const r = richRun({ commissions: [com()] });
    const selfFunded = startProject(r, draft())!;
    const next = startProject(r, draft(), com())!;
    expect(next.cash - selfFunded.cash).toBe(com().advance); // advance lands on top
    const p = next.projects[0];
    expect(p.commission?.partnerId).toBe("ntv8");
    expect(p.commission?.share).toBe(0.5);
    expect(p.deadlineWeek).toBe(r.week + 20);
    expect(next.commissions).toHaveLength(0); // the brief is off the table
  });

  it("lets a broke studio start a funded show", () => {
    const r = richRun({ cash: 10_000 });
    expect(startProject(r, draft())).toBeNull(); // self-funding impossible
    const funded = startProject(r, draft(), com({ advance: 500_000 }))!;
    expect(funded).toBeTruthy();
    expect(funded.cash).toBeGreaterThan(0);
  });

  it("manga adaptations start with bonus hype", () => {
    const r = richRun();
    const base = startProject(r, draft())!.projects[0];
    const hyped = startProject(r, draft(), com({ hypeBonus: 10 }))!.projects[0];
    expect(hyped.hype).toBe(base.hype + 10);
  });
});

/* ---------------------------------------------------------- releases */
describe("releasing under contract", () => {
  it("the partner takes their share; self-funded keeps 100%", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const a = readyRun();
    const self = releaseProject(a, a.projects[0].id, { spent: 0, hype: 50 });
    const base = readyRun({}, com({ minQuality: 39, bonus: 0 }));
    const dealt = releaseProject(base, base.projects[0].id, { spent: 0, hype: 50 })!;
    vi.restoreAllMocks();

    const gross = self!.result.revenue;
    expect(dealt.result.revenue).toBe(gross - Math.round(gross * 0.5));
    expect(dealt.result.breakdown.some((b) => b.label.includes("share"))).toBe(true);
    expect(self!.result.breakdown.some((b) => b.label.includes("share"))).toBe(false);
  });

  it("delivering on brief builds reputation; excellence pays the bonus", () => {
    const base = readyRun({}, com({ minQuality: 0, bonus: 77_000 }));
    const out = releaseProject(base, base.projects[0].id, { spent: 0, hype: 60 })!;
    /* minQuality 0 → always delivered; any score ≥ 6 is excellent */
    const rep = out.run.partners.ntv8;
    if (out.result.total >= 6) {
      expect(rep).toBe(REP_START + REP_DELIVERED + REP_EXCELLENT);
      expect(out.run.cash).toBe(base.cash + 77_000);
    } else {
      expect(rep).toBe(REP_START + REP_DELIVERED);
    }
  });

  it("missing the quality bar or the deadline damages the relationship", () => {
    const missed = readyRun({}, com({ minQuality: 40 }));
    const out = releaseProject(missed, missed.projects[0].id, { spent: 0, hype: 0 })!;
    expect(out.run.partners.ntv8).toBe(REP_START + REP_MISSED_QUALITY);

    const lateBase = readyRun({}, com({ minQuality: 40, maxWeeks: 5 }));
    const late = { ...lateBase, week: lateBase.week + 30 };
    const out2 = releaseProject(late, late.projects[0].id, { spent: 0, hype: 0 })!;
    expect(out2.run.partners.ntv8).toBe(REP_START + REP_MISSED_QUALITY + REP_LATE);
  });

  it("your release floods its own genre", () => {
    const base = readyRun();
    const out = releaseProject(base, base.projects[0].id, { spent: 0, hype: 30 })!;
    const rec = out.run.recentReleases.find((x) => x.genre === "shonen");
    expect(rec).toBeTruthy();
    expect(rec!.weight).toBe(2);
  });
});

/* --------------------------------------------------------- negotiation */
describe("negotiation", () => {
  it("a won haggle sweetens exactly one term, once", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // guaranteed success
    const r = richRun({ commissions: [com({ advance: 200_000 })] });
    const up = negotiateCommission(r, "test_com", "advance")!;
    expect(up.commissions[0].advance).toBe(Math.round((200_000 * NEGOTIATE_ADVANCE_MULT) / 5000) * 5000);
    expect(up.commissions[0].negotiated).toBe(true);
    expect(negotiateCommission(up, "test_com", "share")).toBeNull(); // one shot only

    const r2 = richRun({ commissions: [com({ share: 0.5 })] });
    const down = negotiateCommission(r2, "test_com", "share")!;
    expect(down.commissions[0].share).toBeCloseTo(0.42, 5);
  });

  it("a lost haggle locks the original terms", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const r = richRun({ commissions: [com({ advance: 200_000 })] });
    const out = negotiateCommission(r, "test_com", "advance")!;
    expect(out.commissions[0].advance).toBe(200_000);
    expect(out.commissions[0].negotiated).toBe(true);
  });
});

/* ------------------------------------------------------- market events */
describe("market events", () => {
  const ev = (kind: "emergency" | "bidding" | "adaptation" | "overseas" | "sponsor", over = {}) => ({
    id: "e1",
    kind,
    week: 10,
    expiresWeek: 16,
    text: "t",
    accept: "OK",
    decline: "NO",
    amount: 40_000,
    ...over,
  });

  it("declining simply clears the event", () => {
    const r = richRun({ marketEvents: [ev("overseas")] });
    const out = resolveMarketEvent(r, "e1", false)!;
    expect(out.marketEvents).toHaveLength(0);
    expect(out.cash).toBe(r.cash);
  });

  it("overseas licensing costs cash and boosts revenue for 24 weeks", () => {
    const r = richRun({ marketEvents: [ev("overseas", { amount: 40_000 })] });
    const out = resolveMarketEvent(r, "e1", true)!;
    expect(out.cash).toBe(r.cash - 40_000);
    expect(out.revBoostUntil).toBe(r.week + 24);
  });

  it("a sponsor pays now but hurts the show", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const pid = r.projects[0].id;
    const hype0 = r.projects[0].hype;
    const issues0 = r.projects[0].issues;
    r = { ...r, marketEvents: [ev("sponsor", { amount: 60_000, projectId: pid })] };
    const out = resolveMarketEvent(r, "e1", true)!;
    expect(out.cash).toBe(r.cash + 60_000);
    expect(out.projects[0].hype).toBe(Math.max(0, hype0 - 8));
    expect(out.projects[0].issues).toBe(issues0 + 2);
  });

  it("winning a bidding war trades cash for a 50% share", () => {
    const base = readyRun();
    const pid = base.projects[0].id;
    const r = { ...base, marketEvents: [ev("bidding", { amount: 180_000, projectId: pid, partnerId: "streamline" })] };
    const out = resolveMarketEvent(r, "e1", true)!;
    expect(out.cash).toBe(r.cash + 180_000);
    expect(out.projects[0].commission?.share).toBe(0.5);
  });

  it("emergency and adaptation calls put special briefs on the table", () => {
    const r = richRun({ marketEvents: [ev("emergency", { partnerId: "ntv8" })] });
    const out = resolveMarketEvent(r, "e1", true)!;
    expect(out.commissions).toHaveLength(1);
    expect(out.commissions[0].emergency).toBe(true);

    const r2 = richRun({ marketEvents: [ev("adaptation")] });
    const out2 = resolveMarketEvent(r2, "e1", true)!;
    expect(out2.commissions[0].hypeBonus).toBeGreaterThan(0);
  });
});

/* --------------------------------------------------- weekly lifecycle */
describe("market lifecycle", () => {
  it("tops the commission table back up every ten weeks", () => {
    const r = richRun({ week: 9, commissions: [] });
    const out = advanceWeeks(r, 1); // week 10 hits the refresh
    expect(out.commissions).toHaveLength(3);
    for (const c of out.commissions) expect(c.expiresWeek).toBeGreaterThan(10);
  });

  it("rival premieres flood their genres", () => {
    const r = richRun({ week: 9 });
    const withRival = {
      ...r,
      rivals: [{ studio: "Rival", title: "Big Show", score: 30, week: 10, year: 1, genre: "mecha" as const }],
    };
    const out = advanceWeeks(withRival, 1);
    expect(out.recentReleases.some((x) => x.genre === "mecha" && x.weight === 1)).toBe(true);
  });

  it("expired commissions fall off the table", () => {
    const r = richRun({ week: 30, commissions: [com({ expiresWeek: 30 })] });
    const out = advanceWeeks(r, 1);
    expect(out.commissions.find((c) => c.id === "test_com")).toBeUndefined();
  });

  it("rollRivalShows attaches a genre to future premieres", () => {
    const r = initialRun("S", "steady");
    expect(r.rivals.length).toBeGreaterThan(0);
    for (const rv of r.rivals) expect(rv.genre === undefined || GENRES.some((g) => g.id === rv.genre)).toBe(true);
  });
});

/* ------------------------------------------------------------ economy */
describe("money balance", () => {
  it("splitting attention makes stacking simultaneous releases pay less per show", () => {
    const singles = attentionMult(0);
    const stacked = attentionMult(3);
    expect(stacked).toBeLessThan(singles);
    expect(stacked).toBeGreaterThanOrEqual(0.8);
  });
});

/* ---------------------------------------------------------- save/load */
describe("save/load", () => {
  it("initialises new runs with a market and neutral partner reputations", () => {
    const r = initialRun("S", "steady");
    expect(r.market).toBeTruthy();
    for (const p of PARTNERS) expect(r.partners[p.id]).toBe(REP_START);
    expect(r.commissions).toEqual([]);
    expect(r.marketEvents).toEqual([]);
    expect(r.recentReleases).toEqual([]);
    expect(r.revBoostUntil).toBe(0);
  });

  it("migrates legacy saves without any market fields", () => {
    const legacy = { ...initialRun("Old", "steady") } as Record<string, unknown>;
    delete legacy.market;
    delete legacy.recentReleases;
    delete legacy.partners;
    delete legacy.commissions;
    delete legacy.marketEvents;
    delete legacy.revBoostUntil;
    const r = migrateRun(legacy);
    expect(r.market).toBeTruthy();
    expect(r.partners.ntv8).toBe(REP_START);
    expect(r.commissions).toEqual([]);
    expect(r.revBoostUntil).toBe(0);
  });

  it("keeps earned reputation through migration", () => {
    const saved = { ...initialRun("Old", "steady"), partners: { ntv8: 80 } };
    const r = migrateRun(saved as Record<string, unknown>);
    expect(r.partners.ntv8).toBe(80);
    expect(r.partners.zero).toBe(REP_START); // missing partners refilled
  });
});
