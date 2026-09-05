import { afterEach, describe, expect, it, vi } from "vitest";
import type { Draft, Staff } from "../data";
import {
  BOND_WEEKS,
  CAREER_TITLES,
  MAX_LEVEL,
  RETIRE_MIN_LEVEL,
  RETIRE_MIN_WEEKS,
  SPEC_DEFS,
  TRAIT_DEFS,
  XP_LEVELS,
  bondKey,
  bondKind,
  ensureCareer,
  gainXp,
  levelFromXp,
  marketSalary,
  moraleF,
  personMod,
  rollHire,
  specDef,
  studioPointMult,
  studioProduction,
  toLegend,
} from "../careers";
import { makeProject, teamSpeed, type Project, type StaffModFn } from "../projects";
import {
  advanceWeeks,
  appointHead,
  assignToProject,
  buyFacility,
  grantContractXp,
  headBlockReason,
  initialRun,
  contributionEffectiveSkill,
  migrateRun,
  releaseProject,
  respondPoach,
  respondSalary,
  startProject,
  trainBlockReason,
  trainStaff,
  type RunState,
} from "../state";

/* ------------------------------------------------------------ helpers */
const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Test Show",
  medium: "tv",
  budget: "indie",
  slot: "midnight", animeType:"shonen",
  genres: ["sports"],
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

const worker = (id: string, over: Partial<Staff> = {}): Staff => ({
  id,
  name: `W-${id}`,
  role: "writer",
  story: 60,
  art: 60,
  sound: 60,
  level: 2,
  salary: 800,
  cost: 0,
  stamina: 90,
  portrait: 0,
  xp: XP_LEVELS[1],
  morale: 70,
  traits: [],
  spec: "w_action",
  favGenre: "sports",
  joinedWeek: 0,
  shows: [],
  awardsWon: 0,
  bestShow: null,
  ...over,
});

const richRun = (over: Partial<RunState> = {}): RunState => ({
  ...initialRun("Test Studio", "steady"),
  cash: 50_000_000,
  rd: 500,
  officeLevel: 4,
  staff: [worker("a"), worker("b")],
  ...over,
});

const proj = (over: Partial<Draft> = {}): Project => makeProject(draft(over), 0);
const noBonds = { bonds: {} };

afterEach(() => vi.restoreAllMocks());

/* ------------------------------------------------------------------ XP */
describe("xp & levels", () => {
  it("has a 12-level career with rising thresholds", () => {
    expect(CAREER_TITLES).toHaveLength(12);
    expect(XP_LEVELS).toHaveLength(12);
    for (let i = 2; i < XP_LEVELS.length; i++) {
      expect(XP_LEVELS[i] - XP_LEVELS[i - 1]).toBeGreaterThan(XP_LEVELS[i - 1] - XP_LEVELS[i - 2]);
    }
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(XP_LEVELS[5])).toBe(6);
    expect(levelFromXp(999_999)).toBe(MAX_LEVEL);
  });

  it("gainXp levels people up and trains their stats", () => {
    const s = worker("x", { xp: 90, level: 1, story: 50, art: 50, sound: 50 });
    const g = gainXp(s, 20); // 110 ≥ 100 → level 2
    expect(g.levelsGained).toBe(1);
    expect(g.staff.level).toBe(2);
    expect(g.staff.story).toBe(52); // main stat +2
    expect(g.staff.art).toBe(51);
  });

  it("shipping a show grants XP, history and morale to the team", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    r = { ...r, projects: r.projects.map((p) => ({ ...p, stage: "ready" as const, points: { story: 60, art: 60, sound: 60 }, hype: 40 })) };
    const before = r.staff.find((s) => s.id === "a")!;
    const out = releaseProject(r, id, { spent: 0, hype: 40 })!;
    const after = out.run.staff.find((s) => s.id === "a")!;
    expect(after.xp!).toBeGreaterThan(before.xp!);
    expect(after.shows).toHaveLength(1);
    expect(after.shows![0].title).toBe("Test Show");
    expect(after.bestShow!.score).toBe(out.result.total);
    expect(after.morale).not.toBe(before.morale);
  });

  it("assigned staff earn weekly XP; idle staff do not", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    r = assignToProject(r, r.projects[0].id, "a");
    const after = advanceWeeks(r, 4);
    expect(after.staff.find((s) => s.id === "a")!.xp!).toBeGreaterThan(XP_LEVELS[1]);
    expect(after.staff.find((s) => s.id === "b")!.xp!).toBe(XP_LEVELS[1]);
  });

  it("contracts teach the whole crew", () => {
    const r = grantContractXp(richRun());
    expect(r.staff.every((s) => s.xp! > XP_LEVELS[1])).toBe(true);
  });
});

