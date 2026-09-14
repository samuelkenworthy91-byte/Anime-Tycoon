import { describe, expect, it } from "vitest";
import {
  ARCS,
  OFFICES,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  STAFF_STAT_CAP,
  VILLAINS,
  staffPoint,
  type Draft,
  type PointType,
  type Staff,
  type StaffRole,
} from "../src/engine/data";
import { gainXp } from "../src/engine/careers";
import { makeProject, TEAM_MAX } from "../src/engine/projects";
import {
  applyMilestone,
  crunchRush,
  initialRun,
  projectById,
  respondRushBoost,
  startMilestoneRush,
  tickRushDay,
  tickStudioDay,
  tickStudioWorkPulse,
  type RunState,
} from "../src/engine/state";
import { gainShowrunnerXp } from "../src/engine/showrunnerCareer";

/**
 * AWARDS CRAFT CAPACITY BENCHMARK
 *
 * This deliberately models an ambitious, sensibly progressed studio rather
 * than the average player production. Each year uses the office most likely to
 * be occupied around the awards cut-off, a full project team, the largest
 * normal production scope available, blockbuster funding, current production
 * facilities/research, fully played paid milestone rushes + crunch, and staff
 * who have received ordinary career/release growth from earlier years.
 *
 * The benchmark is intentionally not a theoretical all-999-stat maximum. The
 * resulting p50 is the line a fully committed studio of that era should only
 * just reach. Award qualification can then track the industry's rising craft
 * expectations instead of a tiny fixed linear increase.
 */

const SIMS = 10;
const GENRES = ["romance", "military"] as const;
const OFFICE_BY_YEAR = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4] as const;
const CRAFTS: PointType[] = ["story", "art", "sound"];
const ROLE_FOR: Record<PointType, StaffRole> = { story: "writer", art: "animator", sound: "composer" };
const PASSIVE_SHOWS_PER_YEAR = 4;
const CAREER_XP_PER_PRIOR_YEAR = 550;

function seeded(seed: number) {
  let x = seed >>> 0 || 0x9e3779b9;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4_294_967_296;
  };
}

function trainingTierForYear(year: number) {
  if (year <= 1) return 0;
  if (year <= 2) return 1;
  if (year <= 4) return 2;
  return 3;
}

function productionTierForYear(year: number) {
  if (year <= 2) return 1;
  if (year <= 4) return 2;
  return 3;
}

function historicalPassiveGain(joinYear: number, targetYear: number): number {
  let gain = 0;
  for (let y = joinYear; y < targetYear; y += 1) {
    const training = trainingTierForYear(y);
    // Four releases/year: +(1+t) to all skills on release, plus +t once per
    // matching milestone/discipline on each show.
    gain += PASSIVE_SHOWS_PER_YEAR * (1 + training) + PASSIVE_SHOWS_PER_YEAR * training;
  }
  return gain;
}

function makeStaff(year: number, focus: PointType, count: number): Staff[] {
  const targetRole = ROLE_FOR[focus];
  const firstFour: StaffRole[] = ["writer", "animator", "composer", targetRole];
  const roles: StaffRole[] = [...firstFour];
  while (roles.length < count) {
    const counts: Record<StaffRole, number> = { writer: 0, animator: 0, composer: 0 };
    for (const role of roles) counts[role] += 1;
    roles.push((["writer", "animator", "composer"] as StaffRole[]).sort((a, b) => counts[a] - counts[b])[0]);
  }

  return roles.slice(0, count).map((role, i) => {
    const joinYear = i < 4 ? 1 : 2;
    const hireWeek = (joinYear - 1) * 48 + 24;
    const marketTier = Math.min(45, hireWeek * 0.16);
    const main = Math.round(51 + marketTier);
    const off = Math.round(27 + marketTier * 0.5);
    const raw: Staff = {
      id: `benchmark_${focus}_${year}_${i}`,
      name: `Benchmark ${role} ${i + 1}`,
      role,
      story: role === "writer" ? main : off,
      art: role === "animator" ? main : off,
      sound: role === "composer" ? main : off,
      level: 1,
      xp: 0,
      salary: 1000,
      cost: 10_000,
      stamina: 100,
      portrait: i,
      potential: 70,
      pendingLevelUps: [],
      morale: 70,
      traits: [],
      spec: "benchmark_none",
      favGenre: "comedy",
      genreExperience: {
        romance: Math.max(0, (year - joinYear) * PASSIVE_SHOWS_PER_YEAR),
        military: Math.max(0, (year - joinYear) * PASSIVE_SHOWS_PER_YEAR),
      },
      joinedWeek: (joinYear - 1) * 48,
      shows: [],
      awardsWon: 0,
      bestShow: null,
    };
    const xp = CAREER_XP_PER_PRIOR_YEAR * Math.max(0, year - joinYear);
    let staff = gainXp(raw, xp).staff;
    const passive = historicalPassiveGain(joinYear, year);
    staff = {
      ...staff,
      story: Math.min(STAFF_STAT_CAP, staff.story + passive),
      art: Math.min(STAFF_STAT_CAP, staff.art + passive),
      sound: Math.min(STAFF_STAT_CAP, staff.sound + passive),
      pendingLevelUps: [],
    };
    return staff;
  });
}

