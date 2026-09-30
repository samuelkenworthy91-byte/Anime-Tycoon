import { describe, expect, it } from "vitest";
import { OFFICES, type Staff } from "../data";
import {
  activateArcball,
  applyChampionshipSpotlight,
  arcballInjuryChance,
  arcballInjuryWeeks,
  arcballProfile,
  arcballReady,
  arcballStateOf,
  buildArcballCupFixtures,
  buildArcballFixtures,
  instantResolveArcballFixture,
  playableArcballFixture,
  redeemArcballMedal,
} from "../arcball";
import { initialRun, migrateRun, type RunState } from "../state";
import type { Franchise } from "../franchise";

function staffedRun(): RunState {
  const run = initialRun("Arc Test", "steady");
  const seed = run.candidates[0];
  const staff: Staff[] = Array.from({ length: 5 }, (_, i) => ({
    ...seed,
    id: "arc_worker_" + i,
    name: "Worker " + i,
    role: (["writer", "animator", "composer"] as const)[i % 3],
    story: 28 + i,
    art: 31 + i,
    sound: 26 + i,
    stamina: 100,
    creatorFans: 0,
    joinedWeek: 0,
  }));
  return { ...run, officeLevel: 1, staff, candidates: [] };
}

function franchise(): Franchise {
  return {
    key: "IP",
    baseTitle: "Arc Heroes",
    genres: ["sports"],
    animeType: "shonen",
    audience: "teens",
    cast: [],
    createdWeek: 0,
    entries: [],
    season: 1,
    totalRevenue: 0,
    lifetimeFans: 10_000,
    bestScore: 24,
    lastScore: 24,
    lastEntryWeek: 0,
    popularity: 55,
    fatigue: 30,
    merchValue: 100_000,
    cult: false,
    merchCooldown: {},
    alive: true,
  };
}

