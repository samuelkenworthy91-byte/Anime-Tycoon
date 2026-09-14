import { describe, expect, it } from "vitest";
import { initialRun, type RunState } from "../state";
import { genreExperienceMultiplier, genreFamiliarity } from "../careers";
import type { GenreId, Staff } from "../data";
import {
  applyGenreTraining,
  applySkillTraining,
  genreTrainingQuote,
  skillTrainingQuote,
  trainingBlockReason,
} from "../training";

const baseStaff = (over: Partial<Staff> = {}): Staff => ({
  id: "trainer-test",
  name: "Training Test",
  role: "writer",
  story: 55,
  art: 40,
  sound: 35,
  level: 4,
  xp: 500,
  salary: 1_000,
  cost: 10_000,
  stamina: 100,
  portrait: 0,
  potential: 70,
  pendingLevelUps: [],
  morale: 70,
  traits: [],
  spec: "benchmark_none",
  favGenre: undefined,
  genreExperience: {},
  joinedWeek: 0,
  shows: [],
  awardsWon: 0,
  bestShow: null,
  ...over,
});

function runWith(staff = baseStaff(), tier = 3): RunState {
  const r = initialRun("Training Studio", "steady");
  return {
    ...r,
    week: 100,
    cash: 10_000_000,
    rd: 5_000,
    staff: [staff],
    facilities: { ...r.facilities, training: tier },
    genresUnlocked: [...new Set([...r.genresUnlocked, "romance", "slice", "kaiju", "cosmic_horror"] as GenreId[])],
    strategicSpend: [],
    trainingJobs: [],
    contractJobs: [],
    projects: [],
  };
}

describe("instant Training Room overhaul", () => {
  it("scales gains and resource costs sharply by course tier", () => {
    const s = baseStaff();
    const basic = skillTrainingQuote(s, "story", "foundation", 3)!;
    const advanced = skillTrainingQuote(s, "story", "advanced", 3)!;
    const master = skillTrainingQuote(s, "story", "masterclass", 3)!;
    expect([basic.gain, advanced.gain, master.gain]).toEqual([2, 5, 10]);
    expect(advanced.cash).toBeGreaterThan(basic.cash);
    expect(master.cash).toBeGreaterThan(advanced.cash);
    expect(master.rd).toBeGreaterThan(advanced.rd);
  });

  it("makes the same gain more expensive for elite staff", () => {
    const junior = skillTrainingQuote(baseStaff({ story: 50, level: 3 }), "story", "masterclass", 3)!;
    const elite = skillTrainingQuote(baseStaff({ story: 240, level: 18 }), "story", "masterclass", 3)!;
    expect(elite.cash).toBeGreaterThan(junior.cash * 2);
    expect(elite.rd).toBeGreaterThan(junior.rd);
  });

  it("applies a course immediately without creating a timed training job", () => {
    const r = runWith();
    const quote = skillTrainingQuote(r.staff[0], "story", "advanced", 3)!;
    const out = applySkillTraining(r, r.staff[0].id, "story", "advanced")!;
    expect(out.staff[0].story).toBe(60);
    expect(out.trainingJobs).toHaveLength(0);
    expect(out.cash).toBe(r.cash - quote.cash);
    expect(out.rd).toBe(r.rd - quote.rd);
    expect(out.staff[0].lastTrainedWeek).toBe(r.week);
  });

  it("allows one instant paid course per employee per industry week", () => {
    const first = applySkillTraining(runWith(), "trainer-test", "story", "foundation")!;
    expect(trainingBlockReason(first, "trainer-test")).toContain("this week");
    expect(applySkillTraining(first, "trainer-test", "art", "foundation")).toBeNull();
    const nextWeek = { ...first, week: first.week + 1 };
    expect(applySkillTraining(nextWeek, "trainer-test", "art", "foundation")).not.toBeNull();
  });

  it("genre Familiarity removes the harsh novice penalty before production", () => {
    const r = runWith(baseStaff({ genreExperience: {} }), 1);
    const before = genreExperienceMultiplier(genreFamiliarity(r.staff[0], "romance"));
    const out = applyGenreTraining(r, "trainer-test", "romance", "familiarity")!;
    const after = genreExperienceMultiplier(genreFamiliarity(out.staff[0], "romance"));
    expect(before).toBe(0.82);
    expect(out.staff[0].genreExperience?.romance).toBe(2);
    expect(after).toBe(0.96);
  });

  it("competence and specialist courses establish progressively stronger genre readiness", () => {
    let r = runWith(baseStaff({ genreExperience: { romance: 2 } }), 3);
    r = applyGenreTraining(r, "trainer-test", "romance", "competence")!;
    expect(r.staff[0].genreExperience?.romance).toBe(4);
    r = { ...r, week: r.week + 1 };
    r = applyGenreTraining(r, "trainer-test", "romance", "specialist")!;
    expect(r.staff[0].genreExperience?.romance).toBe(8);
    expect(genreExperienceMultiplier(genreFamiliarity(r.staff[0], "romance"))).toBeGreaterThan(1.1);
  });

  it("related-genre retraining is cheaper than an unrelated genre", () => {
    const s = baseStaff({ genreExperience: { romance: 4 } });
    const adjacent = genreTrainingQuote(s, "slice", "familiarity", 3)!;
    const unrelated = genreTrainingQuote(s, "kaiju", "familiarity", 3)!;
    expect(adjacent.adjacencyMult).toBeLessThan(unrelated.adjacencyMult);
    expect(adjacent.cash).toBeLessThan(unrelated.cash);
    expect(adjacent.rd).toBeLessThan(unrelated.rd);
  });

  it("never lowers genuine experience and respects facility/resource gates", () => {
    const s = baseStaff({ genreExperience: { romance: 9 } });
    const r = runWith(s, 1);
    expect(genreTrainingQuote(s, "romance", "familiarity", 1)).toBeNull();
    expect(trainingBlockReason({ ...r, facilities: { ...r.facilities, training: 0 } }, s.id)).toContain("Training Room");
    const poor = { ...r, cash: 0, rd: 0 };
    expect(applySkillTraining(poor, s.id, "story", "foundation")).toBeNull();
  });
});
