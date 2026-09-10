import { describe, expect, it } from "vitest";
import { initialRun } from "../state";
import {
  applyWeeklyInsolvency,
  INSOLVENCY_MONTH_WEEKS,
  INSOLVENCY_SHUTDOWN_WEEKS,
} from "../insolvency";

describe("studio insolvency", () => {
  it("allows a full first month below zero before the landlord's final reprieve", () => {
    let run = { ...initialRun("Debt Spiral", "steady"), cash: -1 };
    let update = applyWeeklyInsolvency(run);
    run = update.run;

    for (let week = 2; week < INSOLVENCY_MONTH_WEEKS; week += 1) {
      update = applyWeeklyInsolvency(run);
      run = update.run;
      expect(update.shutdown).toBe(false);
      expect(update.reprieveIssued).toBe(false);
    }

    update = applyWeeklyInsolvency(run);
    expect(update.weeksNegative).toBe(4);
    expect(update.reprieveIssued).toBe(true);
    expect(update.shutdown).toBe(false);
    expect(update.run.notices.at(-1)).toContain("ONE MONTH");
  });

  it("shuts the studio after eight consecutive negative-cash weeks", () => {
    let run = { ...initialRun("Lease End", "steady"), cash: -25_000 };
    let update = applyWeeklyInsolvency(run);

    for (let week = 2; week <= INSOLVENCY_SHUTDOWN_WEEKS; week += 1) {
      update = applyWeeklyInsolvency(update.run);
    }

    expect(update.weeksNegative).toBe(8);
    expect(update.shutdown).toBe(true);
    expect(update.run.notices.at(-1)).toContain("LEASE TERMINATED");
  });

  it("fully resets the countdown as soon as the studio returns to solvency", () => {
    let run = { ...initialRun("Recovery", "steady"), cash: -10_000 };
    for (let week = 0; week < 6; week += 1) run = applyWeeklyInsolvency(run).run;

    const recovered = applyWeeklyInsolvency({ ...run, cash: 500 });
    expect(recovered.recovered).toBe(true);
    expect(recovered.weeksNegative).toBe(0);
    expect(recovered.shutdown).toBe(false);

    const newDebt = applyWeeklyInsolvency({ ...recovered.run, cash: -50 });
    expect(newDebt.weeksNegative).toBe(1);
  });
});