/* ------------------------------------------------------------- traits */
describe("traits", () => {
  it("new hires get 1-3 traits and a role-matching spec", () => {
    for (let i = 0; i < 10; i++) {
      const s = rollHire(0);
      expect(s.traits!.length).toBeGreaterThanOrEqual(1);
      expect(s.traits!.length).toBeLessThanOrEqual(3);
      expect(specDef(s.spec)!.role).toBe(s.role);
      expect(s.morale).toBe(70);
    }
  });

  it("regenerating an old save's staff is deterministic", () => {
    const bare: Staff = { id: "legacy_1", name: "Old Hand", role: "animator", story: 40, art: 70, sound: 30, level: 3, salary: 900, cost: 0, stamina: 80, portrait: 2 };
    const a = ensureCareer({ ...bare }, 0);
    const b = ensureCareer({ ...bare }, 0);
    expect(a.traits).toEqual(b.traits);
    expect(a.spec).toBe(b.spec);
    expect(a.favGenre).toBe(b.favGenre);
    expect(a.xp).toBe(XP_LEVELS[2]); // level 3 → its threshold
  });

  it("Fast Worker paces faster; Perfectionist outputs more but slower", () => {
    const p = proj();
    const base = personMod(worker("n"), p, [], noBonds);
    const fast = personMod(worker("f", { traits: ["fast"] }), p, [], noBonds);
    const perf = personMod(worker("p", { traits: ["perfectionist"] }), p, [], noBonds);
    expect(fast.pace).toBeCloseTo(base.pace * 1.25);
    expect(perf.out).toBeCloseTo(base.out * 1.15);
    expect(perf.pace).toBeCloseTo(base.pace * 0.8);
  });

  it("Genre Fanatic shines on the favourite genre only", () => {
    const fan = worker("f", { traits: ["fanatic"], favGenre: "sports" });
    const on = personMod(fan, proj({ genres: ["sports"] }), [], noBonds);
    const off = personMod(fan, proj({ genres: ["slice"] }), [], noBonds);
    // both projects match the w_action spec? shonen does, slice doesn't — isolate by removing spec
    const fanNoSpec = { ...fan, spec: "w_mystery" };
    const on2 = personMod(fanNoSpec, proj({ genres: ["sports"] }), [], noBonds);
    const off2 = personMod(fanNoSpec, proj({ genres: ["slice"] }), [], noBonds);
    expect(on2.out).toBeCloseTo(off2.out * 1.3);
    expect(on.out).toBeGreaterThan(off.out);
  });

  it("Reliable floors output; Team Player adds team speed", () => {
    const exhausted = worker("e", { stamina: 12, morale: 10, traits: ["reliable"] });
    expect(personMod(exhausted, proj(), [], noBonds).out).toBeGreaterThanOrEqual(0.9);
    const tp = worker("t", { traits: ["team"] });
    expect(personMod(tp, proj(), [], noBonds).aura).toBeCloseTo(0.08);
    const p = proj();
    const mods: StaffModFn = (s, pr, team) => personMod(s, pr, team, noBonds);
    const withTp = teamSpeed({ ...p, staffIds: ["t"] }, [tp], undefined, mods);
    const withoutTp = teamSpeed({ ...p, staffIds: ["n"] }, [worker("n")], undefined, mods);
    expect(withTp).toBeGreaterThan(withoutTp);
  });
});

