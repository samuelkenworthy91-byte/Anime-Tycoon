import { afterEach, describe, expect, it, vi } from "vitest";
import { GENRES, RIVAL_STUDIOS } from "../data";
import {
  computeRankings,
  creditAward,
  creditPoach,
  finalizeYear,
  initRivalWorld,
  planRivalYear,
  rivalTalentAvailable,
  rivalTalentToStaff,
  studioRankScore,
  tickRivalWeek,
  type RivalWorld,
} from "../rivals";
import {
  advanceWeeks,
  hireRivalTalent,
  initialRun,
  migrateRun,
  studioRankings,
  type RunState,
} from "../state";

/* ------------------------------------------------------------ helpers */
const richRun = (over: Partial<RunState> = {}): RunState => ({
  ...initialRun("Test Studio", "steady"),
  cash: 50_000_000,
  rd: 500,
  officeLevel: 4,
  ...over,
});

const playerInput = {
  name: "Test Studio",
  fans: 50_000,
  revenue: 2_000_000,
  masterpieces: 1,
  hits: 4,
  releases: 8,
  awards: 2,
};

afterEach(() => vi.restoreAllMocks());

/* ---------------------------------------------------- world creation */
describe("rival world creation", () => {
  it("creates all six parody studios with distinct personalities", () => {
    const world = initRivalWorld(0);
    expect(world.studios).toHaveLength(RIVAL_STUDIOS.length);
    const personas = new Set(world.studios.map((s) => s.persona));
    expect(personas.size).toBe(6);
    for (const s of world.studios) {
      expect(s.tier).toBeGreaterThanOrEqual(1);
      expect(s.tier).toBeLessThanOrEqual(5);
      expect(s.reputation).toBeGreaterThanOrEqual(0);
      expect(s.reputation).toBeLessThanOrEqual(100);
      expect(s.preferred.length).toBeGreaterThan(0);
      expect(s.specialist.length).toBeGreaterThan(0);
      expect(s.productions.length).toBeGreaterThan(0);
      for (const g of s.preferred) expect(GENRES.some((x) => x.id === g)).toBe(true);
    }
  });

  it("plans productions on the industry calendar within the year", () => {
    const world = initRivalWorld(0);
    for (const s of world.studios) {
      for (const p of s.productions) {
        expect(p.week).toBeGreaterThanOrEqual(0);
        expect(p.week).toBeLessThanOrEqual(48);
        expect(p.score).toBeGreaterThanOrEqual(4);
        expect(p.score).toBeLessThanOrEqual(39);
        expect(p.genres.length).toBeGreaterThan(0);
      }
    }
  });
});

/* ---------------------------------------------------- weekly progress */
describe("rivals progress between years", () => {
  it("premieres shows, records releases, grows franchises", () => {
    const world = initRivalWorld(0);
    const s0 = world.studios[0];
    const prod = {
      id: "test_hit",
      title: "Dragon Bowl Z",
      genres: ["sports" as const],
      animeType: "shonen" as const,
      medium: "tv" as const,
      budget: "blockbuster" as const,
      week: 10,
      year: 1,
      franchiseKey: null as string | null,
      kind: "original" as const,
      score: 34,
    };
    const t = tickRivalWeek({ ...world, studios: [{ ...s0, productions: [prod] }, ...world.studios.slice(1)] }, 10, {
      playerAiringGenres: new Set(),
    });
    const st = t.world.studios[0];
    expect(st.releases).toHaveLength(1);
    expect(st.releases[0].score).toBe(34);
    expect(st.releases[0].hallOfFame).toBe(true);
    expect(st.masterpieces).toBe(1);
    expect(st.hits).toBe(1);
    expect(st.releasesCount).toBe(1);
    expect(st.franchises.some((f) => f.key === "Dragon Bowl Z")).toBe(true);
    /* the premiere floods its genre on the market */
    expect(t.releaseRecords.some((r) => r.genre === "sports" && r.weight === 2)).toBe(true);
    expect(st.revenue).toBeGreaterThan(0);
    expect(st.fans).toBeGreaterThan(0);
  });

  it("a full year advances every studio and re-plans the next slate", () => {
    const r = richRun({ week: 0 });
    const out = advanceWeeks(r, 48);
    expect(out.week).toBe(48);
    const world = out.rivalWorld;
    const totalReleases = world.studios.reduce((a, s) => a + s.releasesCount, 0);
    expect(totalReleases).toBeGreaterThan(0);
    /* next year's slate is already planned */
    const planned = world.studios.reduce((a, s) => a + s.productions.length, 0);
    expect(planned).toBeGreaterThan(0);
    for (const s of world.studios) {
      for (const p of s.productions) expect(p.week).toBeGreaterThan(48);
    }
    /* the ceremony ran and rankings locked in */
    expect(out.awardsCeremony).toBeTruthy();
    expect(out.rivalWorld.playerRank).toBeGreaterThanOrEqual(1);
    expect(out.rivalWorld.playerRank).toBeLessThanOrEqual(7);
  });

  it("moments and reputations stay inside their clamps across years", () => {
    let r = richRun();
    for (let i = 0; i < 3; i++) r = advanceWeeks(r, 48);
    for (const s of r.rivalWorld.studios) {
      expect(s.momentum).toBeGreaterThanOrEqual(-30);
      expect(s.momentum).toBeLessThanOrEqual(30);
      expect(s.reputation).toBeGreaterThanOrEqual(0);
      expect(s.reputation).toBeLessThanOrEqual(100);
      expect(s.avgScore).toBeGreaterThanOrEqual(4);
      expect(s.avgScore).toBeLessThanOrEqual(39);
    }
  });
});

