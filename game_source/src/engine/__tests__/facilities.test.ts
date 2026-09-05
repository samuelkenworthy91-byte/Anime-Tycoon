import { afterEach, describe, expect, it, vi } from "vitest";
import type { Draft, Staff } from "../data";
import {
  FACILITY_DEFS,
  facilityDef,
  facilityFX,
  facilityUpkeep,
  fxSpeedFor,
  nextTier,
  slotsUsed,
} from "../facilities";
import { makeProject, teamSpeed, tickProjectsWeek, type Project } from "../projects";
import {
  advanceWeeks,
  applyMilestone,
  assignToProject,
  buyFacility,
  facilityBlockReason,
  initialRun,
  contributionEffectiveSkill,
  migrateRun,
  officeSlots,
  previewResult,
  projectById,
  relocateOffice,
  releaseProject,
  startProject,
  weeklyOutgoings,
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
  ...over,
});

const richRun = (over: Partial<RunState> = {}): RunState => ({
  ...initialRun("Test Studio", "steady"),
  cash: 50_000_000,
  rd: 500,
  officeLevel: 4, // Global Campus: 10 room slots
  staff: [worker("a"), worker("b")],
  ...over,
});

/* ------------------------------------------------------------ building */
describe("building facilities", () => {
  it("builds a room, charging cash and RD and occupying a slot", () => {
    const r0 = richRun();
    const r1 = buyFacility(r0, "writers")!;
    expect(r1).toBeTruthy();
    expect(r1.facilities.writers).toBe(1);
    expect(r0.cash - r1.cash).toBe(facilityDef("writers").tiers[0].cost);
    expect(slotsUsed(r1.facilities)).toBe(1);
  });

  it("charges RD where a tier requires it", () => {
    const r0 = richRun();
    const r1 = buyFacility(r0, "render")!; // render farm needs 10 RD at tier 1
    expect(r0.rd - r1.rd).toBe(facilityDef("render").tiers[0].rd);
  });

  it("blocks with a reason when funds are insufficient", () => {
    const broke = richRun({ cash: 1_000 });
    expect(facilityBlockReason(broke, "writers")).toMatch(/£/);
    expect(buyFacility(broke, "writers")).toBeNull();

    const noRd = richRun({ rd: 0 });
    expect(facilityBlockReason(noRd, "render")).toMatch(/research data/i);
    expect(buyFacility(noRd, "render")).toBeNull();
  });
});

/* ------------------------------------------------------------ capacity */
describe("room capacity", () => {
  it("offices grant 1/3/5/7/10 slots", () => {
    expect([0, 1, 2, 3, 4].map((lvl) => officeSlots(richRun({ officeLevel: lvl })))).toEqual([1, 3, 5, 7, 10]);
  });

  it("cannot build past the slot count — choices matter", () => {
    let r = richRun({ officeLevel: 0 }); // 1 slot
    r = buyFacility(r, "writers")!;
    expect(facilityBlockReason(r, "canteen")).toMatch(/no free rooms/i);
    expect(buyFacility(r, "canteen")).toBeNull();
  });

  it("upgrading an owned room never needs a new slot", () => {
    let r = richRun({ officeLevel: 0 });
    r = buyFacility(r, "writers")!;
    const up = buyFacility(r, "writers");
    expect(up).toBeTruthy();
    expect(up!.facilities.writers).toBe(2);
    expect(slotsUsed(up!.facilities)).toBe(1);
  });

  it("the campus can hold every facility", () => {
    let r = richRun();
    for (const d of FACILITY_DEFS) r = buyFacility(r, d.id)!;
    expect(slotsUsed(r.facilities)).toBe(FACILITY_DEFS.length);
  });
});

/* ------------------------------------------------------------ upgrades */
describe("upgrades", () => {
  it("tiers get increasingly expensive and cap at max", () => {
    let r = richRun();
    const def = facilityDef("writers");
    expect(def.tiers[1].cost).toBeGreaterThan(def.tiers[0].cost * 2);
    expect(def.tiers[2].cost).toBeGreaterThan(def.tiers[1].cost * 2);

    r = buyFacility(r, "writers")!;
    r = buyFacility(r, "writers")!;
    r = buyFacility(r, "writers")!;
    expect(r.facilities.writers).toBe(3);
    expect(nextTier(r.facilities, "writers")).toBeNull();
    expect(buyFacility(r, "writers")).toBeNull();
  });

  it("upkeep scales with tier and lands in weekly outgoings", () => {
    const r0 = richRun();
    const base = weeklyOutgoings(r0);
    const r1 = buyFacility(r0, "merch")!;
    expect(weeklyOutgoings(r1)).toBe(base + facilityDef("merch").tiers[0].upkeep);
    const r2 = buyFacility(r1, "merch")!;
    expect(facilityUpkeep(r2.facilities)).toBeGreaterThan(facilityUpkeep(r1.facilities));
  });
});

