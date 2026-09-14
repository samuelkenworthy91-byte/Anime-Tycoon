import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { initialRun, migrateRun, type RunState } from "../state";
import { STAFF_STAT_CAP, type Staff } from "../data";
import { applySkillTraining, skillTrainingQuote } from "../training";
import {
  BASE_INTERVENTIONS,
  CAPABILITY_THRESHOLDS,
  INVESTMENT_TIERS,
  interventionQuote,
  productionCapabilities,
} from "../spending";
import {
  SECONDARY_SPECIALISATION_CASH,
  SECONDARY_SPECIALISATION_RD,
  choosePrimarySpecialisation,
  specialisationProjectEffects,
} from "../specialisation";
import {
  BIG_THREE_BREAKOUT_REACH,
  BIG_THREE_MIN_CRAFT_FLOOR,
  BIG_THREE_MIN_MOMENTUM,
  BIG_THREE_MIN_REACH,
  BIG_THREE_MIN_SCORE,
  bigThreeQualifies,
} from "../bigThree";
import {
  INSOLVENCY_MONTH_WEEKS,
  INSOLVENCY_SHUTDOWN_WEEKS,
  applyWeeklyInsolvency,
} from "../insolvency";

function staffAt(rawSkill: number, level = 1): Staff {
  const base = initialRun("Stage 8 Training", "steady").candidates[0];
  return {
    ...base,
    story: rawSkill,
    art: rawSkill,
    sound: rawSkill,
    level,
    lastTrainedWeek: undefined,
  };
}

function fundedRun(): RunState {
  const base = initialRun("Stage 8", "steady");
  return {
    ...base,
    cash: 999_000_000,
    rd: 99_999,
    officeLevel: 3,
    facilities: { ...base.facilities, training: 3 },
    capitalProjects: [],
    strategicSpend: [],
  };
}

describe("Stage 8 migration and save hardening", () => {
  it("migrates a pre-Stage-4/5/6/7-shaped save additively without losing core career state", () => {
    const base = initialRun("Legacy Studio", "steady");
    const veteran = { ...base.candidates[0], story: 187, art: 144, sound: 121 };
    const raw = JSON.parse(JSON.stringify({
      ...base,
      week: 301,
      day: 2107,
      cash: 1_234_567,
      rd: 321,
      officeLevel: 3,
      showsMade: 18,
      staff: [veteran],
      candidates: [],
    })) as Record<string, unknown>;

    delete raw.bigThree;
    delete raw.strategicSpend;
    delete raw.capitalProjects;
    delete raw.staffContracts;
    delete raw.recruitmentAdRefreshes;
    delete raw.recruitmentAdMonth;

    const migrated = migrateRun(raw);
    expect(migrated.studio).toBe("Legacy Studio");
    expect(migrated.week).toBe(301);
    expect(migrated.cash).toBe(1_234_567);
    expect(migrated.rd).toBe(321);
    expect(migrated.officeLevel).toBe(3);
    expect(migrated.showsMade).toBe(18);
    expect(migrated.staff).toHaveLength(1);
    expect(migrated.staff[0].story).toBe(187);
    expect(migrated.bigThree.slots).toEqual([]);
    expect(migrated.strategicSpend).toEqual([]);
    expect(migrated.capitalProjects).toEqual([]);
    expect(migrated.staffContracts).toEqual({});
  });

  it("is stable across JSON save/reload and a second migration pass", () => {
    const original = fundedRun();
    const once = migrateRun(JSON.parse(JSON.stringify(original)));
    const twice = migrateRun(JSON.parse(JSON.stringify(once)));
    expect(twice.studio).toBe(once.studio);
    expect(twice.week).toBe(once.week);
    expect(twice.cash).toBe(once.cash);
    expect(twice.rd).toBe(once.rd);
    expect(twice.bigThree).toEqual(once.bigThree);
    expect(twice.strategicSpend).toEqual(once.strategicSpend);
  });
});