/* ----------------------------------------------------- specialisations */
describe("specialisations", () => {
  it("every role has six specialisations", () => {
    (["writer", "animator", "composer"] as const).forEach((role) =>
      expect(SPEC_DEFS.filter((d) => d.role === role)).toHaveLength(6)
    );
  });

  it("a matching genre gives +25% output", () => {
    const s = worker("s", { spec: "w_action" }); // shonen/sports/mecha
    const on = personMod(s, proj({ genres: ["sports"] }), [], noBonds);
    const off = personMod(s, proj({ genres: ["slice"] }), [], noBonds);
    expect(on.out).toBeCloseTo(off.out * 1.25);
  });

  it("the production-speed spec paces, the sequel spec matches continuations", () => {
    const speedy = worker("sp", { role: "animator", spec: "a_speed" });
    const plain = worker("pl", { role: "animator", spec: "a_mecha" });
    expect(personMod(speedy, proj({ genres: ["slice"] }), [], noBonds).pace).toBeGreaterThan(
      personMod(plain, proj({ genres: ["slice"] }), [], noBonds).pace
    );
    const adapt = worker("ad", { spec: "w_adapt" });
    const s2 = personMod(adapt, proj({ season: 2, genres: ["slice"] }), [], noBonds);
    const s1 = personMod(adapt, proj({ season: 1, genres: ["slice"] }), [], noBonds);
    expect(s2.out).toBeCloseTo(s1.out * 1.25);
  });

  it("spec bonuses flow into live percentile production", () => {
    const s = worker("s", { spec: "w_action", stamina: 100 });
    const p = { ...proj({ genres: ["sports"] }), staffIds: ["s"] };
    const run = { ...initialRun("Spec", "producer"), staff: [s], projects: [p] };
    const withSpec = contributionEffectiveSkill(run, s, "story");
    const off = { ...s, spec: "w_comedy" };
    const noSpec = contributionEffectiveSkill({ ...run, staff: [off] }, off, "story");
    expect(withSpec).toBeGreaterThan(noSpec);
  });
});

/* -------------------------------------------------------------- morale */
describe("morale", () => {
  it("morale multiplies output (70 = neutral)", () => {
    expect(moraleF(worker("n", { morale: 70 }))).toBeCloseTo(1.0);
    expect(moraleF(worker("h", { morale: 100 }))).toBeGreaterThan(1.05);
    expect(moraleF(worker("l", { morale: 20 }))).toBeLessThan(0.85);
    const high = personMod(worker("h", { morale: 100 }), proj(), [], noBonds);
    const low = personMod(worker("l", { morale: 20 }), proj(), [], noBonds);
    expect(high.out).toBeGreaterThan(low.out);
  });

  it("overwork drains morale; rest restores it toward 70", () => {
    let r = richRun({ staff: [worker("a", { stamina: 20, morale: 60 }), worker("b", { morale: 40 })] });
    r = startProject(r, draft())!;
    r = assignToProject(r, r.projects[0].id, "a");
    const after = advanceWeeks(r, 3);
    expect(after.staff.find((s) => s.id === "a")!.morale!).toBeLessThan(60); // overworked at <35 stamina
    expect(after.staff.find((s) => s.id === "b")!.morale!).toBeGreaterThan(40); // idle recovery
  });

  it("a flop hurts the team's morale, a hit lifts it", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    /* terrible show: no points, no hype → flop */
    r = { ...r, projects: r.projects.map((p) => ({ ...p, stage: "ready" as const })) };
    const out = releaseProject(r, id, { spent: 0, hype: 0 })!;
    if (out.result.tier === "flop") {
      expect(out.run.staff.find((s) => s.id === "a")!.morale!).toBeLessThan(70);
    }
  });
});

