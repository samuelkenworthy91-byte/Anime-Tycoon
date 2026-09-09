import { describe, expect, it } from "vitest";
import { GENRES, comboKey, type Draft, type GenreId, type Staff } from "../data";
import { SINGLE_GENRE_DIRECTION, genreTargetFor } from "../genreTargets";
import {
  AUDIENCE_TEST_DAYS,
  initialRun,
  startTestAudience,
  tickStudioDay,
  type RunState,
} from "../state";

const staff = (): Staff => ({
  id: "panel-worker",
  name: "Panel Worker",
  role: "writer",
  story: 80,
  art: 55,
  sound: 45,
  level: 1,
  stamina: 100,
  salary: 500,
  cost: 5000,
  portrait: 0,
});

const draft = (title: string): Draft => ({
  title,
  medium: "fanweb",
  budget: "indie",
  scope: "standard",
  slot: "web",
  animeType: "shonen",
  genres: ["romance", "slice"],
  audience: "teens",
  protag: "hana",
  protagName: "Hana",
  secondary: "s_ice",
  pet: "p_mochi",
  villain: "v_lovelace",
  arcs: ["festival", "confession"],
  sliders: [50, 50, 50],
  season: 1,
});

const result = {
  reviews: [], total: 24, tier: "solid" as const, hallOfFame: false,
  points: { story: 20, art: 20, sound: 20 }, issues: 1,
  revenue: 1000, fans: 100, costs: 1000, rd: 0, sales: [1],
  commercial: { id: "niche", label: "NICHE FOLLOWING", index: 1 },
  breakdown: [], comboLevel: 1, newCombo: false, chemMult: 1,
  chemDiscovered: [], secretDiscovered: false, quality: 22,
  arcCombosDiscovered: [],
};

function finishOnePanel(run: RunState): RunState {
  let next = startTestAudience(run)!;
  for (let i = 0; i < AUDIENCE_TEST_DAYS; i++) {
    next = { ...next, day: next.day + 1 };
    next = tickStudioDay(next).run;
  }
  return next;
}

describe("hard-mode direction fingerprints", () => {
  it("has one explicit target for every active genre and keeps every single target unique", () => {
    const ids = GENRES.map((g) => g.id);
    expect(Object.keys(SINGLE_GENRE_DIRECTION).sort()).toEqual([...ids].sort());
    const triples = ids.map((id) => genreTargetFor([id]).ideal.join(","));
    expect(new Set(triples).size).toBe(ids.length);
  });

  it("keeps the closest two single-genre fingerprints meaningfully separated", () => {
    const ids = GENRES.map((g) => g.id);
    let minimum = Infinity;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = genreTargetFor([ids[i]]).ideal;
      const b = genreTargetFor([ids[j]]).ideal;
      const distance = Math.sqrt(a.reduce((sum, v, k) => sum + (v - b[k]) ** 2, 0));
      minimum = Math.min(minimum, distance);
    }
    expect(minimum).toBeGreaterThanOrEqual(9);
  });

  it("gives all 253 two-genre combinations distinct exact slider triples", () => {
    const ids = GENRES.map((g) => g.id);
    const triples = new Set<string>();
    let count = 0;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      triples.add(genreTargetFor([ids[i], ids[j]] as GenreId[]).ideal.join(","));
      count++;
    }
    expect(count).toBe(253);
    expect(triples.size).toBe(253);
  });
});

describe("test-audience exact combo learning", () => {
  it("counts distinct released series, not repeated panels on the same release", () => {
    let run: RunState = {
      ...initialRun("Audience Lab", "steady"),
      staff: [staff()],
      showsMade: 1,
      lastDraft: draft("Series One"),
      lastResult: result,
    };
    run = finishOnePanel(run);
    run = finishOnePanel(run); // second finding from same show: still one tested series
    const key = comboKey(["romance", "slice"]);
    expect(run.audienceComboSeries[key]).toHaveLength(1);

    run = { ...run, showsMade: 2, lastDraft: draft("Series Two"), lastResult: result };
    run = finishOnePanel(run);
    run = { ...run, showsMade: 3, lastDraft: draft("Series Three"), lastResult: result };
    run = finishOnePanel(run);
    expect(run.audienceComboSeries[key]).toHaveLength(3);
  });
});
