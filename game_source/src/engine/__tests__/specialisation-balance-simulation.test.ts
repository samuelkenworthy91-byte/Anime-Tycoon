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
  it("makes each signature rank materially stronger without replacing production craft", () => {
    const baseline = score(170, 1, 101);
    const studio = score(170, 1.08, 101);
    const authority = score(170, 1.15, 101);
    const institution = score(170, 1.25, 101);

    expect(studio.quality).toBeGreaterThan(baseline.quality);
    expect(authority.quality).toBeGreaterThan(studio.quality);
    expect(institution.quality).toBeGreaterThan(authority.quality);
  });

  it("keeps outside-house work viable even at Institution", () => {
    const strongOutside = score(320, 0.90, 202);
    expect(strongOutside.total).toBeGreaterThanOrEqual(21);
  });

  it("lets an Institution turn excellent signature craft into Hall-of-Fame work", () => {
    const signature = score(420, 1.25, 303);
    expect(signature.total).toBeGreaterThanOrEqual(32);
  });

  it("does not let +25% rescue bad direction and unresolved editing into automatic 38–40 scores", () => {
    const flawedSignature = score(700, 1.25, 404, true);
    expect(flawedSignature.total).toBeLessThan(38);
  });

  it("preserves the intended outside penalties as rank rises", () => {
    const studioOutside = score(220, 0.97, 505);
    const authorityOutside = score(220, 0.94, 505);
    const institutionOutside = score(220, 0.90, 505);
    expect(studioOutside.quality).toBeGreaterThan(authorityOutside.quality);
    expect(authorityOutside.quality).toBeGreaterThan(institutionOutside.quality);
  });
});
