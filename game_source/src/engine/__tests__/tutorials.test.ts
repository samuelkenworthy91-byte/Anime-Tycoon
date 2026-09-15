import { describe, expect, it } from "vitest";
import { initialRun } from "../state";
import { markTutorialSeen, tutorialSeen } from "../tutorials";

describe("first-seen tutorials", () => {
  it("treats old saves without tutorial metadata as unseen", () => {
    const run = initialRun("Tutorial Test", "steady");
    expect(tutorialSeen(run, "working-policies")).toBe(false);
  });

  it("persists an acknowledgement without duplicating ids", () => {
    let run = initialRun("Tutorial Test", "steady");
    run = markTutorialSeen(run, "overseas-markets");
    run = markTutorialSeen(run, "overseas-markets");
    expect(tutorialSeen(run, "overseas-markets")).toBe(true);
    expect(run.tutorialsSeen).toEqual(["overseas-markets"]);
  });
});
