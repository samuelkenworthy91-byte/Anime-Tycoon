import { afterEach, describe, expect, it, vi } from "vitest";
import type { Draft } from "../data";
import {
  CONTINUATIONS,
  CULT_CHANCE,
  MERCH_COOLDOWN,
  MERCH_PRODUCTS,
  continuationBlock,
  continuationDef,
  createFranchise,
  expectedScore,
  filmsOf,
  franchiseBoost,
  judgeExpectations,
  merchBlock,
  merchProductById,
  merchReturn,
  merchValueOf,
  migrateFranchise,
  recordContinuation,
  seasonsOf,
  spinoffsOf,
  tickFranchise,
  topCharacter,
  type Franchise,
} from "../franchise";
import {
  advanceWeeks,
  initialRun,
  launchMerch,
  migrateRun,
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

const seed = {
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  secondaryName: "Riko",
  pet: "",
  petName: "",
  villain: "warlord",
  villainName: "Gharn",
};

const res = (total: number, over: Partial<{ revenue: number; fans: number; hallOfFame: boolean }> = {}) => ({
  total,
  revenue: 500_000,
  fans: 40_000,
  hallOfFame: total >= 32,
  ...over,
});

const mkFr = (over: Partial<Franchise> = {}): Franchise => ({
  ...createFranchise("IP", draft({ title: "IP" }), seed, res(28), 10),
  ...over,
});

const richRun = (over: Partial<RunState> = {}): RunState => ({
  ...initialRun("Test Studio", "steady"),
  cash: 50_000_000,
  rd: 500,
  officeLevel: 4,
  ...over,
});

/** a run holding one ready-to-release project */
const readyRun = (d: Draft, over: Partial<RunState> = {}): RunState => {
  let r = richRun(over);
  r = startProject(r, d)!;
  return { ...r, projects: r.projects.map((p) => ({ ...p, stage: "ready" as const })) };
};

afterEach(() => vi.restoreAllMocks());

/* ---------------------------------------------------- franchise creation */
describe("franchise creation", () => {
  it("every original release creates a full IP record", () => {
    const r = readyRun(draft({ title: "Neon Drift" }));
    const out = releaseProject(r, r.projects[0].id, { spent: 0, hype: 40 })!;
    const fr = out.run.franchises["Neon Drift"];
    expect(fr).toBeTruthy();
    expect(fr.baseTitle).toBe("Neon Drift");
    expect(fr.genres).toEqual(["shonen"]);
    expect(fr.entries).toHaveLength(1);
    expect(fr.entries[0].kind).toBe("original");
    expect(fr.entries[0].score).toBe(out.result.total);
    expect(fr.totalRevenue).toBe(out.result.revenue);
    expect(fr.season).toBe(1);
    expect(fr.fatigue).toBe(10);
    expect(fr.popularity).toBeGreaterThan(0);
    expect(fr.cast.length).toBeGreaterThanOrEqual(3); // no pet in this draft
    expect(fr.merchValue).toBeGreaterThan(0);
  });

  it("cast popularity scales with the debut's quality", () => {
    const good = createFranchise("A", draft(), seed, res(36), 0);
    const bad = createFranchise("B", draft(), seed, res(10), 0);
    const avg = (f: Franchise) => f.cast.reduce((a, c) => a + c.popularity, 0) / f.cast.length;
    expect(avg(good)).toBeGreaterThan(avg(bad));
    expect(topCharacter(good)).toBeTruthy();
  });
});

/* -------------------------------------------------------------- sequels */
describe("sequels & continuation types", () => {
  it("every continuation type has distinct costs and pressures", () => {
    expect(CONTINUATIONS).toHaveLength(8);
    const movie = continuationDef("movie")!;
    const ova = continuationDef("ova")!;
    expect(movie.expectMult).toBeGreaterThan(ova.expectMult);
    expect(movie.revMult).toBeGreaterThan(ova.revMult);
    expect(continuationDef("crossover")!.fee).toBeGreaterThan(continuationDef("reboot")!.fee);
  });

  it("a released season joins the timeline and tires the IP", () => {
    const fr = mkFr();
    const r = readyRun(draft({ title: "IP S2", franchiseKey: "IP", continuation: "season", season: 2 }), {
      franchises: { IP: fr },
    });
    const out = releaseProject(r, r.projects[0].id, { spent: 0, hype: 40 })!;
    const next = out.run.franchises.IP;
    expect(next.entries).toHaveLength(2);
    expect(next.entries[1].kind).toBe("season");
    expect(next.season).toBe(2);
    expect(seasonsOf(next)).toBe(2);
    expect(next.fatigue).toBeGreaterThanOrEqual(fr.fatigue + 16 - 1);
    expect(next.totalRevenue).toBe(fr.totalRevenue + out.result.revenue);
  });

  it("films and spin-offs are tallied separately", () => {
    let fr = mkFr();
    fr = recordContinuation(fr, draft({ franchiseKey: "IP", continuation: "movie" }), res(27), 30).franchise;
    fr = recordContinuation(fr, draft({ franchiseKey: "IP", continuation: "spinoff" }), res(25), 60).franchise;
    expect(filmsOf(fr)).toBe(1);
    expect(spinoffsOf(fr)).toBe(1);
    expect(seasonsOf(fr)).toBe(1);
  });

  it("the continuation fee is charged at greenlight", () => {
    const fr = mkFr();
    const base = richRun({ franchises: { IP: fr } });
    const plain = startProject(base, draft({ franchiseKey: "IP", continuation: "season", season: 2 }))!;
    const feed = startProject(base, draft({ franchiseKey: "IP", continuation: "prequel" }))!;
    expect(plain.cash - feed.cash).toBe(continuationDef("prequel")!.fee);
  });

  it("continuations without a real IP are rejected", () => {
    const r = richRun();
    expect(startProject(r, draft({ franchiseKey: "Ghost IP", continuation: "season", season: 2 }))).toBeNull();
  });
});

/* ------------------------------------------------------ fan expectations */
describe("fan expectations", () => {
  it("expectations inherit from previous entries and scale by format", () => {
    const master = mkFr({ lastScore: 36, bestScore: 36 });
    expect(expectedScore(master, "season")).toBe(36);
    expect(expectedScore(master, "ova")).toBeLessThan(30); // fans forgive OVAs
    expect(expectedScore(master, "movie")).toBeGreaterThanOrEqual(36);
  });

  it("a masterpiece followed by a dud disappoints far more than average-follows-average", () => {
    const master = mkFr({ lastScore: 36, bestScore: 36 });
    const average = mkFr({ lastScore: 22, bestScore: 22 });
    const betrayal = judgeExpectations(master, "season", 20);
    const shrug = judgeExpectations(average, "season", 22);
    expect(betrayal.verdict).toBe("disappointment");
    expect(shrug.verdict).toBe("fine");
    expect(betrayal.popDelta).toBeLessThan(-20);
    expect(shrug.popDelta).toBeGreaterThan(0);
    expect(betrayal.fanMult).toBeLessThan(1);
  });

  it("beating expectations delights the fandom", () => {
    const humble = mkFr({ lastScore: 18, bestScore: 20 });
    const v = judgeExpectations(humble, "season", 30);
    expect(v.verdict).toBe("delight");
    expect(v.popDelta).toBeGreaterThanOrEqual(10);
    expect(v.fanMult).toBeGreaterThan(1);
  });

  it("a failed sequel costs fans on release day and scars the timeline", () => {
    const proud = mkFr({ lastScore: 38, bestScore: 38, popularity: 80 });
    const r = readyRun(draft({ title: "IP S2", franchiseKey: "IP", continuation: "season", season: 2 }), {
      franchises: { IP: proud },
    });
    /* hype 0 + indie budget keeps the score well below 38's expectations */
    const out = releaseProject(r, r.projects[0].id, { spent: 0, hype: 0 })!;
    if (out.result.total < 34) {
      expect(out.run.franchises.IP.popularity).toBeLessThan(80);
      expect(out.run.franchises.IP.entries[1].disappointment).toBe(true);
      expect(out.result.breakdown.some((b) => b.label.startsWith("Fans expected"))).toBe(true);
    }
  });
});

/* ------------------------------------------------------------- fatigue */
describe("franchise fatigue", () => {
  it("rest heals fatigue faster than back-to-back production", () => {
    const tired = mkFr({ fatigue: 60, lastEntryWeek: 0 });
    const rested = tickFranchise(tired, 20); // 20 weeks of rest
    const busy = tickFranchise({ ...tired, lastEntryWeek: 16 }, 20);
    expect(rested.franchise.fatigue).toBe(57);
    expect(busy.franchise.fatigue).toBe(59);
  });

  it("fatigue drags the revenue multiplier down; rest restores it", () => {
    const fresh = mkFr({ fatigue: 0, popularity: 60 });
    const burnt = mkFr({ fatigue: 90, popularity: 60 });
    const d = draft({ franchiseKey: "IP", continuation: "season", season: 2 });
    expect(franchiseBoost(burnt, d)).toBeLessThan(franchiseBoost(fresh, d));
  });

  it("fatigue recovers through advanceWeeks", () => {
    const r = richRun({ week: 100, franchises: { IP: mkFr({ fatigue: 50, lastEntryWeek: 40 }) } });
    const out = advanceWeeks(r, 12);
    expect(out.franchises.IP.fatigue).toBeLessThan(50);
  });
});

/* ---------------------------------------------------------- cult growth */
describe("cult growth", () => {
  it("an overlooked show can quietly become a cult classic", () => {
    vi.spyOn(Math, "random").mockReturnValue(CULT_CHANCE / 2);
    const sleeper = mkFr({ bestScore: 22, lastScore: 22, popularity: 20, lastEntryWeek: 0 });
    const t = tickFranchise(sleeper, 48); // week divisible by 12, long dormant
    expect(t.franchise.cult).toBe(true);
    expect(t.franchise.popularity).toBeGreaterThanOrEqual(55);
    expect(t.notice).toContain("cult");
  });

  it("acclaimed or recently active shows do not get cults", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const acclaimed = mkFr({ bestScore: 34, popularity: 20, lastEntryWeek: 0 });
    expect(tickFranchise(acclaimed, 48).franchise.cult).toBe(false);
    const active = mkFr({ bestScore: 20, popularity: 20, lastEntryWeek: 40 });
    expect(tickFranchise(active, 48).franchise.cult).toBe(false);
  });

  it("cult status props up popularity and boosts merch value", () => {
    const plain = mkFr({ popularity: 46, bestScore: 22 });
    const cult = { ...plain, cult: true };
    expect(tickFranchise(cult, 5).franchise.popularity).toBeGreaterThanOrEqual(45);
    expect(merchValueOf(cult)).toBeGreaterThan(merchValueOf(plain));
  });
});