/* ------------------------------------------------------------ rankings */
describe("studio rankings", () => {
  it("scores and orders the player alongside all six rivals", () => {
    const world = initRivalWorld(0);
    const ranked = computeRankings(world, playerInput);
    expect(ranked).toHaveLength(7);
    expect(ranked.some((r) => r.isPlayer)).toBe(true);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
    ranked.forEach((r, i) => expect(r.rank).toBe(i + 1));
  });

  it("finalizeYear locks in prev ranks for movement arrows", () => {
    const world = initRivalWorld(0);
    const fy = finalizeYear(world, playerInput);
    for (const s of fy.world.studios) {
      expect(s.prevRank).toBeGreaterThanOrEqual(1);
      expect(s.rank).toBeGreaterThanOrEqual(1);
    }
    expect(fy.world.playerRank).toBeGreaterThanOrEqual(1);
    expect(fy.world.playerPrevRank).toBeGreaterThanOrEqual(1);
  });

  it("rank scores grow monotonically with each ingredient", () => {
    const base = { fans: 0, revenue: 0, masterpieces: 0, hits: 0, releases: 0, awards: 0 };
    expect(studioRankScore(base)).toBe(0);
    expect(studioRankScore({ ...base, awards: 1 })).toBeGreaterThan(0);
    expect(studioRankScore({ ...base, masterpieces: 1 })).toBeGreaterThan(0);
    expect(studioRankScore({ ...base, revenue: 400 })).toBe(1);
  });
});

/* ---------------------------------------------------- market interaction */
describe("market interaction", () => {
  it("rival premieres flood saturation with weight by budget", () => {
    const world = initRivalWorld(0);
    const s0 = world.studios[0];
    const big = { id: "big", title: "Big", genres: ["mecha" as const], animeType:"shonen" as const, medium: "tv" as const, budget: "blockbuster" as const, week: 5, year: 1, franchiseKey: null as string | null, kind: "original" as const, score: 30 };
    const small = { id: "small", title: "Small", genres: ["mecha" as const], animeType:"shonen" as const, medium: "tv" as const, budget: "indie" as const, week: 5, year: 1, franchiseKey: null as string | null, kind: "original" as const, score: 18 };
    const t = tickRivalWeek({ ...world, studios: [{ ...s0, productions: [big, small] }, ...world.studios.slice(1)] }, 5, { playerAiringGenres: new Set() });
    const mecha = t.releaseRecords.filter((r) => r.genre === "mecha");
    expect(mecha.reduce((a, r) => a + r.weight, 0)).toBe(3); // blockbuster 2 + indie 1
  });

  it("a smash hit can ignite its genre's trend", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // always trigger
    const world = initRivalWorld(0);
    const s0 = world.studios[0];
    const prod = { id: "smash", title: "Smash", genres: ["sports" as const], animeType:"shonen" as const, medium: "tv" as const, budget: "blockbuster" as const, week: 8, year: 1, franchiseKey: null as string | null, kind: "original" as const, score: 36 };
    const t = tickRivalWeek({ ...world, studios: [{ ...s0, productions: [prod] }, ...world.studios.slice(1)] }, 8, { playerAiringGenres: new Set() });
    expect(t.trendShifts.some((s) => s.genre === "sports" && s.delta > 0)).toBe(true);
  });
});