describe("Arcball", () => {
  it("expands the second and third studio worker caps for early Arcball", () => {
    expect(OFFICES[1].maxStaff).toBe(5);
    expect(OFFICES[2].maxStaff).toBe(7);
  });

  it("builds a seven-studio double round robin", () => {
    const fixtures = buildArcballFixtures(1);
    expect(fixtures).toHaveLength(42);
    expect(fixtures.filter((f) => f.homeId === "player" || f.awayId === "player")).toHaveLength(12);
  });

  it("draws a seven-studio Cup with three quarter-finals and one bye", () => {
    const fixtures = buildArcballCupFixtures(1);
    expect(fixtures).toHaveLength(3);
    expect(fixtures.every((fixture) => fixture.competition === "cup" && fixture.cupRound === "quarterfinal")).toBe(true);
    const entrants = new Set(fixtures.flatMap((fixture) => [fixture.homeId, fixture.awayId]));
    expect(entrants.size).toBe(6);
    expect(["player", "Toe-i Animation", "Sunnyrise", "Boneworks", "Kyo-Hani", "Madcap House", "Turtle Line"].filter((id) => !entrants.has(id))).toHaveLength(1);
  });

  it("starts Arcball injuries at one-in-five and scales them with fatigue", () => {
    expect(arcballInjuryChance([100, 100, 100, 100, 100])).toBeCloseTo(0.20, 5);
    const tired = arcballInjuryChance([20, 24, 28, 32, 36]);
    expect(tired).toBeGreaterThan(0.30);
    expect(tired).toBeLessThanOrEqual(0.45);
    expect(arcballInjuryWeeks(100, 0)).toBe(2);
    expect(arcballInjuryWeeks(10, 0.999)).toBe(6);
  });

  it("keeps Arcball talent independent and deterministic per worker", () => {
    const run = staffedRun();
    const first = arcballProfile(run.staff[0]);
    const again = arcballProfile({ ...run.staff[0], story: 999, art: 999, sound: 999 });
    expect(again).toEqual(first);
    expect(first.overall).toBeGreaterThan(0);
  });

  it("activates at the Anime Runner Building with five staff and creates a ready five", () => {
    const activated = activateArcball(staffedRun());
    expect(activated).not.toBeNull();
    expect(arcballStateOf(activated!).unlocked).toBe(true);
    expect(arcballStateOf(activated!).registered.length).toBeGreaterThanOrEqual(5);
    expect(arcballReady(activated!)).toBe(true);
  });

  it("will not field an injured starter until the manager replaces them", () => {
    let run = activateArcball(staffedRun())!;
    const starter = Object.values(arcballStateOf(run).lineup)[0]!;
    run = {
      ...run,
      day: 7,
      staff: run.staff.map((member) => member.id === starter
        ? { ...member, injuredUntilDay: 35, injuryLabel: "ankle sprain" }
        : member),
    };
    expect(arcballReady(run)).toBe(false);
  });

  it("instant matches spend real worker energy and award personal creator followers", () => {
    let run = activateArcball(staffedRun())!;
    const fixture = arcballStateOf(run).fixtures.find((f) => f.homeId === "player" || f.awayId === "player")!;
    run = { ...run, week: fixture.week };
    const beforeEnergy = run.staff.reduce((sum, s) => sum + s.stamina, 0);
    const beforeFollowers = run.staff.reduce((sum, s) => sum + (s.creatorFans ?? 0), 0);
    const resolved = instantResolveArcballFixture(run, fixture.id)!;
    const afterFixture = arcballStateOf(resolved).fixtures.find((f) => f.id === fixture.id)!;
    expect(afterFixture.homeScore).toBeTypeOf("number");
    expect(resolved.staff.reduce((sum, s) => sum + s.stamina, 0)).toBeLessThan(beforeEnergy);
    expect(resolved.staff.reduce((sum, s) => sum + (s.creatorFans ?? 0), 0)).toBeGreaterThan(beforeFollowers);
    expect(arcballStateOf(resolved).tokens).toBeGreaterThan(0);
  });

  it("limits permanent Tier 1 and Tier 2 production gains by season", () => {
    let run = activateArcball(staffedRun())!;
    run = { ...run, arcball: { ...arcballStateOf(run), tokens: 500 } };
    const id = run.staff[0].id;
    const story0 = run.staff[0].story;
    run = redeemArcballMedal(run, id, "story", 1)!;
    run = redeemArcballMedal(run, id, "story", 1)!;
    expect(redeemArcballMedal(run, id, "story", 1)).toBeNull();
    expect(run.staff[0].story).toBe(story0 + 4);
    const art0 = run.staff[0].art;
    run = redeemArcballMedal(run, id, "art", 2)!;
    expect(redeemArcballMedal(run, id, "art", 2)).toBeNull();
    expect(run.staff[0].art).toBe(art0 + 5);
  });

  it("turns a title Spotlight into targeted franchise commercial modifiers without review quality", () => {
    let run = activateArcball(staffedRun())!;
    run = {
      ...run,
      franchises: { IP: franchise() },
      arcball: { ...arcballStateOf(run), championshipSpotlights: 1 },
    };
    const boosted = applyChampionshipSpotlight(run, "IP")!;
    expect(boosted.franchises.IP.popularity).toBe(70);
    expect(boosted.franchises.IP.fatigue).toBe(15);
    expect(boosted.decisionModifiers.filter((m) => m.franchiseKey === "IP").map((m) => m.kind).sort()).toEqual(["merch", "releaseFans", "releaseSales"]);
    expect(boosted.decisionModifiers.some((m) => m.kind === "releaseQuality" && m.franchiseKey === "IP")).toBe(false);
  });

  it("migrates an old V5-shaped run without Arcball data additively", () => {
    const raw = staffedRun() as RunState & { arcball?: unknown };
    delete raw.arcball;
    const migrated = migrateRun(raw);
    const state = arcballStateOf(migrated);
    expect(state.version).toBe(1);
    expect(state.cupFixtures).toHaveLength(3);
    expect(state.records.longestWinStreak).toBe(0);
    expect(state.merchDrops).toEqual([]);
    expect(migrated.staff).toHaveLength(5);
  });

});