/* ------------------------------------------------- character popularity */
describe("character popularity", () => {
  it("good entries lift the cast, disasters drag them down", () => {
    const fr = mkFr({ lastScore: 20, bestScore: 20 });
    const before = fr.cast[0].popularity;
    const up = recordContinuation(fr, draft({ franchiseKey: "IP", continuation: "season" }), res(32), 30).franchise;
    expect(up.cast[0].popularity).toBe(Math.min(100, before + 8));
    const proud = mkFr({ lastScore: 38, bestScore: 38 });
    const down = recordContinuation(proud, draft({ franchiseKey: "IP", continuation: "season" }), res(14), 30).franchise;
    expect(down.cast[0].popularity).toBe(Math.max(0, proud.cast[0].popularity - 6));
  });

  it("popular characters raise merch returns", () => {
    const meh = mkFr({ cast: mkFr().cast.map((c) => ({ ...c, popularity: 10 })) });
    const star = mkFr({ cast: mkFr().cast.map((c) => ({ ...c, popularity: 95 })) });
    const figures = merchProductById("figures")!;
    expect(merchReturn(star, figures)).toBeGreaterThan(merchReturn(meh, figures));
  });

  it("spin-offs demand a 45+ popularity character", () => {
    const noStars = mkFr({ cast: mkFr().cast.map((c) => ({ ...c, popularity: 30 })) });
    expect(continuationBlock(noStars, "spinoff", { week: 50, franchiseCount: 1, officeLevel: 4 })).toBeTruthy();
    const withStar = mkFr({ cast: mkFr().cast.map((c) => ({ ...c, popularity: 70 })) });
    expect(continuationBlock(withStar, "spinoff", { week: 50, franchiseCount: 1, officeLevel: 4 })).toBeNull();
  });

  it("a spin-off release founds a new IP carrying the star's fame", () => {
    const parent = mkFr({ cast: mkFr().cast.map((c) => ({ ...c, popularity: 80 })) });
    const star = parent.cast[0];
    const d = draft({
      title: "Star Solo",
      franchiseKey: "IP",
      continuation: "spinoff",
      spinChar: star.id,
      protag: star.id,
      protagName: star.name,
    });
    const r = readyRun(d, { franchises: { IP: parent } });
    const out = releaseProject(r, r.projects[0].id, { spent: 0, hype: 30 })!;
    const spin = out.run.franchises["Star Solo"];
    expect(spin).toBeTruthy();
    expect(spin.spunFrom).toBe("IP");
    expect(spin.cast.find((c) => c.id === star.id)!.popularity).toBeGreaterThanOrEqual(80);
    expect(spinoffsOf(out.run.franchises.IP)).toBe(1);
  });
});