function castFor(role: "protag" | "secondary" | "pet" | "villain") {
  const pool = role === "protag" ? PROTAGONISTS : role === "secondary" ? SECONDARY : role === "pet" ? PETS : VILLAINS;
  return pool.find((c) => c.type === "shonen" && !c.legacyPlaceholder) ?? pool[0];
}

function benchmarkDraft(year: number): Draft {
  const p = castFor("protag"), s = castFor("secondary"), pet = castFor("pet"), v = castFor("villain");
  return {
    title: `Awards Capacity Y${year}`,
    medium: "tv",
    budget: "blockbuster",
    scope: year === 1 ? "extended" : "prestige",
    slot: "prime",
    animeType: "shonen",
    genres: [...GENRES],
    audience: "teens",
    protag: p.id,
    protagName: p.name,
    secondary: s.id,
    pet: pet.id,
    villain: v.id,
    arcs: ARCS.filter((a) => !a.franchiseOnly).slice(0, 6).map((a) => a.id),
    sliders: [50, 50, 50],
    season: 1,
  };
}

function facilitiesFor(year: number) {
  const craft = productionTierForYear(year);
  const training = trainingTierForYear(year);
  if (year === 1) return { writers: 1, animation: 1, recording: 1 } as const;
  return {
    writers: craft,
    animation: craft,
    recording: craft,
    training,
    render: Math.min(craft, year >= 3 ? 2 : 1),
    ...(year >= 4 ? { editing: Math.min(3, craft) } : {}),
  };
}

function buildRun(year: number, focus: PointType): { run: RunState; projectId: string } {
  const officeLevel = OFFICE_BY_YEAR[year - 1] ?? 4;
  const teamSize = Math.min(OFFICES[officeLevel].maxStaff, TEAM_MAX);
  const staff = makeStaff(year, focus, teamSize);
  const week = (year - 1) * 48 + 38;
  const draft = benchmarkDraft(year);
  const project = { ...makeProject(draft, week, week * 7), staffIds: staff.map((s) => s.id) };
  let run = initialRun("Awards Capacity Studio", "operations");
  let showrunnerCareer = run.showrunnerCareer;
  if (year > 1) showrunnerCareer = gainShowrunnerXp("operations", showrunnerCareer, (year - 1) * 700).career;
  const research = year >= 3 ? ["pipeline", "storyboard", "mocap"] : year >= 2 ? ["pipeline"] : [];
  const heads = year >= 3 ? {
    writer: staff.find((x) => x.role === "writer")?.id,
    animator: staff.find((x) => x.role === "animator")?.id,
    composer: staff.find((x) => x.role === "composer")?.id,
  } : {};
  run = {
    ...run,
    week,
    day: week * 7,
    officeLevel,
    showsMade: Math.max(0, (year - 1) * PASSIVE_SHOWS_PER_YEAR),
    cash: 999_000_000,
    rd: 99_999,
    staff,
    projects: [project],
    facilities: facilitiesFor(year),
    research,
    heads,
    showrunnerCareer,
    staffResting: {},
    bonds: {},
    notices: [],
  } as RunState;
  return { run, projectId: project.id };
}