describe("Stage 8 training economy hardening", () => {
  it("makes elite raw-skill mastery materially more expensive in both cash and RD", () => {
    const junior = skillTrainingQuote(staffAt(50), "story", "masterclass", 3)!;
    const veteran = skillTrainingQuote(staffAt(250, 12), "story", "masterclass", 3)!;
    const master = skillTrainingQuote(staffAt(800, 30), "story", "masterclass", 3)!;

    expect(veteran.cash).toBeGreaterThan(junior.cash * 2);
    expect(master.cash).toBeGreaterThan(veteran.cash * 2);
    expect(veteran.rd).toBeGreaterThan(junior.rd);
    expect(master.rd).toBeGreaterThan(veteran.rd * 1.5);
    expect(master.after).toBeLessThanOrEqual(STAFF_STAT_CAP);
  });

  it("enforces the one-paid-course-per-employee-per-week anti-spam rule", () => {
    const run = fundedRun();
    const worker = staffAt(80);
    const ready = { ...run, staff: [worker] };
    const first = applySkillTraining(ready, worker.id, "story", "masterclass");
    expect(first).not.toBeNull();
    const second = applySkillTraining(first!, worker.id, "art", "masterclass");
    expect(second).toBeNull();
  });
});

describe("Stage 8 production-investment hardening", () => {
  it("keeps every higher intervention tier less efficient per craft point than the tier below", () => {
    const run = fundedRun();
    const intervention = BASE_INTERVENTIONS.find((x) => x.id === "writing_overhaul")!;
    const quotes = INVESTMENT_TIERS.map((tier) => interventionQuote(run, intervention, tier.id)!).filter(Boolean);
    const costPerPoint = quotes.map((quote) => quote.cost / Math.max(1, quote.points));
    for (let i = 1; i < costPerPoint.length; i += 1) {
      expect(costPerPoint[i]).toBeGreaterThan(costPerPoint[i - 1]);
    }
    expect(costPerPoint.at(-1)!).toBeGreaterThan(costPerPoint[0] * 5);
  });

  it("puts Studio-3 obsessive finishing into seven-figure territory without turning permanent capability into a giant passive buff", () => {
    const run = fundedRun();
    const polish = BASE_INTERVENTIONS.find((x) => x.id === "final_polish")!;
    const obsessive = interventionQuote(run, polish, "obsessive")!;
    expect(obsessive.cost).toBeGreaterThanOrEqual(1_000_000);

    const maxSpend = CAPABILITY_THRESHOLDS.at(-1)!;
    const maxed = {
      ...run,
      strategicSpend: BASE_INTERVENTIONS.filter((x) => x.capability).map((x, index) => ({
        id: `cap-${index}`,
        label: x.name,
        amount: maxSpend,
        week: 1,
      })),
    };
    for (const capability of productionCapabilities(maxed)) {
      expect(capability.level).toBeLessThanOrEqual(8);
      expect(capability.effect).toContain("16%");
    }
    expect(maxSpend * 5).toBeGreaterThanOrEqual(90_000_000);
  });
});

describe("Stage 8 specialisation hardening", () => {
  it("is mastery, not safety: first-rank signature gains stay modest and outside work remains viable", () => {
    const base = fundedRun();
    const genre = base.genresUnlocked[0];
    const specialised = choosePrimarySpecialisation({ ...base, officeLevel: 1 }, genre)!;
    const signature = specialisationProjectEffects(specialised, { genres: [genre] });
    const outsideGenre = base.genresUnlocked.find((g) => g !== genre)!;
    const outside = specialisationProjectEffects(specialised, { genres: [outsideGenre] });

    expect(signature.outputMult).toBeGreaterThan(1);
    expect(signature.outputMult).toBeLessThanOrEqual(1.04);
    expect(signature.interventionCostMult).toBeGreaterThanOrEqual(0.95);
    expect(outside.outputMult).toBeGreaterThanOrEqual(0.99);
    expect(outside.interventionCostMult).toBeLessThanOrEqual(1.03);
    expect(SECONDARY_SPECIALISATION_CASH).toBeGreaterThanOrEqual(2_500_000);
    expect(SECONDARY_SPECIALISATION_RD).toBeGreaterThanOrEqual(450);
  });
});