/* -------------------------------------------------------- merchandising */
describe("merchandising", () => {
  it("offers six product lines with rising demands", () => {
    expect(MERCH_PRODUCTS).toHaveLength(6);
    expect(merchProductById("mobile")!.minPop).toBeGreaterThan(merchProductById("plush")!.minPop);
    expect(merchProductById("collectors")!.minScore).toBeGreaterThan(0);
  });

  it("launching a line costs cash now and schedules royalties", () => {
    const fr = mkFr({ popularity: 70, lifetimeFans: 300_000 });
    const r = richRun({ franchises: { IP: fr } });
    const out = launchMerch(r, "IP", "figures")!;
    const product = merchProductById("figures")!;
    expect(out.cash).toBe(r.cash - product.cost);
    const rows = out.payouts.filter((p) => p.label.includes("Scale Figures"));
    expect(rows).toHaveLength(product.weeks);
    expect(rows.reduce((a, p) => a + p.amount, 0)).toBe(merchReturn(fr, product));
    expect(out.franchises.IP.merchCooldown.figures).toBe(r.week + MERCH_COOLDOWN);
  });

  it("the same line cannot be spammed before its cooldown", () => {
    const fr = mkFr({ popularity: 70 });
    let r = richRun({ franchises: { IP: fr } });
    r = launchMerch(r, "IP", "plush")!;
    expect(launchMerch(r, "IP", "plush")).toBeNull();
    expect(launchMerch(r, "IP", "ost")).toBeTruthy(); // other lines unaffected
  });

  it("cold or unproven IPs cannot carry premium products", () => {
    const cold = mkFr({ popularity: 10, bestScore: 20 });
    expect(merchBlock(cold, merchProductById("mobile")!, 10, 10_000_000)).toBeTruthy();
    expect(merchBlock(cold, merchProductById("collectors")!, 10, 10_000_000)).toBeTruthy();
    expect(merchBlock(cold, merchProductById("ost")!, 10, 10_000_000)).toBeNull();
  });
});

