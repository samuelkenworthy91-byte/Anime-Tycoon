import { describe, expect, it } from "vitest";
import {
  CAREER_WEEKS,
  RIVAL_STUDIOS,
  dateLabel,
  yearOfWeek,
  type Draft,
  type Staff,
  type StaffRole,
} from "../data";
import { MAX_LEVEL, XP_LEVELS, rollHire } from "../careers";
import { createFranchise } from "../franchise";
import {
  advanceWeeks,
  applyMilestone,
  assignToProject,
  initialRun,
  migrateRun,
  releaseProject,
  startProject,
  type HofEntry,
  type RunState,
} from "../state";
import {
  CAREER_RANKS,
  DYNASTY_INVESTMENTS,
  DYNASTY_PATHS,
  NO_DYNASTY,
  beginDynastyMode,
  buyInvestment,
  chooseDynastyPath,
  computeIndustryRecords,
  dynastyDifficulty,
  dynastyFX,
  dynastyYear,
  investmentBlockReason,
  mentorJunior,
  runCareerEvaluation,
} from "../legacy";
import type { LegendRec } from "../careers";

/* ------------------------------------------------------------ helpers */
const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Test Show",
  medium: "tv",
  budget: "standard",
  slot: "prime", animeType:"shonen",
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
  story: 70,
  art: 70,
  sound: 70,
  level: 8,
  salary: 4_000,
  cost: 0,
  stamina: 90,
  portrait: 0,
  xp: XP_LEVELS[7],
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
  staff: [
    worker("a", { role: "writer" }),
    worker("b", { role: "animator" }),
    worker("c", { role: "animator" }),
    worker("d", { role: "composer" }),
    worker("e", { role: "writer" }),
    worker("f", { role: "composer" }),
  ],
  ...over,
});

const legend = (name: string, role: StaffRole): LegendRec => ({
  name,
  role,
  level: 10,
  portrait: 0,
  retiredWeek: 200,
  shows: 18,
  bestShow: null,
});

const hof = (i: number): HofEntry => ({
  title: `Masterpiece ${i}`,
  score: 34,
  genres: ["sports"],
  animeType: "shonen",
  protag: "hero",
  week: i * 48,
});

/* -------------------------------------------------------- evaluation */
describe("career evaluation", () => {
  it("ranks a bare-bones run as a failed studio", () => {
    const ev = runCareerEvaluation(initialRun("Poor Studio", "steady"));
    expect(ev.categories).toHaveLength(9);
    expect(ev.rank.id).toBe("failed");
    expect(ev.total).toBeGreaterThanOrEqual(0);
    expect(ev.total).toBeLessThanOrEqual(ev.max);
    expect(ev.max).toBe(180);
  });

  it("ranks an empire-scale run legendary or better", () => {
    const r: RunState = {
      ...initialRun("Empire Studio", "steady"),
      totalRevenue: 120_000_000,
      fans: 9_000_000,
      awards: 10,
      bestScore: 40,
      hallOfFame: [hof(1), hof(2), hof(3), hof(4), hof(5)],
      legends: [legend("Old Master", "writer"), legend("Ink Sage", "animator")],
      staff: [worker("x", { level: 12, xp: XP_LEVELS[11] }), worker("y", { level: 11, xp: XP_LEVELS[10] })],
    };
    const ev = runCareerEvaluation(r);
    expect(["legendary", "empire"]).toContain(ev.rank.id);
    /* the history assembles without blowing up */
    expect(ev.history.totalShows).toBe(0);
    expect(ev.history.awards).toBe(10);
  });

  it("exposes all six career ranks in order", () => {
    expect(CAREER_RANKS.map((r) => r.id)).toEqual([
      "failed",
      "cult",
      "regular",
      "major",
      "legendary",
      "empire",
    ]);
    expect(CAREER_RANKS.every((r) => r.label && r.color && r.blurb)).toBe(true);
  });
});

