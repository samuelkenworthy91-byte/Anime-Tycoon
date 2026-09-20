import { describe, expect, it } from "vitest";
import { DANTE_HIRE_CHANCE, AVRIL_HIRE_CHANCE, rollHire, rollHirePool } from "../careers";
import { DANTE_WORKER_LOOK_INDEX, AVRIL_WORKER_LOOK_INDEX, RECENT_WORKER_LOOK_INDICES, STANDARD_WORKER_LOOK_INDICES } from "../data";
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

  it("reserves Dante/Avril while materially favouring the recent worker-art pool", () => {
    expect(DANTE_HIRE_CHANCE).toBe(0.01);
    expect(AVRIL_HIRE_CHANCE).toBe(0.01);
    expect(STANDARD_WORKER_LOOK_INDICES).not.toContain(DANTE_WORKER_LOOK_INDEX);
    expect(STANDARD_WORKER_LOOK_INDICES).not.toContain(AVRIL_WORKER_LOOK_INDEX);
    let x = 0x9e3779b9;
    const rng = () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4_294_967_296;
    };
    const recent = new Set(RECENT_WORKER_LOOK_INDICES);
    const sample = Array.from({ length: 600 }, () => rollHire(0, rng))
      .filter((candidate) => candidate.name !== "Dante" && candidate.name !== "Avril");
    const recentRate = sample.filter((candidate) => recent.has(candidate.look ?? -1)).length / sample.length;
    expect(recentRate).toBeGreaterThan(0.6);
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
