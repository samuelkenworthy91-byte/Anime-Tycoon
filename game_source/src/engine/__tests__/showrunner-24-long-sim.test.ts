import { describe, expect, it } from "vitest";
import { ARCS, FORMAT_ORDER, GENRES, MEDIUMS, PETS, PROTAGONISTS, SECONDARY, SLOTS, VILLAINS, type CastMember, type CastRole, type Draft, type MediumId, type SlotId } from "../data";
import { genreTargetFor } from "../genreTargets";
import { rollHire } from "../careers";
import { activeProjects, projectOfStaff, projectUpfront, type MilestoneOutcome, type Project } from "../projects";
import { seededRng } from "../scoring";
import {
  advanceWeeks,
  applyMilestone,
  initialRun,
  projectCapacity,
  releaseProject,
  staffCapacity,
  startContractAssignment,
  startFullyDelegatedProject,
  startProject,
  tickStudioWorkPulse,
  unlockFormat,
  type RunState,
} from "../state";

const YEARS = 25;
const WEEKS = YEARS * 48;
const RUNNERS = ["steady", "operations", "dealmaker", "sloth", "delegator", "over9000"] as const;
const SEEDS = ["A", "B", "C", "D", "E"];

const pools: Record<CastRole, CastMember[]> = {
  protag: PROTAGONISTS,
  secondary: SECONDARY,
  pet: PETS,
  villain: VILLAINS,
};

const botDraft = (r: RunState, i: number): Draft => {
  const genres = r.genresUnlocked;
  const g = genres[i % genres.length];
  const unlocked = r.mediumsUnlocked.length ? r.mediumsUnlocked : ["fanweb"];
  const medium = unlocked[Math.floor(Math.random() * unlocked.length)] as MediumId;
  const budget = r.cash > 2_000_000 ? "blockbuster" : r.cash > 400_000 ? "standard" : "indie";
  const ideal = genreTargetFor([g]).ideal;
  const slot = (Object.entries(SLOTS).find(([, def]) => def.best.includes(g))?.[0]
    ?? (medium === "tv" || medium === "special" ? "evening" : (MEDIUMS[medium].slot ?? "stream"))) as SlotId;

  const knownAffinity = (member: CastMember) => {
    const hiddenKnown = r.castAffinityDiscovered.includes(member.id) && member.hiddenAff === g;
    if (hiddenKnown) return 2;
    return member.visibleAff.includes(g) ? 1 : 0;
  };
  const preferredLead = [...PROTAGONISTS]
    .sort((a, b) => knownAffinity(b) - knownAffinity(a))[0] ?? PROTAGONISTS[0];
  const animeType = preferredLead.type;
  const pick = (role: CastRole) =>
    [...pools[role]]
      .filter((member) => member.type === animeType)
      .sort((a, b) => knownAffinity(b) - knownAffinity(a))[0]
    ?? pools[role][0];

  const protag = pick("protag");
  const secondary = pick("secondary");
  const pet = pick("pet");
  const villain = pick("villain");
  const arcPool = ARCS
    .filter((arc) => !arc.franchiseOnly && !(arc.anti ?? []).includes(g))
    .map((arc) => ({
      id: arc.id,
      score: arc.q + ((arc.syn ?? []).includes(g) ? (arc.synQ ?? 0) + 5 : 0) + (arc.f ?? 0) * 30,
    }))
    .sort((a, b) => b.score - a.score);
  const arcs = arcPool.slice(0, 4).map((arc) => arc.id);

  return {
    title: `Sim Show ${i}`,
    medium,
    budget,
    slot,
    animeType,
    genres: [g],
    audience: "teens",
    protag: protag.id,
    protagName: protag.name,
    secondary: secondary.id,
    pet: pet.id,
    villain: villain.id,
    arcs,
    sliders: [...ideal] as [number, number, number],
    season: 1,
  };
};

const botOutcome = (p: Project): MilestoneOutcome => {
  const team = p.staffIds.length;
  const power = 18 + team * 6;
  return p.milestone === "edit"
    ? { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 2_000, rdGained: 2, squashed: Math.max(0, p.issues) }
    : { points: { story: power, art: power, sound: power }, issues: 1, spent: 3_000, rdGained: 3 };
};

const botAssign = (r: RunState): RunState => {
  let projects = r.projects;
  let free = r.staff.filter((s) => !projectOfStaff(projects, s.id));
  for (const p of activeProjects(projects)) {
    if (p.auto?.mode === "full") continue;
    const room = Math.max(0, 5 - p.staffIds.length);
    for (let k = 0; k < room && free.length; k++) {
      const st = free.shift()!;
      projects = projects.map((x) => x.id === p.id ? { ...x, staffIds: [...x.staffIds, st.id] } : x);
    }
  }
  return { ...r, projects };
};

const botContract = (r: RunState): RunState => {
  if (r.cash >= 60_000 || r.contractJobs.length > 0 || !r.contracts.length) return r;
  const contract = [...r.contracts].sort((a, b) => b.pay - a.pay)[0];
  const free = r.staff.filter((s) => !projectOfStaff(r.projects, s.id) && !r.contractJobs.some((j) => j.staffIds.includes(s.id)));
  return free.length ? (startContractAssignment(r, contract, [free[0].id]) ?? r) : r;
};

