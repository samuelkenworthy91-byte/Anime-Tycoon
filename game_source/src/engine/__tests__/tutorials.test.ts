import { describe, expect, it } from "vitest";
import { initialRun, migrateRun } from "../state";
import { markTutorialSeen, tutorialSeen } from "../tutorials";

describe("first-seen tutorials", () => {
  it("treats old saves without tutorial metadata as unseen", () => {
    const run = initialRun("Tutorial Test", "steady");
    delete run.tutorialsSeen;
    const migrated = migrateRun(run);
    expect(tutorialSeen(migrated, "overseas-markets")).toBe(false);
  });

  it("persists an acknowledgement without duplicating ids", () => {
    let run = initialRun("Tutorial Test", "steady");
    run = markTutorialSeen(run, "overseas-markets");
    run = markTutorialSeen(run, "overseas-markets");
    expect(tutorialSeen(run, "overseas-markets")).toBe(true);
    expect(run.tutorialsSeen).toEqual(["overseas-markets"]);
  });

  it("keeps QoL tutorial topics independently acknowledgeable", () => {
    let run = initialRun("Tutorial Test", "steady");
    for (const id of ["studio-knowledge", "franchise-library", "auto-manage", "production-capability", "rights-market"] as const) run = markTutorialSeen(run, id);
    expect(run.tutorialsSeen).toEqual(["studio-knowledge", "franchise-library", "auto-manage", "production-capability", "rights-market"]);
  });
});
