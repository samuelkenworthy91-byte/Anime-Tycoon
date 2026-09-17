import { describe, expect, it } from "vitest";
import { initialRun, advanceWeeks, type RunState } from "../src/engine/state";
import { advanceBigThreeWeek, BIG_THREE_MAX_SLOTS } from "../src/engine/bigThree";
import { skillTrainingQuote } from "../src/engine/training";
import { BASE_INTERVENTIONS, CAPABILITY_THRESHOLDS, INVESTMENT_TIERS, interventionQuote } from "../src/engine/spending";
import type { Staff } from "../src/engine/data";

function seeded(seed: number) {
  let x = seed >>> 0 || 0x9e3779b9;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4_294_967_296;
  };
}

function staffAt(skill: number, level: number): Staff {
  const base = initialRun("Audit", "steady").candidates[0];
  return { ...base, story: skill, art: skill, sound: skill, level };
}

function fundedRun(): RunState {
  const base = initialRun("Audit", "steady");
  return {
    ...base,
    cash: 999_000_000,
    rd: 99_999,
    officeLevel: 3,
    facilities: { ...base.facilities, training: 3 },
    strategicSpend: [],
    capitalProjects: [],
  };
}

function rivalOnlyBigThreeCareer(seed: number) {
  const oldRandom = Math.random;
  Math.random = seeded(seed);
  try {
    let run = { ...initialRun(`Big Three Audit ${seed}`, "steady"), cash: 100_000_000 };
    const recognitionWeeks: number[] = [];
    let seen = 0;
    for (let week = 0; week < 12 * 48; week += 1) {
      run = advanceWeeks(run, 1);
      run = advanceBigThreeWeek(run);
      if (run.bigThree.slots.length > seen) {
        for (const slot of run.bigThree.slots.slice(seen)) recognitionWeeks.push(slot.recognisedWeek);
        seen = run.bigThree.slots.length;
      }
    }
    return {
      slots: run.bigThree.slots.length,
      years: recognitionWeeks.map((week) => Math.floor(week / 48) + 1),
      rivalSlots: run.bigThree.slots.filter((slot) => !slot.player).length,
    };
  } finally {
    Math.random = oldRandom;
  }
}

describe("Stage 8 progression audit", () => {
  it("prints the actual late-game sink envelope and rival-only Big Three fill pressure", () => {
    const run = fundedRun();
    const training = [
      { skill: 50, level: 2 },
      { skill: 250, level: 12 },
      { skill: 500, level: 20 },
      { skill: 800, level: 30 },
      { skill: 950, level: 40 },
    ].map(({ skill, level }) => {
      const quote = skillTrainingQuote(staffAt(skill, level), "story", "masterclass", 3)!;
      return { skill, level, cash: quote.cash, rd: quote.rd, gain: quote.gain };
    });

    const polish = BASE_INTERVENTIONS.find((x) => x.id === "final_polish")!;
    const intervention = INVESTMENT_TIERS.map((tier) => {
      const quote = interventionQuote(run, polish, tier.id)!;
      return { tier: tier.id, cash: quote.cost, points: quote.points, cashPerPoint: Math.round(quote.cost / Math.max(1, quote.points)) };
    });

    const careers = Array.from({ length: 16 }, (_, index) => rivalOnlyBigThreeCareer(0x51a8 + index * 977));
    const full = careers.filter((career) => career.slots === BIG_THREE_MAX_SLOTS).length;
    const secondSlotYears = careers.map((career) => career.years[1]).filter((year): year is number => Number.isFinite(year));
    const thirdSlotYears = careers.map((career) => career.years[2]).filter((year): year is number => Number.isFinite(year));
    const median = (values: number[]) => {
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    const report = {
      masterclass: training,
      finalPolish: intervention,
      capabilityMaxPerTrack: CAPABILITY_THRESHOLDS.at(-1),
      capabilityFiveTrackEnvelope: (CAPABILITY_THRESHOLDS.at(-1) ?? 0) * 5,
      bigThree: {
        careers: careers.length,
        fullByYear12: full,
        fullRate: full / careers.length,
        medianSecondSlotYear: median(secondSlotYears),
        medianThirdSlotYear: median(thirdSlotYears),
        samples: careers,
      },
    };
    console.log("STAGE8_PROGRESSION_AUDIT=" + JSON.stringify(report));

    expect(training[4].cash).toBeGreaterThan(training[0].cash * 5);
    expect(training[4].rd).toBeGreaterThan(training[0].rd * 3);
    expect(intervention.at(-1)!.cashPerPoint).toBeGreaterThan(intervention[0].cashPerPoint * 5);
    expect(report.capabilityFiveTrackEnvelope).toBeGreaterThanOrEqual(90_000_000);
    expect(careers.every((career) => career.slots >= 1 && career.slots <= BIG_THREE_MAX_SLOTS)).toBe(true);
    expect(careers.every((career) => career.years[0] === 3)).toBe(true);
    /* Rival-only careers must leave a genuine response window: the seeded
       name opens Year 3, the earliest later consensus is Year 4, and another
       name cannot complete the cultural canon before Year 5. */
    expect(secondSlotYears.every((year) => year >= 4)).toBe(true);
    expect(thirdSlotYears.every((year) => year >= 5)).toBe(true);
    expect(secondSlotYears.length).toBeGreaterThan(0);
    expect(thirdSlotYears.length).toBeGreaterThan(0);
  }, 120_000);
});