/* -------------------------------------------------------- investments */
describe("dynasty investments", () => {
  const dynastyRun = () => beginDynastyMode(richRun({ week: CAREER_WEEKS, cash: 5_000_000_000 }));

  it("requires one permanent strategic path before new capital projects", () => {
    const pre = richRun({ week: CAREER_WEEKS });
    expect(dynastyFX(pre)).toEqual(NO_DYNASTY);
    expect(investmentBlockReason(pre, "secondLot")).toBe("Requires Post-Career Sandbox");

    let r = dynastyRun();
    expect(investmentBlockReason(r, "secondLot")).toBe("Choose a Dynasty strategy first");
    r = chooseDynastyPath(r, "production")!;
    expect(r.dynasty?.path).toBe("production");
    expect(chooseDynastyPath(r, "creative")).toBeNull();
    expect(investmentBlockReason(r, "masterworkCampus")).toContain(DYNASTY_PATHS.creative.name);
  });

  it("makes each strategy powerful in a different direction rather than buying every bonus", () => {
    let production = chooseDynastyPath(dynastyRun(), "production")!;
    production = buyInvestment(production, "secondLot")!;
    production = buyInvestment(production, "megaFarm")!;
    const prodFx = dynastyFX(production);
    expect(prodFx.extraProjects).toBe(1);
    expect(prodFx.extraStaff).toBe(3);
    expect(prodFx.speed).toBeCloseTo(.20);
    expect(prodFx.pointMult).toBeCloseTo(1.05);

    let creative = chooseDynastyPath(dynastyRun(), "creative")!;
    creative = buyInvestment(creative, "masterworkCampus")!;
    creative = buyInvestment(creative, "livingArchive")!;
    const creativeFx = dynastyFX(creative);
    expect(creativeFx.pointMult).toBeCloseTo(1.08);
    expect(creativeFx.rdWeekly).toBe(15);
    expect(creativeFx.fanMult).toBeCloseTo(.08);
    expect(buyInvestment(creative, "secondLot")).toBeNull();
  });

  it("uses empire-scale prices instead of the obsolete £6m–£14m shop", () => {
    expect(DYNASTY_INVESTMENTS).toHaveLength(8);
    for (const d of DYNASTY_INVESTMENTS) {
      expect(d.cost).toBeGreaterThanOrEqual(400_000_000);
      expect(d.path).toBeTruthy();
      expect(d.effects.length).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------------------------------- difficulty */
describe("dynasty difficulty", () => {
  it("is flat at dynasty entry and ramps with the years", () => {
    let r = beginDynastyMode(richRun({ week: CAREER_WEEKS }));
    expect(dynastyYear(r)).toBe(0);
    expect(dynastyDifficulty(r).salaryMult).toBe(1);
    expect(dynastyDifficulty(r).rivalBoost).toBe(0);

    r = { ...r, week: CAREER_WEEKS + 48 * 10 };
    expect(dynastyYear(r)).toBe(10);
    const d = dynastyDifficulty(r);
    expect(d.salaryMult).toBeGreaterThan(1);
    expect(d.expectationBoost).toBeGreaterThan(0);
    expect(d.rivalBoost).toBeGreaterThan(0);
    expect(d.fatigueAdd).toBeGreaterThan(0);
    expect(d.restMult).toBeLessThan(1);
  });

  it("caps every lever so the late game cannot run away", () => {
    const r = { ...beginDynastyMode(richRun({ week: CAREER_WEEKS })), week: CAREER_WEEKS + 48 * 100 };
    const d = dynastyDifficulty(r);
    expect(d.salaryMult).toBeLessThanOrEqual(2.2);
    expect(d.expectationBoost).toBeLessThanOrEqual(10);
    expect(d.rivalBoost).toBeLessThanOrEqual(6);
    expect(d.fatigueAdd).toBeLessThanOrEqual(10);
    expect(d.restMult).toBeGreaterThanOrEqual(0.55);
  });
});

/* -------------------------------------------------------- staff legacy */
describe("legacy mentoring", () => {
  it("a retiring legend mentors the lowest-level same-role junior", () => {
    const senior = worker("s", { role: "writer", level: 9 });
    const junior = worker("j", { role: "writer", level: 2, xp: XP_LEVELS[1] });
    const outsider = worker("o", { role: "animator", level: 5 });
    const res = mentorJunior([senior, junior, outsider], senior);
    expect(res.mentored).toBe(junior.name);
    expect(res.staff.find((s) => s.id === "j")!.xp!).toBeGreaterThan(junior.xp!);
    expect(res.staff.find((s) => s.id === "o")!.xp!).toBe(outsider.xp!);
    expect(res.notice).toContain(junior.name);
  });

  it("does nothing when there is no junior to mentor", () => {
    const senior = worker("s", { role: "writer", level: 9 });
    const res = mentorJunior([senior], senior);
    expect(res.mentored).toBeNull();
    expect(res.notice).toBeNull();
    expect(res.staff).toHaveLength(1);
  });
});

/* -------------------------------------------------------- records */
describe("industry records", () => {
  it("tracks the highest-grossing show across player and rivals", () => {
    let r = beginDynastyMode(richRun({ week: CAREER_WEEKS }));
    const fr = createFranchise(
      "Big",
      draft({ title: "Big" }),
      { protag: "hero", protagName: "Aki", secondary: "rival", secondaryName: "Rin", pet: "none", petName: "", villain: "warlord", villainName: "Vex" },
      { total: 36, revenue: 5_000_000, fans: 100_000, hallOfFame: true },
      100
    );
    fr.entries.push({ kind: "movie", title: "Big: The Movie", score: 38, revenue: 12_000_000, fans: 500_000, week: 200 });
    r = { ...r, franchises: { Big: fr } };

    const recs = computeIndustryRecords(r);
    expect(recs).toHaveLength(5);

    const grossing = recs.find((x) => x.id === "grossing")!;
    expect(grossing.holder).toBe(r.studio);
    expect(grossing.player).toBe(true);
    expect(grossing.value).toBe(12_000_000);
    expect(grossing.title).toBe("Big: The Movie");

    const movie = recs.find((x) => x.id === "movie")!;
    expect(movie.value).toBe(12_000_000);

    const franchise = recs.find((x) => x.id === "franchise")!;
    expect(franchise.value).toBe(2); // original + movie
  });

  it("produces five well-formed records for a fresh studio", () => {
    const recs = computeIndustryRecords(beginDynastyMode(richRun({ week: CAREER_WEEKS })));
    expect(recs.map((r) => r.id)).toEqual(["grossing", "movie", "franchise", "awarded", "fanbase"]);
    for (const r of recs) {
      expect(Number.isFinite(r.value)).toBe(true);
      expect(r.holder.length).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------------------------------- 20+ year sim */
describe("the long haul", () => {
  it("simulates the 25-year campaign plus 12 dynasty years without economy explosions", () => {
    let r = richRun(); // week 0, rich studio

    const resolveMilestones = (n: number) => {
      for (let i = 0; i < n; i++) {
        const waiting = r.projects.find((p) => p.milestone);
        if (!waiting) break;
        r = applyMilestone(r, waiting.id, {
          points: { story: 30, art: 30, sound: 30 },
          issues: 0,
          spent: 5_000,
          rdGained: 3,
        });
      }
    };

    for (let y = 0; y < 37; y++) {
      resolveMilestones(6);

      const ready = r.projects.find((p) => p.stage === "ready");
      if (ready) {
        const out = releaseProject(r, ready.id, { spent: 0, hype: 0 });
        if (out) r = out.run;
      }

      /* long-serving staff retire — keep a living crew through the years */
      if (r.staff.length < 4) r = { ...r, staff: [...r.staff, rollHire(r.week), rollHire(r.week)] };

      const started = startProject(r, draft({ genres: ["sports", "fantasy"], budget: "standard", slot: "prime" }));
      if (started) {
        r = started;
        const pid = r.projects[r.projects.length - 1].id;
        for (const s of r.staff) r = assignToProject(r, pid, s.id);
      }

      /* keep the studio solvent — this sim checks stability, not survival */
      if (r.cash < 10_000_000) r = { ...r, cash: r.cash + 20_000_000 };

      r = advanceWeeks(r, 48);

      /* the campaign ends at year 25; the save endures another 12 years in dynasty mode */
      if (r.week >= CAREER_WEEKS && !r.dynasty) {
        r = beginDynastyMode(r);
        if (r.cash < 2_500_000_000) r = { ...r, cash: 2_500_000_000 };
        r = chooseDynastyPath(r, "production") ?? r;
        r = buyInvestment(r, "secondLot") ?? r;
        r = buyInvestment(r, "megaFarm") ?? r;
      }
    }

    /* ---- calendar & campaign boundary ---- */
    expect(r.week).toBe(37 * 48);
    expect(yearOfWeek(r.week)).toBe(yearOfWeek(CAREER_WEEKS) + 12); // 25 campaign years + 12 dynasty years
    expect(dateLabel(r.week).length).toBeGreaterThan(0);
    expect(r.dynasty).toBeTruthy();
    expect(r.dynasty!.startedWeek).toBe(CAREER_WEEKS);
    expect(dynastyYear(r)).toBe(12); // 12 dynasty years elapsed

    /* ---- no integer / economy explosions ---- */
    for (const n of [r.cash, r.fans, r.rd, r.totalRevenue, r.incomeThisWeek]) {
      expect(Number.isFinite(n)).toBe(true);
    }
    expect(r.fans).toBeGreaterThanOrEqual(0);
    expect(r.rd).toBeGreaterThanOrEqual(0);

    /* ---- staff stay sane ---- */
    expect(r.staff.length).toBeGreaterThan(0);
    for (const s of r.staff) {
      expect(Number.isFinite(s.xp)).toBe(true);
      expect(s.level).toBeGreaterThanOrEqual(1);
      expect(s.level).toBeLessThanOrEqual(MAX_LEVEL);
      expect(s.stamina).toBeGreaterThanOrEqual(0);
    }

    /* ---- rivals remain a living industry ---- */
    expect(r.rivalWorld.studios).toHaveLength(RIVAL_STUDIOS.length);
    for (const s of r.rivalWorld.studios) {
      expect(Number.isFinite(s.fans)).toBe(true);
      expect(Number.isFinite(s.awards)).toBe(true);
      expect(s.status).toBeTruthy();
    }
    expect(r.rivalWorld.studios.some((s) => s.status !== "collapsed")).toBe(true);

    /* ---- records refresh yearly in dynasty ---- */
    expect(r.dynasty!.records).toHaveLength(5);
    for (const rec of r.dynasty!.records) expect(Number.isFinite(rec.value)).toBe(true);

    /* ---- the save round-trips and stays resumable ---- */
    const restored = migrateRun(JSON.parse(JSON.stringify(r)));
    expect(restored.week).toBe(r.week);
    expect(restored.cash).toBe(r.cash);
    expect(restored.dynasty).toBeTruthy();
    expect(restored.dynasty!.records).toHaveLength(5);
    expect(restored.dynasty!.investments.map((i) => i.id)).toEqual(expect.arrayContaining(["secondLot", "megaFarm"]));
  }, 15_000);
});