describe("Stage 8 Big Three rarity guards", () => {
  const threshold = {
    score: BIG_THREE_MIN_SCORE,
    reach: BIG_THREE_MIN_REACH,
    craftFloor: BIG_THREE_MIN_CRAFT_FLOOR,
    momentum: BIG_THREE_MIN_MOMENTUM,
    culturalScore: 0,
  };

  it("requires all core dimensions rather than allowing one huge number to brute-force recognition", () => {
    expect(bigThreeQualifies(threshold)).toBe(true);
    expect(bigThreeQualifies({ ...threshold, score: BIG_THREE_MIN_SCORE - 1, reach: 2_000_000 })).toBe(false);
    expect(bigThreeQualifies({ ...threshold, craftFloor: BIG_THREE_MIN_CRAFT_FLOOR - 1, reach: 2_000_000 })).toBe(false);
    expect(bigThreeQualifies({ ...threshold, reach: BIG_THREE_MIN_REACH - 1, momentum: 100 })).toBe(false);
    expect(bigThreeQualifies({ ...threshold, momentum: BIG_THREE_MIN_MOMENTUM - 1 })).toBe(false);
    expect(bigThreeQualifies({ ...threshold, momentum: 0, reach: BIG_THREE_BREAKOUT_REACH })).toBe(true);
  });

  it("does not let a merely excellent 33/40 release become Big Three regardless of audience hype", () => {
    expect(bigThreeQualifies({
      score: 33,
      reach: 1_000_000,
      craftFloor: 80,
      momentum: 100,
      culturalScore: 999,
    })).toBe(false);
  });
});

describe("Stage 8 insolvency contract", () => {
  it("issues the landlord reprieve after one month and shuts down only after two full negative months", () => {
    let run = { ...fundedRun(), cash: -1, negativeCashWeeks: 0 } as RunState;
    for (let week = 1; week <= INSOLVENCY_SHUTDOWN_WEEKS; week += 1) {
      const out = applyWeeklyInsolvency(run);
      run = out.run;
      expect(out.shutdown).toBe(week >= INSOLVENCY_SHUTDOWN_WEEKS);
      expect(out.reprieveIssued).toBe(week === INSOLVENCY_MONTH_WEEKS);
    }
    expect(INSOLVENCY_MONTH_WEEKS).toBe(4);
    expect(INSOLVENCY_SHUTDOWN_WEEKS).toBe(8);
  });

  it("clears the shutdown streak immediately when the studio returns to solvency", () => {
    const run = { ...fundedRun(), cash: 1, negativeCashWeeks: 7 } as RunState;
    const out = applyWeeklyInsolvency(run);
    expect(out.recovered).toBe(true);
    expect(out.weeksNegative).toBe(0);
    expect(out.shutdown).toBe(false);
  });
});

describe("Stage 8 Pixel portrait layout guards", () => {
  it("keeps employee dossiers inside dynamic viewport safe areas with a pinned escape control", () => {
    const css = readFileSync("src/mobile-layout.css", "utf8");
    expect(css).toContain("env(safe-area-inset-top");
    expect(css).toContain("env(safe-area-inset-bottom");
    expect(css).toContain("100dvh");
    expect(css).toContain("position: sticky");
    expect(css).toContain("min-width: 36px");
    expect(css).toContain("min-height: 36px");
  });

  it("keeps the Big Three cinematic vertically scrollable and safe-area aware on Pixel portrait", () => {
    const reveal = readFileSync("src/components/BigThreeReveal.tsx", "utf8");
    expect(reveal).toContain("overflow-y-auto");
    expect(reveal).toContain("safe-area-inset-top");
    expect(reveal).toContain("safe-area-inset-bottom");
    expect(reveal).toContain("grid-cols-3");
    expect(reveal).toContain("min-h-[160px]");
  });
});