/* ------------------------------------------------------ revenue & boost */
describe("franchise revenue", () => {
  it("popularity sells and the boost stays within clamps", () => {
    const hot = mkFr({ popularity: 95, fatigue: 0 });
    const cold = mkFr({ popularity: 5, fatigue: 0 });
    const d = draft({ franchiseKey: "IP", continuation: "season", season: 2 });
    expect(franchiseBoost(hot, d)).toBeGreaterThan(franchiseBoost(cold, d));
    expect(franchiseBoost(hot, draft({ franchiseKey: "IP", continuation: "crossover", crossKey: "B" }), hot)).toBeLessThanOrEqual(3);
    expect(franchiseBoost(cold, draft({ franchiseKey: "IP", continuation: "ova" }))).toBeGreaterThanOrEqual(0.5);
  });

  it("crossovers outsell OVAs for the same IP", () => {
    const fr = mkFr({ popularity: 70, fatigue: 10 });
    const partner = mkFr({ popularity: 70 });
    const cross = franchiseBoost(fr, draft({ franchiseKey: "IP", continuation: "crossover", crossKey: "B" }), partner);
    const ova = franchiseBoost(fr, draft({ franchiseKey: "IP", continuation: "ova" }));
    expect(cross).toBeGreaterThan(ova);
  });

  it("drafts without a continuation still use the legacy season bonus", () => {
    expect(franchiseBoost(null, draft({ franchiseKey: "IP", season: 3 }))).toBeCloseTo(1.24, 5);
    expect(franchiseBoost(null, draft())).toBe(1);
  });
});

