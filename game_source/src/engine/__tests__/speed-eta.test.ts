import { describe, expect, it } from "vitest";
import { contributionEffectiveSkill, contractSelectionDailyOutputEstimate, initialRun } from "../state";
import {
  LIVE_DAY_MS,
  LIVE_WORK_PULSES_PER_DAY,
  SHOWRUNNER_CONTRACT_PULSE_CHANCE,
  liveWorkPulseGapMs,
  showrunnerContractSkill,
} from "../studioOps";

describe("live speed and contract ETA", () => {
  it("keeps expected contribution checks per in-game day stable at 1x, 4x, 8x and 12x", () => {
    const baseline = (LIVE_DAY_MS / 1) / liveWorkPulseGapMs(1);
    for (const speed of [1, 4, 8, 12]) {
      const checks = (LIVE_DAY_MS / speed) / liveWorkPulseGapMs(speed);
      expect(Math.abs(checks - baseline)).toBeLessThan(0.01);
    }
  });

  it("uses the real 34% showrunner activation rate in a solo contract ETA", () => {
    const r = initialRun("ETA Studio", "steady");
    const contract = r.contracts[0];
    const rawSkill = showrunnerContractSkill(r.showrunner, r.showsMade, contract.type);
    const effectiveSkill = rawSkill * 1.5;
    const expected = LIVE_WORK_PULSES_PER_DAY * SHOWRUNNER_CONTRACT_PULSE_CHANCE * (1 + effectiveSkill / 100);
    const actual = contractSelectionDailyOutputEstimate(r, contract, [], true);
    expect(actual).toBeCloseTo(expected, 5);
  });

  it("makes Steady Hand contributions 50% stronger than the same worker under another showrunner", () => {
    const seed = initialRun("Seed", "vision");
    const worker = { ...seed.candidates[0], stamina: 100 };
    const normal = { ...initialRun("Normal", "vision"), staff: [worker] };
    const steady = { ...initialRun("Steady", "steady"), staff: [worker] };
    const base = contributionEffectiveSkill(normal, worker, "story");
    const boosted = contributionEffectiveSkill(steady, worker, "story");
    expect(boosted).toBeCloseTo(base * 1.5, 5);
  });
});