function simulate(year: number, focus: PointType, seed: number): number {
  const rng = seeded(seed);
  const oldRandom = Math.random;
  Math.random = rng;
  try {
    let { run, projectId } = buildRun(year, focus);
    let days = 0;
    let crunched = new Set<string>();
    while (days < 360) {
      let project = projectById(run, projectId);
      if (!project) throw new Error("benchmark project disappeared");
      if (project.stage === "ready") return Math.round(project.points[focus]);

      if (project.milestone === "edit") {
        run = applyMilestone(run, projectId, {
          points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 40_000, rdGained: 0, squashed: project.issues,
        });
        continue;
      }

      if (project.milestone && project.milestone !== "edit" && !project.rush) {
        const type = project.milestone;
        const lead = run.staff.filter((s) => project!.staffIds.includes(s.id)).sort((a, b) => staffPoint(b, type) - staffPoint(a, type))[0];
        const started = startMilestoneRush(run, projectId, {
          leadId: lead.id,
          leadName: lead.name,
          skill: staffPoint(lead, type),
          type,
          cost: 120_000,
          slider: 50,
        });
        if (!started) throw new Error(`could not start ${type} benchmark rush`);
        run = started;
        run = crunchRush(run, projectId);
        crunched.add(`${projectId}:${type}`);
        project = projectById(run, projectId)!;
      }

      project = projectById(run, projectId)!;
      if (!project.milestone) {
        const cycles = days % 7 < 5 ? 6 : 5; // exactly 40 visible work checks/week
        for (let i = 0; i < cycles; i += 1) run = tickStudioWorkPulse(run, rng).run;
      }

      if (projectById(run, projectId)?.rush) {
        run = tickRushDay(run).run;
        const prompt = projectById(run, projectId)?.rush?.boostPrompt;
        if (prompt) run = respondRushBoost(run, projectId, 0.8);
      }

      const day = tickStudioDay(run);
      run = { ...day.run, day: (day.run.day ?? run.day) + 1 };
      days += 1;
    }
    throw new Error(`benchmark Y${year} ${focus} exceeded 360 days`);
  } finally {
    Math.random = oldRandom;
  }
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function round50(v: number) { return Math.max(50, Math.round(v / 50) * 50); }

describe("awards craft capacity simulation", () => {
  it("prints Year 1-12 full-studio capacity for awards threshold calibration", () => {
    const rows = [] as Array<Record<string, number>>;
    for (let year = 1; year <= 12; year += 1) {
      const row: Record<string, number> = { year, office: OFFICE_BY_YEAR[year - 1] ?? 4 };
      const medians: number[] = [];
      for (const craft of CRAFTS) {
        const values = Array.from({ length: SIMS }, (_, i) => simulate(year, craft, year * 10_000 + CRAFTS.indexOf(craft) * 100 + i + 1));
        const p25 = percentile(values, 0.25);
        const p50 = percentile(values, 0.50);
        const p75 = percentile(values, 0.75);
        row[`${craft}P25`] = p25;
        row[`${craft}P50`] = p50;
        row[`${craft}P75`] = p75;
        medians.push(p50);
      }
      // Shared craft floor: just under the weakest median of three targeted,
      // fully-funded builds, rounded to a player-readable 50-point step.
      row.suggestedFloor = round50(Math.min(...medians) * 0.96);
      rows.push(row);
    }
    console.log("AWARD_CRAFT_CAPACITY_SIM=" + JSON.stringify(rows));
    expect(rows).toHaveLength(12);
    expect(rows[5].suggestedFloor).toBeGreaterThan(600);
    expect(rows[11].suggestedFloor).toBeGreaterThan(rows[5].suggestedFloor);
    expect(rows[11].suggestedFloor).toBeGreaterThan(rows[0].suggestedFloor * 2);
  }, 120_000);
});
