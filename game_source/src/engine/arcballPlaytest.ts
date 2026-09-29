import { ensureCareer, rollHirePool } from "./careers";
import { createFranchise } from "./franchise";
import { activateArcball, arcballStateOf } from "./arcball";
import { initialRun, type RunState } from "./state";
import type { Draft, Staff, StaffRole } from "./data";

function rngFactory(seed = 0x51a7e) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CURATED = [
  { id: "arcball_playtest_55",  name: "Casey Rook", role: "writer" as StaffRole,   story: 58, art: 36, sound: 31, potential: 72 },
  { id: "arcball_playtest_354", name: "Mara Bell", role: "animator" as StaffRole, story: 33, art: 61, sound: 28, potential: 66 },
  { id: "arcball_playtest_346", name: "Aiko Chen", role: "animator" as StaffRole, story: 52, art: 86, sound: 44, potential: 91 },
  { id: "arcball_playtest_344", name: "Ren Park", role: "composer" as StaffRole,  story: 42, art: 37, sound: 82, potential: 88 },
  /* Deliberately poor production worker / excellent current Arcball striker. */
  { id: "arcball_playtest_860", name: "Danny Kim", role: "writer" as StaffRole,   story: 24, art: 19, sound: 21, potential: 38 },
  { id: "arcball_playtest_311", name: "Mika Ito", role: "composer" as StaffRole, story: 39, art: 34, sound: 59, potential: 57 },
  { id: "arcball_playtest_302", name: "Tom Hughes", role: "writer" as StaffRole,  story: 67, art: 31, sound: 29, potential: 74 },
] as const;

function buildWorkers(): Staff[] {
  const templates = rollHirePool(48, CURATED.length, rngFactory());
  return CURATED.map((spec, index) => ensureCareer({
    ...templates[index],
    ...spec,
    stamina: index === 2 ? 68 : 100,
    morale: 75,
    creatorFans: index === 4 ? 18_000 : index === 2 ? 9_000 : 1_500,
    joinedWeek: 0,
    salary: Math.max(900, templates[index].salary),
    cost: 0,
  }, 0));
}

function playtestFranchise() {
  const draft: Draft = {
    title: "Neon Strikers",
    medium: "tv",
    budget: "standard",
    scope: "standard",
    slot: "prime",
    animeType: "shonen",
    genres: ["sports"],
    audience: "teens",
    protag: "arc_hero",
    protagName: "Kai",
    secondary: "arc_rival",
    secondaryName: "Rei",
    pet: "arc_mascot",
    petName: "Bolt",
    villain: "arc_champ",
    villainName: "Vex",
    arcs: [],
    sliders: [55, 50, 60],
    season: 1,
  };
  return createFranchise(
    "Neon Strikers",
    draft,
    {
      protag: draft.protag,
      protagName: draft.protagName,
      secondary: draft.secondary,
      secondaryName: draft.secondaryName ?? "Rei",
      pet: draft.pet,
      petName: draft.petName ?? "Bolt",
      villain: draft.villain,
      villainName: draft.villainName ?? "Vex",
    },
    { total: 33, revenue: 1_450_000, fans: 82_000, hallOfFame: true, sourceId: "arc_playtest_release" },
    0,
  );
}

/** Branch-only save used by the dedicated Arcball APK.
 *  It is intentionally rich enough to exercise every reward tier immediately
 *  without changing the balance of ordinary careers. */
export function createArcballPlaytestRun(): RunState {
  let run: RunState = {
    ...initialRun("Arcball Test Studio", "steady"),
    officeLevel: 1,
    cash: 1_500_000,
    fans: 75_000,
    rd: 220,
    staff: buildWorkers(),
    candidates: [],
    research: ["staff_appraisal", "talent_scouting", "merch"],
    researchTrackLevels: { business: 5 },
    genresUnlocked: ["slice", "fantasy", "sports"],
    mediumsUnlocked: ["fanweb", "tv"],
    franchises: { "Neon Strikers": playtestFranchise() },
    showsMade: 3,
    hits: 1,
    bestScore: 33,
    totalRevenue: 2_400_000,
    notices: ["🧪 ARCBALL PLAYTEST SAVE — Arcball is unlocked, a fixture is ready, and reward currency is preloaded."],
  };

  run = activateArcball(run) ?? run;
  let arcball = arcballStateOf(run);
  const firstPlayerFixture = arcball.fixtures.find((fixture) => fixture.homeId === "player" || fixture.awayId === "player");
  const targetWeek = firstPlayerFixture?.week ?? 2;

  arcball = {
    ...arcball,
    tokens: 180,
    championshipSpotlights: 1,
  };

  return {
    ...run,
    week: targetWeek,
    day: targetWeek * 7,
    arcball,
    notices: [
      ...run.notices,
      "⚽ TEST TARGETS: play the due fixture, compare Danny Kim's poor production craft to his strong Arcball rating, spend Tokens in Training/Rewards, and try the Championship Spotlight on Neon Strikers.",
    ].slice(-40),
  };
}