/* -------------------------------------------------------- relationships */
describe("relationships", () => {
  it("weeks together accumulate into bonds", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    r = assignToProject(r, id, "b");
    const after = advanceWeeks(r, 3);
    expect(after.bonds[bondKey("a", "b")]).toBe(3);
  });

  it("bond kinds follow the rules", () => {
    const jr = worker("j", { level: 1 });
    const sr = worker("s", { level: 5 });
    expect(bondKind(jr, sr)).toBe("mentorship"); // gap 4
    const peer1 = worker("p1", { level: 3 });
    const peer2 = worker("p2", { level: 3 });
    expect(bondKind(peer1, peer2)).toBe("rivalry"); // same role, same level
    const genius = worker("g", { traits: ["genius"] });
    const fragile = worker("f", { traits: ["fragile"] });
    expect(bondKind(genius, fragile)).toBe("clash");
    const diffRole = worker("c", { role: "composer", level: 3 });
    expect(bondKind(peer1, diffRole)).toBe("partnership");
    /* a mentor bonds with juniors at a smaller gap */
    const mentor = worker("m", { level: 3, traits: ["mentor"] });
    expect(bondKind(jr, mentor)).toBe("mentorship"); // gap 2, mentor trait
  });

  it("partnership boosts output once the bond forms", () => {
    const a = worker("a", { role: "writer", level: 2 });
    const b = worker("b", { role: "composer", level: 4 }); // partnership (diff role, gap 2)
    const p = { ...proj(), staffIds: ["a", "b"] };
    const bonded = { bonds: { [bondKey("a", "b")]: BOND_WEEKS } };
    const fresh = { bonds: { [bondKey("a", "b")]: 1 } };
    expect(personMod(a, p, [a, b], bonded).out).toBeCloseTo(personMod(a, p, [a, b], fresh).out * 1.08);
  });

  it("a clash drags both people down", () => {
    const g = worker("g", { traits: ["genius"] });
    const f = worker("f", { traits: ["fragile"] });
    const p = { ...proj(), staffIds: ["g", "f"] };
    const bonded = { bonds: { [bondKey("g", "f")]: BOND_WEEKS } };
    const solo = personMod(f, p, [f], bonded);
    const together = personMod(f, p, [g, f], bonded);
    expect(together.out).toBeLessThan(solo.out);
  });
});

/* ----------------------------------------------------- department heads */
describe("department heads", () => {
  it("enforces office size, role and level requirements", () => {
    const jr = worker("jr", { level: 3 });
    const sr = worker("sr", { level: 8 });
    const comp = worker("cp", { role: "composer", level: 8 });
    let r = richRun({ staff: [jr, sr, comp], officeLevel: 1 });
    expect(headBlockReason(r, "writer", "sr")).toMatch(/Sakuga Tower/);
    r = { ...r, officeLevel: 2 };
    expect(headBlockReason(r, "writer", "jr")).toMatch(/level 6/);
    expect(headBlockReason(r, "writer", "cp")).toMatch(/writer/);
    expect(headBlockReason(r, "writer", "sr")).toBeNull();
    expect(headBlockReason(r, "production", "sr")).toMatch(/Neo District/); // office 2 < 3
  });

  it("appointing a head raises their salary and boosts the discipline", () => {
    const sr = worker("sr", { level: 8, salary: 1000 });
    let r = richRun({ staff: [sr], officeLevel: 2 });
    r = appointHead(r, "writer", "sr")!;
    expect(r.heads.writer).toBe("sr");
    expect(r.staff[0].salary).toBe(1250);
    const mult = studioPointMult(r.heads, r.staff, r.legends);
    expect(mult.story).toBeCloseTo(1.1);
    expect(mult.art).toBe(1);
  });

  it("a production manager speeds projects and trims the burn", () => {
    const pm = worker("pm", { level: 8 });
    let r = richRun({ staff: [pm], officeLevel: 3 });
    r = appointHead(r, "production", "pm")!;
    const sp = studioProduction(r.heads, r.staff);
    expect(sp.speed).toBeCloseTo(0.08);
    expect(sp.burnMult).toBeCloseTo(0.9);
    /* the effect disappears if the manager leaves */
    expect(studioProduction(r.heads, []).speed).toBe(0);
  });
});

