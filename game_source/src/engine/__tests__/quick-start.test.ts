import { describe, expect, it } from "vitest";
import { SHOWRUNNERS } from "../data";
import { randomQuickShowrunnerId, randomQuickStudioName } from "../quickStart";

describe("Quick Start", () => {
  it("generates proper studio names rather than placeholder-style labels", () => {
    const names = Array.from({ length: 10 }, (_, index) => {
      const value = Math.min(0.999999, index / 10 + 0.001);
      return randomQuickStudioName(() => value);
    });
    expect(new Set(names).size).toBeGreaterThanOrEqual(9);
    for (const name of names) {
      expect(name).toMatch(/^[A-Z][A-Za-z ]+ [A-Z][A-Za-z ]+$/);
      expect(name).not.toMatch(/quick|random|studio\s*\d|placeholder/i);
    }
  });

  it("can randomly choose across the live showrunner catalogue", () => {
    expect(randomQuickShowrunnerId(() => 0)).toBe(SHOWRUNNERS[0].id);
    expect(randomQuickShowrunnerId(() => 0.999999)).toBe(SHOWRUNNERS.at(-1)!.id);
    expect(SHOWRUNNERS.map((runner) => runner.id)).toContain(randomQuickShowrunnerId(() => 0.5));
  });
});
