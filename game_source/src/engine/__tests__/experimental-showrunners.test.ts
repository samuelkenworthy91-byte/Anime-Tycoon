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
import { criticsIgnoreBalance, polarisedGenreProductionMult } from "../showrunnerPerks";
import { computeResult, seededRng } from "../scoring";

describe("experimental showrunner perks", () => {
  it("Prince of Darkness doubles down on dark identity and is punished by bright identity", () => {
    expect(polarisedGenreProductionMult("prince_darkness", ["horror"])).toBe(1.35);
    expect(polarisedGenreProductionMult("prince_darkness", ["horror", "grimdark"])).toBe(1.70);
    expect(polarisedGenreProductionMult("prince_darkness", ["romance"])).toBe(0.75);
    expect(polarisedGenreProductionMult("prince_darkness", ["romance", "idol"])).toBe(0.50);
    expect(polarisedGenreProductionMult("prince_darkness", ["horror", "romance"])).toBe(1);
  });

  it("Brighter Than the Dawn is the exact mirror", () => {
    expect(polarisedGenreProductionMult("brighter_dawn", ["romance"])).toBe(1.35);
    expect(polarisedGenreProductionMult("brighter_dawn", ["idol", "magical"])).toBe(1.70);
    expect(polarisedGenreProductionMult("brighter_dawn", ["horror"])).toBe(0.75);
    expect(polarisedGenreProductionMult("brighter_dawn", ["vampire", "cosmic_horror"])).toBe(0.50);
    expect(polarisedGenreProductionMult("brighter_dawn", ["slice", "grimdark"])).toBe(1);
  });

  it("Who Needs Balance is the only experimental runner that suppresses ratio judging", () => {
    expect(criticsIgnoreBalance("no_balance")).toBe(true);
    expect(criticsIgnoreBalance("steady")).toBe(false);
  });
});

const GENRES: GenreId[] = ["military", "romance"];
const blend = (i: 0 | 1 | 2, key: "ideal" | "ratio") =>
  GENRES.reduce((sum, genre) => sum + GENRE(genre)[key][i], 0) / GENRES.length;
const IDEAL: [number, number, number] = [0, 1, 2].map((i) => Math.round(blend(i as 0 | 1 | 2, "ideal"))) as [number, number, number];
const RATIO: [number, number, number] = [0, 1, 2].map((i) => blend(i as 0 | 1 | 2, "ratio")) as [number, number, number];
const pools: Record<CastRole, CastMember[]> = { protag: PROTAGONISTS, secondary: SECONDARY, pet: PETS, villain: VILLAINS };
const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];

function makeDraft(): Draft {
  const cast = Object.fromEntries(roles.map((role) => [role, pools[role].find((member) => affinityTier(member, GENRES) === 2)!])) as Record<CastRole, CastMember>;
  return {
    title: "Maximalist Probe",
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
    arcs: ["hook", "finale"].filter((id) => ARCS.some((arc) => arc.id === id)),
    sliders: IDEAL,
    season: 1,
  };
}

function score(showrunner: string) {
  return computeResult({
    draft: makeDraft(),
    points: { story: 70, art: 70, sound: 560 },
    issues: 0,
    hype: 60,
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

describe("Who Needs Balance scoring integration", () => {
  it("removes the production-ratio penalty from an intentionally extreme department mix", () => {
    const normal = score("producer");
    const maximalist = score("no_balance");
    expect(maximalist.quality).toBeGreaterThan(normal.quality);
    expect(maximalist.total).toBeGreaterThanOrEqual(normal.total);
  });
});