/* --------------------------------------------------- reboots & revivals */
describe("reboots & revival", () => {
  it("reboots need a tired or dormant IP", () => {
    const freshIp = mkFr({ fatigue: 10, lastEntryWeek: 40 });
    expect(continuationBlock(freshIp, "reboot", { week: 50, franchiseCount: 1, officeLevel: 4 })).toBeTruthy();
    const tired = recordContinuation(mkFr({ fatigue: 60 }), draft({ franchiseKey: "IP", continuation: "season" }), res(22), 20).franchise;
    expect(continuationBlock({ ...tired, fatigue: 60 }, "reboot", { week: 50, franchiseCount: 1, officeLevel: 4 })).toBeNull();
  });

  it("a reboot resets fatigue and reignites popularity", () => {
    let fr = mkFr({ fatigue: 70, popularity: 20 });
    fr = recordContinuation(fr, draft({ franchiseKey: "IP", continuation: "season" }), res(20), 20).franchise;
    const rebooted = recordContinuation(
      { ...fr, fatigue: 70, popularity: 20 },
      draft({ franchiseKey: "IP", continuation: "reboot", season: 3 }),
      res(30),
      120
    ).franchise;
    expect(rebooted.fatigue).toBe(12);
    expect(rebooted.popularity).toBeGreaterThanOrEqual(60);
  });
});

/* ------------------------------------------------------------ crossovers */
describe("crossovers", () => {
  it("need two IPs, studio scale, and warmth", () => {
    const fr = mkFr({ popularity: 60 });
    expect(continuationBlock(fr, "crossover", { week: 50, franchiseCount: 1, officeLevel: 4 })).toBeTruthy();
    expect(continuationBlock(fr, "crossover", { week: 50, franchiseCount: 2, officeLevel: 1 })).toBeTruthy();
    expect(continuationBlock(mkFr({ popularity: 10 }), "crossover", { week: 50, franchiseCount: 2, officeLevel: 4 })).toBeTruthy();
    expect(continuationBlock(fr, "crossover", { week: 50, franchiseCount: 2, officeLevel: 4 })).toBeNull();
  });

  it("greenlighting demands a valid partner IP", () => {
    const a = mkFr({ popularity: 60 });
    const b = { ...mkFr({ popularity: 60 }), key: "B", baseTitle: "B" };
    const r = richRun({ franchises: { IP: a, B: b } });
    const d = draft({ franchiseKey: "IP", continuation: "crossover", season: 1 });
    expect(startProject(r, d)).toBeNull(); // no partner chosen
    expect(startProject(r, { ...d, crossKey: "IP" })).toBeNull(); // can't cross with itself
    expect(startProject(r, { ...d, crossKey: "B" })).toBeTruthy();
  });

  it("release marks BOTH timelines and tires both IPs", () => {
    const a = mkFr({ popularity: 60 });
    const b = { ...mkFr({ popularity: 60 }), key: "B", baseTitle: "B" };
    const d = draft({ title: "IP × B", franchiseKey: "IP", continuation: "crossover", crossKey: "B", season: 1 });
    const r = readyRun(d, { franchises: { IP: a, B: b } });
    const out = releaseProject(r, r.projects[0].id, { spent: 0, hype: 40 })!;
    expect(out.run.franchises.IP.entries.some((e) => e.kind === "crossover")).toBe(true);
    expect(out.run.franchises.B.entries.some((e) => e.kind === "crossover")).toBe(true);
    expect(out.run.franchises.B.fatigue).toBe(b.fatigue + 14);
  });
});