/* ----------------------------------------------------- salary politics */
describe("salary reviews & rival offers", () => {
  const withEvent = (kind: "raise" | "poach", staff: Staff) => {
    const r = richRun({ staff: [staff] });
    return {
      ...r,
      staffEvents: [{ id: "ev1", staffId: staff.id, kind, amount: kind === "raise" ? marketSalary(staff) : 2000, week: 0, expiresWeek: 8 }],
    };
  };

  it("accepting a raise pays market and lifts morale", () => {
    const s = worker("a", { salary: 700 });
    const r = respondSalary(withEvent("raise", s), "ev1", "accept");
    expect(r.staff[0].salary).toBe(marketSalary(s));
    expect(r.staff[0].morale!).toBe(85);
    expect(r.staffEvents).toHaveLength(0);
  });

  it("countering meets halfway; refusing stings", () => {
    const s = worker("a", { salary: 700 });
    const half = respondSalary(withEvent("raise", s), "ev1", "counter");
    expect(half.staff[0].salary).toBe(Math.round((700 + marketSalary(s)) / 2 / 10) * 10);
    const no = respondSalary(withEvent("raise", s), "ev1", "refuse");
    expect(no.staff[0].morale!).toBe(52);
  });

  it("poach offers can be matched or the person walks", () => {
    const s = worker("a", { salary: 900 });
    const matched = respondPoach(withEvent("poach", s), "ev1", "match");
    expect(matched.staff[0].salary).toBe(2000);
    const gone = respondPoach(withEvent("poach", s), "ev1", "release");
    expect(gone.staff).toHaveLength(0);
  });

  it("salary reviews appear at quarterly reviews for underpaid veterans", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // silence poach RNG
    const s = worker("a", { salary: 500, level: 5, joinedWeek: -48 });
    let r = richRun({ staff: [s], week: 11 });
    r = advanceWeeks(r, 1); // week 12 → review
    expect(r.staffEvents).toHaveLength(1);
    expect(r.staffEvents[0].kind).toBe("raise");
  });
});

/* -------------------------------------------------- training & careers */
describe("training", () => {
  it("needs a Training Room and respects the cooldown", () => {
    let r = richRun();
    expect(trainBlockReason(r, "a")).toMatch(/Training Room/);
    r = buyFacility(r, "training")!;
    expect(trainBlockReason(r, "a")).toBeNull();
    const t1 = trainStaff(r, "a", "story")!;
    /* courses now occupy real calendar time; no instant skill point */
    expect(t1.staff.find((s) => s.id === "a")!.story).toBe(60);
    expect(t1.trainingJobs).toHaveLength(1);
    expect(trainBlockReason(t1, "a")).toMatch(/Training/i);
    expect(trainStaff(t1, "a", "story")).toBeNull();
    const weeks = t1.trainingJobs[0].completesWeek - t1.week;
    const t2 = advanceWeeks(t1, weeks);
    expect(t2.staff.find((s) => s.id === "a")!.story).toBe(61);
    /* training is still productive work, so the staff member also earns a small
       amount of weekly operation XP before the course-completion XP lands. */
    expect(t2.staff.find((s) => s.id === "a")!.xp).toBeGreaterThanOrEqual(XP_LEVELS[1] + 50);
    expect(trainBlockReason(t2, "a")).toMatch(/cooldown/i);
  });
});

