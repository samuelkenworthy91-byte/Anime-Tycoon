import { describe, expect, it } from "vitest";
import {
  ARCS,
  GENRE,
  MEDIUMS,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  VILLAINS,
  affinityTier,
  type CastMember,
  type CastRole,
  type Draft,
  type GenreId,
} from "../data";
import { makeProject } from "../projects";
import { computeResult, seededRng } from "../scoring";
import {
  cleanMasterQualityMult,
  criticalDarlingReviewBonus,
  criticsIgnoreBalance,
  polarityProductionMult,
} from "../showrunnerPerks";
import { contributionEffectiveSkill, initialRun } from "../state";

const GENRES: GenreId[] = ["military", "romance"];
const blend = (i: 0 | 1 | 2, key: "ideal" | "ratio") =>
  GENRES.reduce((sum, genre) => sum + GENRE(genre)[key][i], 0) / GENRES.length;
const IDEAL: [number, number, number] = [0, 1, 2].map((i) =>
  Math.round(blend(i as 0 | 1 | 2, "ideal"))
) as [number, number, number];
const RATIO: [number, number, number] = [0, 1, 2].map((i) =>
  blend(i as 0 | 1 | 2, "ratio")
) as [number, number, number];

const pools: Record<CastRole, CastMember[]> = {
  protag: PROTAGONISTS,
  secondary: SECONDARY,
  pet: PETS,
  villain: VILLAINS,
};
const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];

function baseDraft(genres: GenreId[] = GENRES): Draft {
  const cast = Object.fromEntries(
    roles.map((role) => [role, pools[role].find((member) => affinityTier(member, genres) >= 1) ?? pools[role][0]])
  ) as Record<CastRole, CastMember>;
  return {
    title: "Showrunner Probe",
    medium: "tv",
    budget: "standard",
    scope: "standard",
    slot: MEDIUMS.tv.slot ?? "midnight",
    animeType: "shonen",
    genres,
    audience: "teens",
    protag: cast.protag.id,
    protagName: cast.protag.name,
    secondary: cast.secondary.id,
    pet: cast.pet.id,
    villain: cast.villain.id,
    arcs: ["hook", "finale"].filter((id) => ARCS.some((arc) => arc.id === id)),
    sliders: IDEAL,
    season: 1,
  };
}

function score(showrunner: string, points = { story: 40, art: 40, sound: 40 }, issues = 0) {
  return computeResult({
    draft: baseDraft(),
    points,
    issues,
    hype: 20,
    research: [],
    showrunner,
    genreIdeal: IDEAL,
    genreRatio: RATIO,
    comboLevel: 0,
    newCombo: false,
    comboDiscovered: true,
    castCombos: [],
    arcCombos: [],
    studioTop: 0,
    reviewExpectation: 32,
    franchiseMult: 1,
    costs: 100_000,
    fanBase: 1_000,
    rng: seededRng(20260927),
  });
}