/* ------------------------------------------------------------- bonuses */
describe("facility bonuses", () => {
  it("writers' room boosts story production only", () => {
    const fx = facilityFX({ writers: 2 });
    expect(fx.pointMult.story).toBeCloseTo(1.3);
    expect(fx.pointMult.art).toBe(1);
    expect(fx.pointMult.sound).toBe(1);

    const team = [worker("a", { story: 80, stamina: 100 })];
    const base = makeProject(draft(), 0);
    const p = { ...base, staffIds: ["a"] };
    const run = { ...richRun(), staff: team, projects: [p], facilities: {} };
    const plain = contributionEffectiveSkill(run, team[0], "story");
    const boosted = contributionEffectiveSkill({ ...run, facilities: { writers: 2 } }, team[0], "story");
    expect(boosted).toBeGreaterThan(plain);
  });

  it("render farm speeds all projects — blockbusters double", () => {
    const fx = facilityFX({ render: 2 });
    expect(fxSpeedFor(fx, "indie")).toBeCloseTo(0.16);
    expect(fxSpeedFor(fx, "blockbuster")).toBeCloseTo(0.32);
    const p = makeProject(draft(), 0);
    expect(teamSpeed(p, [], fx)).toBeGreaterThan(teamSpeed(p, []));
  });

  it("animation department speeds only the animation stage", () => {
    const fx = facilityFX({ animation: 1 });
    const concept = makeProject(draft(), 0);
    const anim: Project = { ...concept, stage: "animation" };
    expect(teamSpeed(concept, [], fx)).toBeCloseTo(teamSpeed(concept, []));
    expect(teamSpeed(anim, [], fx)).toBeCloseTo(teamSpeed(anim, []) + 0.1);
  });

  it("editing suite strengthens live note-clearing checks and guards sprints", () => {
    const base = makeProject(draft(), 0);
    const editor = worker("edit", { story: 70, art: 70, sound: 70, stamina: 100 });
    const p: Project = { ...base, stage: "post", milestone: "edit", issues: 8, staffIds: [editor.id] };
    const plainRun = { ...richRun(), staff: [editor], projects: [p], facilities: {} };
    const suiteRun = { ...plainRun, facilities: { editing: 2 as const } };
    expect(contributionEffectiveSkill(suiteRun, editor, "art", true)).toBeGreaterThan(
      contributionEffectiveSkill(plainRun, editor, "art", true)
    );

    // sprint issue guard
    let r = richRun();
    r = buyFacility(r, "editing")!;
    r = buyFacility(r, "editing")!;
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = { ...r, projects: r.projects.map((x) => ({ ...x, milestone: "story" as const })) };
    r = applyMilestone(r, id, { points: { story: 0, art: 0, sound: 0 }, issues: 3, spent: 0, rdGained: 0 });
    expect(projectById(r, id)!.issues).toBe(1); // 3 − guard 2
  });

  it("marketing office multiplies hype gains", () => {
    const fx = facilityFX({ marketing: 3 });
    expect(fx.hypeMult).toBeCloseTo(1.8);
    expect(fx.promoDiscount).toBeCloseTo(0.3);
    expect(fx.promoUnlock).toBe(true);
    const base = makeProject(draft(), 0);
    const p: Project = { ...base, stage: "marketing", hype: 0 };
    const plain = tickProjectsWeek([p], [], 1).projects[0];
    const loud = tickProjectsWeek([p], [], 1, fx).projects[0];
    expect(loud.hype).toBeGreaterThan(plain.hype);
  });

  it("canteen improves recovery and softens crunch", () => {
    let r = richRun({ staff: [worker("busy", { stamina: 60 }), worker("idle", { stamina: 60 })] });
    r = startProject(r, draft())!;
    r = assignToProject(r, r.projects[0].id, "busy");
    const plain = advanceWeeks(r, 2);

    let c = buyFacility(r, "canteen")!; // tier 1: rest +4, drain −1
    c = advanceWeeks(c, 2);
    const stam = (run: RunState, id: string) => run.staff.find((s) => s.id === id)!.stamina;
    expect(stam(c, "idle")).toBe(stam(plain, "idle") + 8); // +4/wk × 2
    expect(stam(c, "busy")).toBe(stam(plain, "busy") + 2); // −1 drain/wk × 2
  });

  it("archive room generates weekly RD and multiplies sprint RD", () => {
    const r = richRun();
    const a = buyFacility(r, "archive")!; // tier 1: +1/wk, ×1.25
    const spentRd = facilityDef("archive").tiers[0].rd;
    const after = advanceWeeks(a, 4);
    expect(after.rd).toBe(r.rd - spentRd + 4);

    let withProj = startProject(a, draft())!;
    const id = withProj.projects[0].id;
    withProj = { ...withProj, projects: withProj.projects.map((x) => ({ ...x, milestone: "story" as const })) };
    const rdBefore = withProj.rd;
    const out = applyMilestone(withProj, id, { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 8 });
    expect(out.rd - rdBefore).toBe(10); // 8 × 1.25
  });

  it("training room teaches the sprint's discipline and deepens release gains", () => {
    let r = richRun();
    r = buyFacility(r, "training")!;
    r = buyFacility(r, "training")!; // tier 2: +2
    r = startProject(r, draft())!;
    const id = r.projects[0].id;
    r = assignToProject(r, id, "a");
    const storyBefore = r.staff.find((s) => s.id === "a")!.story;
    r = { ...r, projects: r.projects.map((x) => ({ ...x, milestone: "story" as const })) };
    r = applyMilestone(r, id, { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0 });
    expect(r.staff.find((s) => s.id === "a")!.story).toBe(storyBefore + 2);

    // release: +1 base +2 training
    r = { ...r, projects: r.projects.map((x) => ({ ...x, stage: "ready" as const })) };
    const artBefore = r.staff.find((s) => s.id === "a")!.art;
    const rel = releaseProject(r, id, { spent: 0, hype: 30 })!.run;
    expect(rel.staff.find((s) => s.id === "a")!.art).toBe(artBefore + 3);
  });

  afterEach(() => vi.restoreAllMocks());

  it("merch department raises release revenue with a breakdown line", () => {
    let r = richRun();
    r = startProject(r, draft())!;
    r = {
      ...r,
      projects: r.projects.map((x) => ({ ...x, stage: "ready" as const, points: { story: 80, art: 80, sound: 80 }, hype: 50 })),
    };
    const p = r.projects[0];
    let m = buyFacility(r, "merch")!;
    m = buyFacility(m, "merch")!; // tier 2: +16%
    /* reviews contain random flavour — pin the dice so the two previews match
       (only around the previews: constant randomness would hang rival rolls) */
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const plain = previewResult(r, p);
    const boosted = previewResult(m, p);
    expect(boosted.revenue).toBeGreaterThan(plain.revenue);
    expect(boosted.revenue).toBe(plain.revenue + Math.round(plain.revenue * 0.16));
    expect(boosted.breakdown.some((b) => b.label === "Merch Department")).toBe(true);
  });
});