/* --------------------------------------------------------- franchises */
describe("rival franchises", () => {
  it("a warm franchise spawns sequels in later years", () => {
    /* a studio with strong momentum reliably doubles down on its IP */
    vi.spyOn(Math, "random").mockReturnValue(0);
    const world = initRivalWorld(0);
    const s0 = world.studios[0];
    const hit = { id: "h", title: "Neon Saga", genres: ["cyber" as const], animeType:"shonen" as const, medium: "tv" as const, budget: "standard" as const, week: 5, year: 1, franchiseKey: null as string | null, kind: "original" as const, score: 31 };
    const t = tickRivalWorldOnce(world, s0, [hit], 5);
    const st = t.world.studios[0];
    expect(st.franchises.some((f) => f.key === "Neon Saga")).toBe(true);
    /* plan the next year — the franchise should be continued */
    const next = planRivalYear({ ...t.world, studios: [{ ...st, momentum: 20 }, ...t.world.studios.slice(1)] }, 2, 48);
    const sequel = next.world.studios[0].productions.find((p) => p.franchiseKey === "Neon Saga" || p.kind === "season");
    expect(sequel).toBeTruthy();
    expect(next.world.studios[0].productions.length).toBeGreaterThan(0);
  });

  it("a sequel grows the parent franchise's season count", () => {
    const world = initRivalWorld(0);
    const s0 = world.studios[0];
    const seq = { id: "s2", title: "IP 2", genres: ["sports" as const], animeType:"shonen" as const, medium: "tv" as const, budget: "standard" as const, week: 6, year: 1, franchiseKey: "IP", kind: "season" as const, score: 28 };
    const s1 = { ...s0, productions: [seq], franchises: [{ key: "IP", baseTitle: "IP", genres: ["sports" as const], animeType:"shonen" as const, season: 1, popularity: 70, bestScore: 30, lastScore: 30, lastEntryWeek: 1, entries: 1 }] };
    const t = tickRivalWeek({ ...world, studios: [s1, ...world.studios.slice(1)] }, 6, { playerAiringGenres: new Set() });
    const fr = t.world.studios[0].franchises.find((f) => f.key === "IP")!;
    expect(fr.season).toBe(2);
    expect(fr.entries).toBe(2);
  });
});

function tickRivalWorldOnce(world: RivalWorld, s0: ReturnType<typeof initRivalWorld>["studios"][number], productions: Parameters<typeof tickRivalWeek>[0]["studios"][number]["productions"], week: number) {
  return tickRivalWeek({ ...world, studios: [{ ...s0, productions: [...productions] }, ...world.studios.slice(1)] }, week, { playerAiringGenres: new Set() });
}

/* -------------------------------------------------------- staff poaching */
describe("staff poaching & rival talent", () => {
  it("a rival talent converts into a full player staff member", () => {
    const world = initRivalWorld(0);
    const t = rivalTalentAvailable(world, 0)[0];
    expect(t).toBeTruthy();
    const staff = rivalTalentToStaff(t, 0);
    expect(staff.name).toBe(t.name);
    expect(staff.role).toBe(t.role);
    expect(staff.level).toBe(t.level);
    expect(staff.traits).toBeTruthy();
    expect(staff.xp).toBeGreaterThanOrEqual(0);
  });

  it("hireRivalTalent pays the fee, adds staff, and heats the rivalry", () => {
    const r = richRun();
    const t = rivalTalentAvailable(r.rivalWorld, r.week)[0];
    const before = r.rivalWorld.studios.find((s) => s.id === t.studioId)!.rivalry;
    const out = hireRivalTalent(r, t.id)!;
    expect(out).toBeTruthy();
    expect(out.cash).toBe(r.cash - t.cost);
    expect(out.staff.length).toBe(r.staff.length + 1);
    expect(rivalTalentAvailable(out.rivalWorld, r.week).some((x) => x.id === t.id)).toBe(false);
    const after = out.rivalWorld.studios.find((s) => s.id === t.studioId)!.rivalry;
    expect(after).toBeGreaterThan(before);
  });

  it("a successful rival poach strengthens the poaching studio", () => {
    const world = initRivalWorld(0);
    const target = world.studios[1];
    const before = target.momentum;
    const out = creditPoach(world, target.id);
    const after = out.studios.find((s) => s.id === target.id)!;
    expect(after.momentum).toBeGreaterThan(before);
    expect(after.rivalry).toBeGreaterThan(target.rivalry);
  });

  it("award wins lift reputation and momentum", () => {
    const world = initRivalWorld(0);
    const target = world.studios[0];
    const out = creditAward(world, target.id);
    const after = out.studios.find((s) => s.id === target.id)!;
    expect(after.awards).toBe(target.awards + 1);
    expect(after.reputation).toBeGreaterThan(target.reputation);
  });
});

