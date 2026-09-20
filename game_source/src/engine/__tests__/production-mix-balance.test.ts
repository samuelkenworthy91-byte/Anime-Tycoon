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
import { computeResult, seededRng } from "../scoring";

const GENRES: GenreId[] = ["romance", "military"];
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

function draft(): Draft {
  const cast = Object.fromEntries(
    roles.map((role) => [role, pools[role].find((member) => affinityTier(member, GENRES) === 2)!])
  ) as Record<CastRole, CastMember>;
  return {
    title: "Department Mix Probe",
    medium: "tv",
    budget: "standard",
    scope: "standard",
    slot: MEDIUMS.tv.slot ?? "midnight",
    animeType: "shonen",
    genres: GENRES,
    audience: "teens",
    protag: cast.protag.id,
    protagName: cast.protag.name,
    secondary: cast.secondary.id,
    pet: cast.pet.id,
    villain: cast.villain.id,
    arcs: ["hook", "confession", "finale"].filter((id) => ARCS.some((arc) => arc.id === id)),
    sliders: IDEAL,
    season: 1,
  };
}

function score(points: { story: number; art: number; sound: number }) {
  return computeResult({
    draft: draft(),
    points,
    issues: 0,
    hype: 60,
    research: [],
    showrunner: "steady",
    genreIdeal: IDEAL,
    genreRatio: RATIO,
    comboLevel: 0,
    newCombo: false,
    comboDiscovered: true,
    castCombos: [],
    arcCombos: [],
    studioTop: 0,
    reviewExpectation: 35,
    franchiseMult: 1,
    costs: 100_000,
    fanBase: 1_000,
    rng: seededRng(77),
  });
}

describe("Story / Art / Sound specialisation balance", () => {
  it("lets a great soundtrack compensate for weaker animation at the same overall output", () => {
    const artHeavy = score({ story: 200, art: 320, sound: 80 });
    const soundHeavy = score({ story: 200, art: 80, sound: 320 });

    expect(Math.abs(artHeavy.quality - soundHeavy.quality)).toBeLessThanOrEqual(0.8);
    expect(Math.abs(artHeavy.total - soundHeavy.total)).toBeLessThanOrEqual(2);
  });

  it("keeps genre point ratios as a minor influence rather than a quality gate", () => {
    const total = 600;
    const target = score({
      story: Math.round(total * RATIO[0]),
      art: Math.round(total * RATIO[1]),
      sound: total - Math.round(total * RATIO[0]) - Math.round(total * RATIO[1]),
    });
    const highlySpecialised = score({ story: 100, art: 100, sound: 400 });

    expect(target.quality - highlySpecialised.quality).toBeLessThanOrEqual(1);
    expect(highlySpecialised.breakdown.some((row) => row.label.includes("minor influence"))).toBe(true);
  });
});