/* ------------------------------------------------------------ relocation */
describe("relocation", () => {
  it("keeps every facility and upgrade when moving office", () => {
    let r = richRun({ officeLevel: 1, cash: 5_000_000 }); // 3 slots
    r = buyFacility(r, "writers")!;
    r = buyFacility(r, "writers")!;
    r = buyFacility(r, "canteen")!;
    const before = { ...r.facilities };
    const moved = relocateOffice(r)!;
    expect(moved.officeLevel).toBe(2);
    expect(moved.facilities).toEqual(before);
    expect(officeSlots(moved)).toBeGreaterThan(officeSlots(r));
  });

  it("refuses to relocate without the cash", () => {
    expect(relocateOffice(richRun({ officeLevel: 0, cash: 100 }))).toBeNull();
  });
});

/* -------------------------------------------------------------- economy */
describe("economy", () => {
  it("facility upkeep is billed with wages and rent", () => {
    const plain = richRun({ staff: [], projects: [] });
    let built = plain;
    for (const id of ["writers", "render", "merch"] as const) built = buyFacility(built, id)!;
    const spent = plain.cash - built.cash;
    const a = advanceWeeks(plain, 4);
    const b = advanceWeeks(built, 4);
    const upkeep = facilityUpkeep(built.facilities);
    expect(a.cash - (b.cash + spent)).toBe(upkeep * 4);
  });
});

/* ----------------------------------------------------- projects interaction */
describe("interaction with simultaneous projects", () => {
  it("one facility boosts every running project at once", () => {
    let r = richRun({ staff: [worker("a"), worker("b"), worker("c"), worker("d")] });
    r = startProject(r, draft({ title: "One" }))!;
    r = startProject(r, draft({ title: "Two" }))!;
    r = assignToProject(r, r.projects[0].id, "a");
    r = assignToProject(r, r.projects[1].id, "b");

    const boosted = buyFacility(r, "writers")!;
    for (let i = 0; i < 2; i++) {
      const id = r.projects[i].staffIds[0];
      const plainStaff = r.staff.find((s) => s.id === id)!;
      const boostedStaff = boosted.staff.find((s) => s.id === id)!;
      expect(contributionEffectiveSkill(boosted, boostedStaff, "story")).toBeGreaterThan(
        contributionEffectiveSkill(r, plainStaff, "story")
      );
    }
  });
});

/* ----------------------------------------------------------------- saves */
describe("save / load", () => {
  it("facilities survive a JSON round-trip", () => {
    let r = richRun();
    r = buyFacility(r, "writers")!;
    r = buyFacility(r, "writers")!;
    r = buyFacility(r, "archive")!;
    const loaded = migrateRun(JSON.parse(JSON.stringify(r)));
    expect(loaded.facilities).toEqual({ writers: 2, archive: 1 });
    expect(facilityFX(loaded.facilities).pointMult.story).toBeCloseTo(1.3);
  });

  it("legacy saves without facilities migrate to an empty studio", () => {
    const legacy = JSON.parse(JSON.stringify(richRun())) as Record<string, unknown>;
    delete legacy.facilities;
    const r = migrateRun(legacy);
    expect(r.facilities).toEqual({});
    expect(buyFacility(r, "writers")).toBeTruthy();
  });
});