/* ---------------------------------------------------- licensing events */
describe("licensing events", () => {
  it("a game licence pays cash but wears the brand", () => {
    const fr = mkFr({ popularity: 70, fatigue: 20 });
    const r = richRun({
      franchises: { IP: fr },
      marketEvents: [
        { id: "e1", kind: "gamelicence" as const, week: 10, expiresWeek: 15, text: "t", accept: "OK", decline: "NO", amount: 200_000, franchiseKey: "IP" },
      ],
    });
    const out = resolveMarketEvent(r, "e1", true)!;
    expect(out.cash).toBe(r.cash + 200_000);
    expect(out.franchises.IP.fatigue).toBe(28);
    expect(out.franchises.IP.popularity).toBe(74);
  });

  it("a collaboration campaign trades fatigue for popularity", () => {
    const fr = mkFr({ popularity: 60, fatigue: 10 });
    const r = richRun({
      franchises: { IP: fr },
      marketEvents: [
        { id: "e1", kind: "collab" as const, week: 10, expiresWeek: 15, text: "t", accept: "OK", decline: "NO", amount: 90_000, franchiseKey: "IP" },
      ],
    });
    const out = resolveMarketEvent(r, "e1", true)!;
    expect(out.cash).toBe(r.cash + 90_000);
    expect(out.franchises.IP.popularity).toBe(68);
    expect(out.franchises.IP.fatigue).toBe(16);
  });
});

/* ------------------------------------------------------------ save/load */
describe("save/load", () => {
  it("upgrades a legacy franchise record to a full IP profile", () => {
    const fr = migrateFranchise("Old Hit", { baseTitle: "Old Hit", season: 3, lastScore: 31, alive: true }, 200);
    expect(fr.baseTitle).toBe("Old Hit");
    expect(fr.season).toBe(3);
    expect(fr.entries).toHaveLength(3);
    expect(fr.entries[0].kind).toBe("original");
    expect(fr.lastScore).toBe(31);
    expect(fr.bestScore).toBe(31);
    expect(fr.popularity).toBeGreaterThan(0);
    expect(fr.merchValue).toBeGreaterThan(0);
    expect(fr.merchCooldown).toEqual({});
  });

  it("migrateRun upgrades every stored franchise", () => {
    const legacy = {
      ...initialRun("Old", "steady"),
      franchises: { "Old Hit": { baseTitle: "Old Hit", season: 2, lastScore: 28, alive: false } },
    };
    const r = migrateRun(legacy as unknown);
    expect(r.franchises["Old Hit"].entries).toHaveLength(2);
    expect(seasonsOf(r.franchises["Old Hit"])).toBe(2);
  });

  it("new-shape franchises survive migration untouched", () => {
    const fr = mkFr({ popularity: 77, cult: true });
    const saved = { ...initialRun("S", "steady"), franchises: { IP: fr } };
    const r = migrateRun(saved as unknown);
    expect(r.franchises.IP.popularity).toBe(77);
    expect(r.franchises.IP.cult).toBe(true);
    expect(r.franchises.IP.entries).toHaveLength(1);
  });
});
