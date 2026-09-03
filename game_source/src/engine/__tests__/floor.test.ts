import { describe, expect, it } from "vitest";
import {
  autoPopInterval,
  floorBubbleValue,
  floorChainMultiplier,
  floorSpawnInterval,
  workerCapacity,
} from "../floor";

describe("staff-driven production floor", () => {
  it("makes better staff act faster", () => {
    expect(autoPopInterval(80)).toBeLessThan(autoPopInterval(40));
    expect(workerCapacity(80, 13_000)).toBeGreaterThan(workerCapacity(40, 13_000));
  });

  it("keeps incoming workload independent of staff skill and team size", () => {
    expect(floorSpawnInterval(1)).toBe(floorSpawnInterval(1));
    expect(floorSpawnInterval(1.2)).toBeLessThan(floorSpawnInterval(1));
  });

  it("makes a larger team capable of clearing more work", () => {
    const solo = workerCapacity(45, 13_000);
    const team = solo + workerCapacity(45, 13_000) + workerCapacity(45, 13_000);
    expect(team).toBeGreaterThan(solo * 2);
  });

  it("does not let skill inflate bubble value", () => {
    expect(floorBubbleValue("story", "story")).toBe(3);
    expect(floorBubbleValue("art", "story")).toBe(2);
    expect(floorBubbleValue("star", "story")).toBe(7);
    expect(floorBubbleValue("bug", "story")).toBe(0);
  });

  it("caps automatic chain scaling at a modest bonus", () => {
    expect(floorChainMultiplier(0)).toBe(1);
    expect(floorChainMultiplier(5)).toBe(1.1);
    expect(floorChainMultiplier(15)).toBe(1.3);
    expect(floorChainMultiplier(99)).toBe(1.3);
  });
});
