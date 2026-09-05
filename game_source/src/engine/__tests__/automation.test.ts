import { describe, expect, it } from "vitest";
import type { Draft, Staff } from "../data";
import { makeProject, applyMilestoneOutcome, type Project } from "../projects";
import { facilityFX } from "../facilities";
import {
  AUTO_MIN_OFFICE,
  autoSprintOutcome,
  crisisOf,
  delegationBlockReason,
  resumeAuto,
  setDelegation,
  sprintQuality,
  takeOver,
  tickDelegated,
} from "../automation";
import { initialRun, type RunState } from "../state";

const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Auto Show",
  medium: "tv",
  budget: "standard",
  slot: "evening", animeType:"shonen",
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
  art: 40,
  sound: 40,
  level: 6,
  salary: 1_000,
  cost: 0,
  stamina: 90,
  portrait: 0,
  morale: 70,
  ...over,
});

const run = (over: Partial<RunState> = {}): RunState => ({
  ...initialRun("Test Studio", "steady"),
  cash: 1_000_000,
  officeLevel: 2,
  staff: [
    worker("a", { role: "writer", story: 90 }),
    worker("b", { role: "animator", art: 90 }),
    worker("c", { role: "composer", sound: 70 }),
  ],
  heads: { writer: "a", animator: "b", composer: "c" },
  ...over,
});

const proj = (over: Partial<Project> = {}, staffIds: string[] = ["a", "b", "c"]): Project => ({
  ...makeProject(draft(), 0),
  staffIds,
  ...over,
});

/* ------------------------------------------------------------ gating */
describe("delegation gating", () => {
  it("requires a Sakuga Tower or bigger office", () => {
    const r = run({ officeLevel: 1 });
    const p = proj();
    expect(delegationBlockReason(r, p)).toMatch(/sakuga tower/i);
    expect(setDelegation(r, p.id, "writer")).toBeNull();
  });

  it("delegates to a named head and records the notice", () => {
    const p = proj();
    const r = run({ projects: [p] });
    const out = setDelegation(r, p.id, "writer")!;
    const np = out.projects.find((x) => x.id === p.id)!;
    expect(np.auto).toEqual({ headSlot: "writer", startedWeek: r.week, intervention: false });
    expect(out.notices.some((n) => /head writer/i.test(n))).toBe(true);
  });

  it("team-led delegation is allowed (headSlot null)", () => {
    const p = proj();
    const r = run({ projects: [p] });
    const out = setDelegation(r, p.id, null)!;
    expect(out.projects.find((x) => x.id === p.id)!.auto?.headSlot).toBeNull();
  });
});

/* ----------------------------------------------------------- quality */
describe("sprint quality", () => {
  it("scales with the delegated head's own skill", () => {
    const weak = run({ heads: { writer: "c", animator: "b", composer: "c" } });
    const strong = run({ heads: { writer: "a", animator: "b", composer: "c" } });
    const pWeak = proj({}, ["a", "b", "c"]);
    const pStrong = proj({}, ["a", "b", "c"]);
    const fx = facilityFX({});
    const qWeak = sprintQuality(weak, { ...pWeak, auto: { headSlot: "writer", startedWeek: 0, intervention: false } }, "story", fx, weak.staff);
    const qStrong = sprintQuality(strong, { ...pStrong, auto: { headSlot: "writer", startedWeek: 0, intervention: false } }, "story", fx, strong.staff);
    expect(qStrong.headSkill).toBeGreaterThan(qWeak.headSkill);
    expect(qStrong.points).toBeGreaterThan(qWeak.points);
  });

  it("produces a foldable milestone outcome", () => {
    const r = run();
    const p = proj();
    const auto = { headSlot: "writer" as const, startedWeek: 0, intervention: false };
    const o = autoSprintOutcome(r, { ...p, auto }, "story", facilityFX({}), r.staff);
    expect(o.points.story).toBeGreaterThan(0);
    expect(o.slider).toBeTruthy();
    const folded = applyMilestoneOutcome({ ...p, auto, milestone: "story" }, o);
    expect(folded.stage).toBe("preprod");
    expect(folded.milestone).toBeNull();
  });

  it("delegated sprints are capped below a strong manual ceiling", () => {
    const r = run();
    const p = proj();
    const auto = { headSlot: "writer" as const, startedWeek: 0, intervention: false };
    const q = sprintQuality(r, { ...p, auto }, "story", facilityFX({}), r.staff);
    expect(q.points).toBeLessThanOrEqual(150);
  });
});

/* ------------------------------------------------------------ crisis */
describe("crisis detection", () => {
  it("flags a project that will miss its deadline", () => {
    const p = proj({ deadlineWeek: 20 }); // long past due
    const c = crisisOf({ ...p, auto: { headSlot: null, startedWeek: 0, intervention: false } }, 40);
    expect(c?.id).toBe("deadline");
  });

  it("flags a movie reaching a critical stage once", () => {
    const r = run();
    const p = proj({ draft: draft({ medium: "movie" }), stage: "animation", auto: { headSlot: null, startedWeek: 0, intervention: false } });
    expect(crisisOf(p, r.week)?.id).toBe("movie");
    const warned = { ...p, auto: { headSlot: null, startedWeek: 0, intervention: false, warnedMovie: true } };
    expect(crisisOf(warned, r.week)).toBeNull();
  });
});

/* -------------------------------------------------------- weekly tick */
describe("tickDelegated", () => {
  it("runs a waiting milestone automatically and opens the next stage", () => {
    const r = run();
    const p = proj({ milestone: "story", progress: 5 });
    const tick = tickDelegated(r, [{ ...p, auto: { headSlot: null, startedWeek: 0, intervention: false } }], r.staff, r.week + 1, facilityFX({}));
    const np = tick.projects[0];
    expect(np.milestone).toBeNull();
    expect(np.stage).toBe("preprod");
    expect(tick.notices.some((n) => /story sprint/i.test(n))).toBe(true);
  });

  it("leaves manual projects untouched", () => {
    const r = run();
    const p = proj({ milestone: "story" });
    const tick = tickDelegated(r, [p], r.staff, r.week + 1, facilityFX({}));
    expect(tick.projects[0].milestone).toBe("story");
    expect(tick.notices).toHaveLength(0);
  });

  it("pauses on crisis and asks the player in", () => {
    const r = run({ week: 60 });
    const p = proj({ deadlineWeek: 30, auto: { headSlot: null, startedWeek: 0, intervention: false } });
    const tick = tickDelegated(r, [p], r.staff, 60, facilityFX({}));
    expect(tick.projects[0].auto?.intervention).toBe(true);
    expect(tick.notices.some((n) => /🚨/.test(n))).toBe(true);
  });
});

/* --------------------------------------------------------- take over */
describe("intervention", () => {
  it("takeOver clears automation", () => {
    const r = run();
    const p = proj({ auto: { headSlot: "writer", startedWeek: 0, intervention: true } });
    const out = takeOver({ ...r, projects: [p] }, p.id);
    expect(out.projects[0].auto).toBeNull();
  });

  it("resumeAuto clears the intervention but keeps the head", () => {
    const r = run();
    const p = proj({ auto: { headSlot: "writer", startedWeek: 0, intervention: true } });
    const out = resumeAuto({ ...r, projects: [p] }, p.id);
    expect(out.projects[0].auto?.intervention).toBe(false);
    expect(out.projects[0].auto?.headSlot).toBe("writer");
  });

  it("AUTO_MIN_OFFICE is the Sakuga Tower index", () => {
    expect(AUTO_MIN_OFFICE).toBe(2);
  });
});