/* ---------------------------------------------------------- save/load */
describe("save/load", () => {
  it("migrateRun preserves a fresh rival world", () => {
    const r = initialRun("S", "steady");
    const migrated = migrateRun({ ...r } as unknown);
    expect(migrated.rivalWorld.studios).toHaveLength(6);
  });

  it("migrates a legacy rivals array into persistent studios", () => {
    const legacy = {
      ...initialRun("Old", "steady"),
      rivals: [{ studio: "Toe-i Animation", title: "Legacy Show", score: 30, week: 20, year: 1, genre: "mecha" }],
    } as unknown as Record<string, unknown>;
    delete legacy.rivalWorld;
    const r = migrateRun(legacy);
    expect(r.rivalWorld.studios).toHaveLength(6);
    const toe = r.rivalWorld.studios.find((s) => s.name === "Toe-i Animation")!;
    expect(toe.productions.some((p) => p.title === "Legacy Show")).toBe(true);
  });

  it("rival talent survives a save/load round trip", () => {
    const r = richRun();
    const t = rivalTalentAvailable(r.rivalWorld, r.week)[0];
    const migrated = migrateRun(JSON.parse(JSON.stringify(r)));
    expect(rivalTalentAvailable(migrated.rivalWorld, migrated.week).some((x) => x.id === t.id)).toBe(true);
  });
});

/* --------------------------------------------------- long simulations */
describe("long simulations", () => {
  it("a full twelve-year career keeps every rival number finite and bounded", () => {
    let r = richRun();
    for (let y = 0; y < 12; y++) r = advanceWeeks(r, 48);
    expect(r.week).toBe(576);
    expect(Number.isFinite(r.cash)).toBe(true);
    for (const s of r.rivalWorld.studios) {
      expect(Number.isFinite(s.revenue)).toBe(true);
      expect(Number.isFinite(s.fans)).toBe(true);
      expect(s.tier).toBeGreaterThanOrEqual(1);
      expect(s.tier).toBeLessThanOrEqual(5);
      expect(s.reputation).toBeGreaterThanOrEqual(0);
      expect(s.reputation).toBeLessThanOrEqual(100);
      expect(s.momentum).toBeGreaterThanOrEqual(-30);
      expect(s.momentum).toBeLessThanOrEqual(30);
      expect(s.avgScore).toBeGreaterThanOrEqual(4);
      expect(s.avgScore).toBeLessThanOrEqual(39);
      expect(s.releases.length).toBeLessThanOrEqual(60);
      expect(s.productions.length).toBeLessThanOrEqual(5);
      for (const fr of s.franchises) {
        expect(fr.popularity).toBeGreaterThanOrEqual(0);
        expect(fr.popularity).toBeLessThanOrEqual(100);
      }
      for (const t of s.talent) {
        expect(t.skill).toBeGreaterThanOrEqual(50);
        expect(t.skill).toBeLessThanOrEqual(96);
      }
    }
    /* rankings remain well-formed */
    const ranked = studioRankings(r);
    expect(ranked).toHaveLength(7);
    for (const e of ranked) expect(Number.isFinite(e.score)).toBe(true);
  });

  it("declining studios restructure, get acquired or collapse without corrupting state", () => {
    /* force every studio into a slump and verify year transitions produce
       valid statuses and never break the world shape */
    const world = initRivalWorld(0);
    const slumped = world.studios.map((s, i) => ({
      ...s,
      momentum: -25,
      slumpYears: 2,
      releases: [
        { title: "Dud", studioId: s.id, studio: s.name, score: 8, week: 1, year: 1, genres: ["comedy" as const], animeType:"shonen" as const, revenue: 10, fans: 10, kind: "original" as const, hallOfFame: false },
        { title: "Dud 2", studioId: s.id, studio: s.name, score: 9, week: 2, year: 1, genres: ["comedy" as const], animeType:"shonen" as const, revenue: 10, fans: 10, kind: "original" as const, hallOfFame: false },
      ],
      _i: i,
    }));
    const res = planRivalYear({ ...world, studios: slumped }, 2, 48);
    for (const s of res.world.studios) {
      expect(["active", "restructuring", "acquired", "collapsed", "revived"]).toContain(s.status);
      expect(s.tier).toBeGreaterThanOrEqual(1);
      expect(s.tier).toBeLessThanOrEqual(5);
    }
  });
});