const botHire = (r: RunState): RunState => {
  let staff = r.staff;
  let cash = r.cash;
  let candidates = r.candidates ?? [];
  if (staff.length >= staffCapacity(r)) return r;
  if (candidates.length === 0 && cash > 20_000) {
    cash -= 8_000;
    candidates = [rollHire(r.week), rollHire(r.week), rollHire(r.week)];
  }
  for (const c of [...candidates]) {
    if (staff.length >= staffCapacity(r) || cash < c.cost) break;
    cash -= c.cost;
    staff = [...staff, { ...c, joinedWeek: r.week }];
    candidates = candidates.filter((x) => x.id !== c.id);
  }
  return { ...r, cash, staff, candidates };
};

type CareerResult = {
  showrunner: string;
  seed: string;
  cash: number;
  revenue: number;
  fans: number;
  shows: number;
  hits: number;
  avgReview: number;
  bestScore: number;
  playerBigThree: number;
};

function playCareer(showrunner: string, seedLabel: string): CareerResult {
  const seed = [...(`${showrunner}|${seedLabel}`)].reduce((value, ch) => ((value * 33) ^ ch.charCodeAt(0)) >>> 0, 0x51a7e);
  const originalRandom = Math.random;
  Math.random = seededRng(seed);
  try {
    let r: RunState = {
      ...initialRun(`SIM ${showrunner} ${seedLabel}`, showrunner),
      officeLevel: 2,
      cash: 1_000_000,
      rd: 500,
      genresUnlocked: GENRES.map((g) => g.id),
      mediumsUnlocked: ["fanweb", "ona", "tv", "ova", "special", "movie"],
    };
    let greenlit = 0;
    let reviewSum = 0;
    let reviewCount = 0;

    for (let w = 0; w < WEEKS; w++) {
      for (const p of [...r.projects]) {
        if (p.milestone && p.auto?.mode !== "full") r = applyMilestone(r, p.id, botOutcome(p));
      }
      for (const p of [...r.projects]) {
        if (p.stage !== "ready") continue;
        const res = releaseProject(r, p.id, { spent: 0, hype: 0 });
        if (!res) continue;
        r = res.run;
        reviewSum += res.result.total;
        reviewCount++;
      }

      r = botHire(r);

      let guard = 0;
      while (guard++ < 4 && activeProjects(r.projects).length < projectCapacity(r)) {
        if (showrunner === "delegator") {
          const director = r.staff.find((s) => !projectOfStaff(r.projects, s.id) && !r.contractJobs.some((j) => j.staffIds.includes(s.id)));
          if (!director || r.cash < 45_000) break;
          const next = startFullyDelegatedProject(r, director.id, Math.random);
          if (!next) break;
          r = next;
          greenlit++;
        } else {
          const d = botDraft(r, greenlit);
          if (r.cash < projectUpfront(d) + 30_000) break;
          const next = startProject(r, d);
          if (!next) break;
          r = next;
          greenlit++;
        }
      }

      for (const medium of FORMAT_ORDER) {
        const unlocked = unlockFormat(r, medium);
        if (unlocked) r = unlocked;
      }

      r = botAssign(r);
      r = botContract(r);
      for (let pulse = 0; pulse < 40; pulse++) r = tickStudioWorkPulse(r).run;
      r = advanceWeeks(r, 1);
    }

    return {
      showrunner,
      seed: seedLabel,
      cash: r.cash,
      revenue: r.totalRevenue,
      fans: r.fans,
      shows: r.showsMade,
      hits: r.hits,
      avgReview: reviewCount ? reviewSum / reviewCount : 0,
      bestScore: r.bestScore,
      playerBigThree: r.bigThree.slots.filter((slot) => slot.player).length,
    };
  } finally {
    Math.random = originalRandom;
  }
}

const simDescribe = process.env.SHOWRUNNER_24_SIM === "1" ? describe : describe.skip;

simDescribe("25-year showrunner comparison", () => {
  it("compares Genji, mid, weak and the three new showrunners across identical seeds", () => {
    const careers: CareerResult[] = [];
    for (const showrunner of RUNNERS) for (const seed of SEEDS) careers.push(playCareer(showrunner, seed));

    const summary = RUNNERS.map((showrunner) => {
      const rows = careers.filter((row) => row.showrunner === showrunner);
      const avg = (key: keyof CareerResult) => rows.reduce((sum, row) => sum + Number(row[key]), 0) / rows.length;
      return {
        showrunner,
        cash: Math.round(avg("cash")),
        revenue: Math.round(avg("revenue")),
        fans: Math.round(avg("fans")),
        shows: Math.round(avg("shows") * 10) / 10,
        hits: Math.round(avg("hits") * 10) / 10,
        avgReview: Math.round(avg("avgReview") * 100) / 100,
        bestScore: Math.round(avg("bestScore") * 10) / 10,
        playerBigThree: Math.round(avg("playerBigThree") * 10) / 10,
      };
    });

    console.log("SHOWRUNNER_24_COMPETENT_SIM_RESULT=" + JSON.stringify(summary));
    for (const row of careers) {
      expect(Number.isFinite(row.cash)).toBe(true);
      expect(Number.isFinite(row.revenue)).toBe(true);
      expect(Number.isFinite(row.fans)).toBe(true);
      expect(row.shows).toBeGreaterThan(0);
    }
  }, 600_000);
});
