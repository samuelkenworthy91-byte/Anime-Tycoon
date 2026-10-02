import { describe, expect, it } from "vitest";
import {
  ARCS,
  GENRES,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  SLOTS,
  VILLAINS,
  type CastMember,
  type Draft,
} from "../data";
import { computeProjectResult, makeProject } from "../projects";
import { seededRng } from "../scoring";

const genre = "mecha" as const;
const animeType = "shonen" as const;

function fitting(pool: readonly CastMember[]) {
  return pool.find((member) => member.type === animeType && member.visibleAff.includes(genre))
    ?? pool.find((member) => member.type === animeType)
    ?? pool[0];
}

function usefulArcs(): string[] {
  const unlocked = ARCS.filter((arc) => !arc.franchiseOnly);
  const preferred = unlocked.filter((arc) => arc.syn?.includes(genre));
  return [...preferred, ...unlocked.filter((arc) => !preferred.includes(arc))]
    .slice(0, 4)
    .map((arc) => arc.id);
}

function goodDraft(): Draft {
  const target = GENRES.find((item) => item.id === genre)!;
  const slot = (Object.entries(SLOTS).find(([, item]) => item.best.includes(genre))?.[0] ?? "prime") as Draft["slot"];
  const protag = fitting(PROTAGONISTS);
  const secondary = fitting(SECONDARY);
  const pet = fitting(PETS);
  const villain = fitting(VILLAINS);
  return {
    title: "Institution Signature",
    medium: "tv",
    budget: "blockbuster",
    scope: "standard",
    slot,
    animeType,
    genres: [genre],
    audience: "teens",
    protag: protag.id,
    protagName: protag.name,
    secondary: secondary.id,
    secondaryName: secondary.name,
    pet: pet.id,
    petName: pet.name,
    villain: villain.id,
    villainName: villain.name,
    arcs: usefulArcs(),
    sliders: [...target.ideal] as [number, number, number],
    season: 1,
  };
}

function score(points: number, multiplier: number, seed: number, flaws = false) {
  const draft = goodDraft();
  if (flaws) {
    draft.sliders = [0, 0, 0];
    draft.arcs = draft.arcs.slice(0, 1);
  }
  const project = makeProject(draft, 100);
  project.points = { story: points, art: points, sound: points };
  project.issues = flaws ? 10 : 0;
  project.hype = flaws ? 10 : 75;
  return computeProjectResult(project, {
    research: [],
    showrunner: "operations",
    comboLevels: {},
    castCombos: [],
    arcCombos: [],
    studioTop: 0,
    reviewExpectation: 24,
    franchises: {},
    fans: 25_000,
    specialisationScoreMult: multiplier,
    rng: seededRng(seed),
  });
}

describe("House Specialisation balance simulation", () => {
  it("keeps a small direct signature scoring edge while production identity carries the real power", () => {
    const baseline = score(170, 1, 101);
    const studio = score(170, 1.02, 101);
    const authority = score(170, 1.03, 101);
    const institution = score(170, 1.04, 101);

    expect(studio.quality).toBeGreaterThan(baseline.quality);
    expect(authority.quality).toBeGreaterThanOrEqual(studio.quality);
    expect(institution.quality).toBeGreaterThanOrEqual(authority.quality);
    expect(institution.quality - baseline.quality).toBeLessThan(3);
  });

  it("keeps outside-house work viable even at Institution", () => {
    const strongOutside = score(320, 0.90, 202);
    expect(strongOutside.total).toBeGreaterThanOrEqual(21);
  });

  it("lets excellent signature craft remain elite without a +25% blanket rescue", () => {
    const baseline = score(420, 1, 303);
    const signature = score(420, 1.04, 303);
    expect(signature.total).toBeGreaterThanOrEqual(baseline.total);
    expect(signature.quality).toBeGreaterThan(baseline.quality);
  });

  it("does not let +25% rescue bad direction and unresolved editing into automatic 38–40 scores", () => {
    const flawedSignature = score(700, 1.04, 404, true);
    expect(flawedSignature.total).toBeLessThan(38);
  });

  it("does not punish excellent work merely for using a genre outside the house identity", () => {
    const outsideStudio = score(220, 1, 505);
    const outsideAuthority = score(220, 1, 505);
    const outsideInstitution = score(220, 1, 505);
    expect(outsideAuthority.quality).toBe(outsideStudio.quality);
    expect(outsideInstitution.quality).toBe(outsideStudio.quality);
  });
});
