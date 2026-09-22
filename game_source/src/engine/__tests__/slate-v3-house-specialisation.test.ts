import { describe, expect, it } from "vitest";
import { addSlatePlan } from "../slate";
import { slateCalendarWarnings, slateStageBlocks } from "../slateCalendar";
import { specialisationProjectEffects } from "../specialisation";
import { initialRun } from "../state";

function houseRun(entries: Array<{ week: number; title: string; score: number; hallOfFame?: boolean }> = []) {
  const run = initialRun("House Studio", "steady");
  run.strategicSpend = [{ id: "studio_specialisation:primary:mecha", label: "Mecha", amount: 0, week: 0 }];
  run.franchises = entries.length ? ({
    house: {
      genres: ["mecha"],
      entries,
    },
  } as unknown as typeof run.franchises) : {};
  return run;
}

describe("House Specialisation swing", () => {
  it("starts at +8% house craft and -3% outside craft", () => {
    const run = houseRun();
    expect(specialisationProjectEffects(run, { genres: ["mecha"] }).scoreMult).toBeCloseTo(1.08);
    expect(specialisationProjectEffects(run, { genres: ["slice"] }).scoreMult).toBeCloseTo(0.97);
    expect(specialisationProjectEffects(run, { genres: ["mecha", "crime"] }).scoreMult).toBeCloseTo(1.08);
  });

  it("reaches +15/-6 at Authority", () => {
    const run = houseRun([
      { week: 1, title: "A", score: 28 },
      { week: 2, title: "B", score: 27 },
      { week: 3, title: "C", score: 23 },
      { week: 4, title: "D", score: 22 },
    ]);
    expect(specialisationProjectEffects(run, { genres: ["mecha"] }).scoreMult).toBeCloseTo(1.15);
    expect(specialisationProjectEffects(run, { genres: ["romance"] }).scoreMult).toBeCloseTo(0.94);
  });

  it("reaches +25/-10 at Institution", () => {
    const run = houseRun([
      { week: 1, title: "A", score: 33, hallOfFame: true },
      { week: 2, title: "B", score: 30 },
      { week: 3, title: "C", score: 29 },
      { week: 4, title: "D", score: 27 },
      { week: 5, title: "E", score: 24 },
      { week: 6, title: "F", score: 23 },
      { week: 7, title: "G", score: 22 },
      { week: 8, title: "H", score: 21 },
    ]);
    expect(specialisationProjectEffects(run, { genres: ["mecha"] }).scoreMult).toBeCloseTo(1.25);
    expect(specialisationProjectEffects(run, { genres: ["romance"] }).scoreMult).toBeCloseTo(0.90);
  });
});

describe("Slate V3 calendar", () => {
  it("works backwards from release into colour-coded production stages", () => {
    let run = initialRun("Calendar Studio", "steady");
    run = addSlatePlan(run, { kind: "original", title: "Tentpole", targetWeek: 30, importance: "tentpole", genres: ["kaiju"] });
    const blocks = slateStageBlocks(run.slatePlans![0]);
    expect(blocks.at(-1)).toMatchObject({ stage: "release", startWeek: 30, endWeek: 30 });
    expect(blocks.map((block) => block.stage)).toEqual(["development", "preprod", "animation", "sound", "post", "marketing", "release"]);
    expect(blocks.find((block) => block.stage === "animation")!.endWeek).toBeLessThan(30);
  });

  it("warns when two planned shows create an animation crunch", () => {
    let run = initialRun("Calendar Studio", "steady");
    run.cash = 5_000_000;
    run = addSlatePlan(run, { kind: "original", title: "A", targetWeek: 30, importance: "tentpole", genres: ["mecha"] });
    run = addSlatePlan(run, { kind: "original", title: "B", targetWeek: 31, importance: "tentpole", genres: ["mecha"] });
    const warnings = slateCalendarWarnings(run, run.slatePlans!);
    expect(warnings.some((warning) => warning.title === "ANIMATION CRUNCH")).toBe(true);
    expect(warnings.some((warning) => warning.title === "AUDIENCE CLASH")).toBe(true);
  });
});
