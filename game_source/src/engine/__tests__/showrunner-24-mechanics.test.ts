import { describe, expect, it } from "vitest";
import { type Draft, type Staff } from "../data";
import { facilityFX } from "../facilities";
import { fanBaseSalesMultiplier } from "../difficulty";
import { sprintQuality } from "../automation";
import { makeProject, teamSpeed } from "../projects";
import { advanceBigThreeWeek, BIG_THREE_START_WEEK, recognisePlayerBigThreeRelease } from "../bigThree";
import { contributionEffectiveSkill, forecastWeek, initialRun } from "../state";

const draft = (title = "Probe", genres: Draft["genres"] = ["slice"]): Draft => ({
  title,
  medium: "tv",
  budget: "standard",
  scope: "standard",
  slot: "prime",
  animeType: "shonen",
  genres,
  audience: "teens",
  protag: "kai",
  protagName: "Kai",
  secondary: "none",
  pet: "none",
  villain: "none",
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
});

describe("24-showrunner experimental mechanics", () => {
  it("The Sloth doubles live staff output while idle", () => {
    const base = initialRun("Sloth Probe", "producer");
    const worker = { ...base.candidates[0], id: "worker", stamina: 100 };
    const project = { ...makeProject(draft(), 0), staffIds: [worker.id], milestone: null, stage: "animation" as const };
    const normal = { ...base, staff: [worker], projects: [project], showrunner: "producer" as const };
    const sloth = { ...normal, showrunner: "sloth" as const };
    expect(contributionEffectiveSkill(sloth, worker, "art"))
      .toBeCloseTo(contributionEffectiveSkill(normal, worker, "art") * 2, 5);
    expect(forecastWeek(sloth).burn).toBeCloseTo(forecastWeek(normal).burn * 0.5, -1);
  });

  it("The Delegator materially strengthens full-delegation milestone output, especially in the creator's preferred genre", () => {
    const base = initialRun("Delegation Probe", "producer");
    const director = { ...base.candidates[0], id: "director", role: "writer" as const, favGenre: "slice" as const, stamina: 100 };
    const animator = { ...base.candidates[1], id: "animator", role: "animator" as const, stamina: 100 };
    const composer = { ...base.candidates[2], id: "composer", role: "composer" as const, stamina: 100 };
    const staff = [director, animator, composer];
    const project = {
      ...makeProject(draft("Delegated"), 0),
      staffIds: staff.map((s) => s.id),
      creativeLeadId: director.id,
      auto: { headSlot: null, mode: "full" as const, directorStaffId: director.id, startedWeek: 0, intervention: false },
      milestone: "story" as const,
    };
    const normal = { ...base, staff, projects: [project], showrunner: "producer" as const };
    const delegated = { ...normal, showrunner: "delegator" as const };
    const a = sprintQuality(normal, project, "story", facilityFX({}), staff);
    const b = sprintQuality(delegated, project, "story", facilityFX({}), staff);
    expect(b.points).toBeGreaterThan(a.points);
    expect(b.points).toBeGreaterThanOrEqual(Math.round(a.points * 1.4));
  });

  it("Over 9000 bypasses the ordinary schedule and fanbase-sales soft caps but keeps hard safety stops", () => {
    const base = initialRun("Limit Probe", "producer");
    const worker = (id: string, role: Staff["role"]): Staff => ({
      ...base.candidates[0],
      id,
      role,
      story: 300,
      art: 300,
      sound: 300,
      stamina: 100,
    });
    const team = [worker("a", "writer"), worker("b", "animator"), worker("c", "composer"), worker("d", "writer")];
    const p = { ...makeProject(draft(), 0), staffIds: team.map((s) => s.id), stage: "animation" as const, milestone: null };
    const capped = teamSpeed(p, team, undefined, undefined, { speed: 0, burnMult: 1 });
    const broken = teamSpeed(p, team, undefined, undefined, { speed: 0, burnMult: 1, ignoreScheduleCap: true });
    expect(capped).toBeLessThanOrEqual(1.35);
    expect(broken).toBeGreaterThan(1.35);
    expect(broken).toBeLessThanOrEqual(2.75);

    expect(fanBaseSalesMultiplier(10_000_000)).toBeLessThanOrEqual(1.8);
    expect(fanBaseSalesMultiplier(10_000_000, true)).toBeGreaterThan(1.8);
    expect(fanBaseSalesMultiplier(Number.MAX_SAFE_INTEGER, true)).toBeLessThanOrEqual(3);
  });

  it("Over 9000 can place multiple player productions into the Big Three while ordinary studios remain one-slot-per-studio", () => {
    const seed = (showrunner: string) => ({
      ...initialRun("Big Three Probe", showrunner),
      week: BIG_THREE_START_WEEK,
      day: BIG_THREE_START_WEEK * 7,
      bigThree: { ...initialRun("x", showrunner).bigThree, introduced: true, lastRivalScanWeek: -1 },
    });
    const addThree = (run: ReturnType<typeof seed>) => {
      let r = run;
      for (let i = 0; i < 3; i++) {
        r = recognisePlayerBigThreeRelease(r, {
          projectId: `p${i}`,
          draft: draft(`Breakout ${i}`),
          score: 40,
          points: { story: 500, art: 500, sound: 500 },
          reach: 400_000 + i * 10_000,
          franchiseKey: `fr-${i}`,
        });
      }
      return advanceBigThreeWeek(r);
    };
    expect(addThree(seed("producer")).bigThree.slots.filter((s) => s.player)).toHaveLength(1);
    expect(addThree(seed("over9000")).bigThree.slots.filter((s) => s.player)).toHaveLength(3);
  });
});