describe("new showrunner identities", () => {
  it("makes Prince of Darkness and Brighter Than the Dawn exact mirrored specialists", () => {
    expect(polarityProductionMult("darkness", ["horror"])).toBe(1.35);
    expect(polarityProductionMult("darkness", ["horror", "grimdark"])).toBe(1.70);
    expect(polarityProductionMult("darkness", ["romance"])).toBe(0.65);
    expect(polarityProductionMult("darkness", ["romance", "idol"])).toBe(0.30);
    expect(polarityProductionMult("darkness", ["horror", "romance"])).toBe(1);

    expect(polarityProductionMult("dawn", ["romance"])).toBe(1.35);
    expect(polarityProductionMult("dawn", ["idol", "magical"])).toBe(1.70);
    expect(polarityProductionMult("dawn", ["horror"])).toBe(0.65);
    expect(polarityProductionMult("dawn", ["vampire", "cosmic_horror"])).toBe(0.30);
  });

  it("Who Needs Balance removes department-ratio judgement without changing other criteria", () => {
    expect(criticsIgnoreBalance("unbalanced")).toBe(true);
    expect(criticsIgnoreBalance("steady")).toBe(false);
    const target = score("unbalanced", {
      story: Math.round(600 * RATIO[0]),
      art: Math.round(600 * RATIO[1]),
      sound: 600 - Math.round(600 * RATIO[0]) - Math.round(600 * RATIO[1]),
    });
    const extreme = score("unbalanced", { story: 520, art: 60, sound: 20 });
    expect(extreme.quality).toBeCloseTo(target.quality, 8);
    expect(extreme.total).toBe(target.total);
  });

  it("Akari now has a real 5/10 individual critic floor", () => {
    const result = score("vision", { story: 0, art: 0, sound: 0 }, 12);
    expect(result.reviews.every((review) => review.score >= 5)).toBe(true);
  });

  it("Critical Darling applies exactly +0.40 before the normal review conversion", () => {
    expect(criticalDarlingReviewBonus("critical")).toBeCloseTo(0.4);
    expect(criticalDarlingReviewBonus("steady")).toBe(0);
    expect(score("critical", { story: 250, art: 200, sound: 150 }).total)
      .toBeGreaterThanOrEqual(score("producer", { story: 250, art: 200, sound: 150 }).total);
  });

  it("The Finisher reserves the 5% quality multiplier for a clean master", () => {
    expect(cleanMasterQualityMult("finisher", 0)).toBe(1.05);
    expect(cleanMasterQualityMult("finisher", 1)).toBe(1);
    expect(cleanMasterQualityMult("steady", 0)).toBe(1);
  });
});

describe("live contribution wiring", () => {
  it("repairs Roxie so No Blueprint boosts live project contribution as well as pace", () => {
    const seed = initialRun("Roxie Probe", "vision");
    const worker = { ...seed.candidates[0], id: "writer", role: "writer" as const, stamina: 100 };
    const draft = baseDraft(["mecha", "romance"]);
    const project = { ...makeProject(draft, 0), staffIds: [worker.id], stage: "animation" as const, milestone: null };
    const normal = { ...seed, showrunner: "vision" as const, staff: [worker], projects: [project], comboLevels: {} };
    const roxie = { ...normal, showrunner: "genre" as const };
    expect(contributionEffectiveSkill(roxie, worker, "story"))
      .toBeCloseTo(contributionEffectiveSkill(normal, worker, "story") * 1.35, 5);
  });

  it("The Finisher boosts actual editing contribution by 35% but not normal project output", () => {
    const seed = initialRun("Finisher Probe", "producer");
    const worker = { ...seed.candidates[0], id: "editor", role: "writer" as const, stamina: 100 };
    const project = { ...makeProject(baseDraft(), 0), staffIds: [worker.id], stage: "post" as const, milestone: null };
    const normal = { ...seed, showrunner: "producer" as const, staff: [worker], projects: [project] };
    const finisher = { ...normal, showrunner: "finisher" as const };
    expect(contributionEffectiveSkill(finisher, worker, "story", true))
      .toBeCloseTo(contributionEffectiveSkill(normal, worker, "story", true) * 1.35, 5);
    expect(contributionEffectiveSkill(finisher, worker, "story", false))
      .toBeCloseTo(contributionEffectiveSkill(normal, worker, "story", false), 5);
  });

  it("Ensemble Director reaches +45% only with all three core disciplines represented", () => {
    const seed = initialRun("Ensemble Probe", "producer");
    const base = { ...seed.candidates[0], stamina: 100 };
    const writer = { ...base, id: "w", role: "writer" as const };
    const animator = { ...base, id: "a", role: "animator" as const };
    const composer = { ...base, id: "c", role: "composer" as const };
    const project = { ...makeProject(baseDraft(), 0), staffIds: ["w", "a", "c"], stage: "animation" as const, milestone: null };
    const normal = { ...seed, showrunner: "producer" as const, staff: [writer, animator, composer], projects: [project] };
    const ensemble = { ...normal, showrunner: "ensemble" as const };
    expect(contributionEffectiveSkill(ensemble, writer, "story"))
      .toBeCloseTo(contributionEffectiveSkill(normal, writer, "story") * 1.45, 5);
  });
});
