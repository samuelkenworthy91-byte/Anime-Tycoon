import { describe, expect, it } from "vitest";
import { initialRun } from "../state";
import { contractQuickPicks } from "../contractQuickPick";

describe("contract quick picks", () => {
  it("separates minimum-resource and fastest-finish selections", () => {
    const run = initialRun("Quick Pick", "steady");
    run.staff = run.candidates.slice(0, 3).map((staff, index) => ({
      ...staff,
      id: `worker-${index}`,
      story: index === 0 ? 96 : index === 1 ? 70 : 45,
      art: index === 0 ? 96 : index === 1 ? 70 : 45,
      sound: index === 0 ? 96 : index === 1 ? 70 : 45,
    }));
    run.contractJobs = [];
    const contract = { ...run.contracts[0], type: "story" as const, target: 70, weeks: 6 };
    const picks = contractQuickPicks(run, contract);
    expect(picks.minimum).not.toBeNull();
    expect(picks.fastest).not.toBeNull();
    expect(picks.minimum!.size).toBeLessThanOrEqual(picks.fastest!.size);
    expect(picks.fastest!.rate).toBeGreaterThanOrEqual(picks.minimum!.rate);
  });

  it("never selects busy workers", () => {
    const run = initialRun("Quick Pick", "steady");
    const [busy, free] = run.candidates.slice(0, 2).map((staff, index) => ({
      ...staff, id: `worker-${index}`, story: 95, art: 95, sound: 95,
    }));
    run.staff = [busy, free];
    run.contractJobs = [{
      id: "existing",
      contract: run.contracts[0],
      staffIds: [busy.id],
      startWeek: 0,
      dueWeek: 10,
      progress: 0,
    }];
    const picks = contractQuickPicks(run, run.contracts[1]);
    expect(picks.minimum?.staffIds).not.toContain(busy.id);
    expect(picks.fastest?.staffIds).not.toContain(busy.id);
  });
});
