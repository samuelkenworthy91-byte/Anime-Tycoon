import { describe, expect, it } from "vitest";
import { DANTE_HIRE_CHANCE, AVRIL_HIRE_CHANCE, RECENT_WORKER_RECRUITMENT_WEIGHT, rollHire, rollHirePool } from "../careers";
import { DANTE_WORKER_LOOK_INDEX, AVRIL_WORKER_LOOK_INDEX, STANDARD_WORKER_LOOK_INDICES } from "../data";
import {
  RECRUITMENT_AD_BASE_COST,
  RECRUITMENT_AD_COST_STEP,
  initialRun,
  migrateRun,
  recruitmentAdCost,
  refreshRecruitmentAds,
} from "../state";

describe("recruitment adverts", () => {
  it("never repeats a worker appearance within one candidate pool", () => {
    for (let i = 0; i < 100; i += 1) {
      const pool = rollHirePool(i);
      expect(new Set(pool.map((candidate) => candidate.look)).size).toBe(pool.length);
    }
  });

  it("stays unique even when every special-hire roll is identical", () => {
    const pool = rollHirePool(0, 3, () => 0);
    expect(new Set(pool.map((candidate) => candidate.look)).size).toBe(3);
    expect(pool.filter((candidate) => candidate.name === "Dante")).toHaveLength(1);
  });

  it("reserves Dante/Avril while giving every ordinary worker look equal recruitment weight", () => {
    expect(DANTE_HIRE_CHANCE).toBe(0.01);
    expect(AVRIL_HIRE_CHANCE).toBe(0.01);
    expect(RECENT_WORKER_RECRUITMENT_WEIGHT).toBe(0);
    expect(STANDARD_WORKER_LOOK_INDICES).not.toContain(DANTE_WORKER_LOOK_INDEX);
    expect(STANDARD_WORKER_LOOK_INDICES).not.toContain(AVRIL_WORKER_LOOK_INDEX);

    let x = 0x6d2b79f5;
    const rng = () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4_294_967_296;
    };
    const counts = new Map(STANDARD_WORKER_LOOK_INDICES.map((look) => [look, 0]));
    for (let i = 0; i < 12_000; i += 1) {
      const candidate = rollHire(0, rng);
      if (candidate.name === "Dante" || candidate.name === "Avril" || candidate.look === undefined) continue;
      counts.set(candidate.look, (counts.get(candidate.look) ?? 0) + 1);
    }
    const values = [...counts.values()];
    expect(values.every((count) => count > 0)).toBe(true);
    const mean = values.reduce((sum, count) => sum + count, 0) / values.length;
    // Deterministic broad tolerance: catches the former 65% recent-art bias
    // while avoiding a flaky pseudo-random exact-frequency assertion.
    expect(Math.min(...values)).toBeGreaterThan(mean * 0.65);
    expect(Math.max(...values)).toBeLessThan(mean * 1.35);
  });

  it("increases the price for each refresh during the same month", () => {
    let run = { ...initialRun("Ads", "steady"), cash: 100_000 };
    expect(recruitmentAdCost(run)).toBe(RECRUITMENT_AD_BASE_COST);

    run = refreshRecruitmentAds(run)!;
    expect(run.cash).toBe(100_000 - RECRUITMENT_AD_BASE_COST);
    expect(recruitmentAdCost(run)).toBe(RECRUITMENT_AD_BASE_COST + RECRUITMENT_AD_COST_STEP);

    run = refreshRecruitmentAds(run)!;
    expect(run.cash).toBe(100_000 - RECRUITMENT_AD_BASE_COST - (RECRUITMENT_AD_BASE_COST + RECRUITMENT_AD_COST_STEP));
    expect(recruitmentAdCost(run)).toBe(RECRUITMENT_AD_BASE_COST + RECRUITMENT_AD_COST_STEP * 2);
  });

  it("returns to the base price at the start of a new month", () => {
    const refreshed = refreshRecruitmentAds({ ...initialRun("Ads", "steady"), cash: 100_000 })!;
    const nextMonth = { ...refreshed, week: 4 };
    expect(recruitmentAdCost(nextMonth)).toBe(RECRUITMENT_AD_BASE_COST);
    const next = refreshRecruitmentAds(nextMonth)!;
    expect(next.recruitmentAdMonth).toBe(1);
    expect(next.recruitmentAdRefreshes).toBe(1);
  });

  it("loads old saves at the base monthly price", () => {
    const legacy = initialRun("Old Ads", "steady") as Partial<ReturnType<typeof initialRun>>;
    delete legacy.recruitmentAdRefreshes;
    delete legacy.recruitmentAdMonth;
    legacy.week = 11;
    const loaded = migrateRun(legacy);
    expect(recruitmentAdCost(loaded)).toBe(RECRUITMENT_AD_BASE_COST);
  });

  it("does not charge or replace candidates when cash is insufficient", () => {
    const run = { ...initialRun("Poor Ads", "steady"), cash: RECRUITMENT_AD_BASE_COST - 1 };
    expect(refreshRecruitmentAds(run)).toBeNull();
  });
});