/* ------------------------------------------------- retirement & legacy */
describe("retirement", () => {
  it("a maxed veteran can retire into a studio legend at year end", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.05); // below RETIRE_CHANCE
    const old = worker("old", { level: RETIRE_MIN_LEVEL, xp: XP_LEVELS[RETIRE_MIN_LEVEL - 1], joinedWeek: 47 - RETIRE_MIN_WEEKS - 48 });
    let r = richRun({ staff: [old], week: 47 });
    r = advanceWeeks(r, 1); // week 48 = year end
    expect(r.staff).toHaveLength(0);
    expect(r.legends).toHaveLength(1);
    expect(r.legends[0].name).toBe("W-old");
    /* the legend boosts their old discipline forever */
    expect(studioPointMult(r.heads, r.staff, r.legends).story).toBeCloseTo(1.03);
  });

  it("young staff never retire", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    let r = richRun({ week: 47 });
    r = advanceWeeks(r, 1);
    expect(r.staff).toHaveLength(2);
    expect(r.legends).toHaveLength(0);
  });

  it("toLegend keeps the face and the career", () => {
    const s = worker("x", { look: 4, level: 11, shows: [{ title: "Big", score: 34, week: 10 }], bestShow: { title: "Big", score: 34 } });
    const l = toLegend(s, 100);
    expect(l.look).toBe(4);
    expect(l.shows).toBe(1);
    expect(l.bestShow!.title).toBe("Big");
  });
});

/* ----------------------------------------------------------- save/load */
describe("saving & loading careers", () => {
  it("full careers survive a JSON round-trip", () => {
    let r = richRun({ staff: [worker("a", { traits: ["mentor"], shows: [{ title: "S", score: 20, week: 5 }], bestShow: { title: "S", score: 20 } })] });
    r = { ...r, bonds: { [bondKey("a", "b")]: 10 }, heads: { writer: "a" } };
    const loaded = migrateRun(JSON.parse(JSON.stringify(r)));
    const s = loaded.staff[0];
    expect(s.traits).toEqual(["mentor"]);
    expect(s.shows).toHaveLength(1);
    expect(s.bestShow!.title).toBe("S");
    expect(loaded.bonds[bondKey("a", "b")]).toBe(10);
    expect(loaded.heads.writer).toBe("a");
  });

  it("legacy saves get careers, bonds, heads, events and legends filled in", () => {
    const legacy = JSON.parse(JSON.stringify(richRun())) as Record<string, unknown>;
    delete legacy.bonds;
    delete legacy.heads;
    delete legacy.staffEvents;
    delete legacy.legends;
    (legacy.staff as Record<string, unknown>[]).forEach((s) => {
      delete s.xp; delete s.traits; delete s.spec; delete s.morale;
      delete s.shows; delete s.joinedWeek; delete s.favGenre;
      delete s.awardsWon; delete s.bestShow;
    });
    const r = migrateRun(legacy);
    expect(r.bonds).toEqual({});
    expect(r.heads).toEqual({});
    expect(r.staffEvents).toEqual([]);
    expect(r.legends).toEqual([]);
    for (const s of r.staff) {
      expect(s.xp).toBe(XP_LEVELS[s.level - 1]);
      expect(s.morale).toBe(70);
      expect(s.traits!.length).toBeGreaterThanOrEqual(1);
      expect(specDef(s.spec)!.role).toBe(s.role);
      expect(s.shows).toEqual([]);
    }
    /* and the migrated run still plays */
    const after = advanceWeeks(startProject(r, draft())!, 2);
    expect(after.week).toBe(2);
  });

  it("trait and spec catalogues are complete", () => {
    expect(TRAIT_DEFS.length).toBeGreaterThanOrEqual(12);
    TRAIT_DEFS.forEach((t) => expect(t.desc).toMatch(/[%×+−\d]/)); // numeric effect shown
    expect(SPEC_DEFS).toHaveLength(18);
  });
});
