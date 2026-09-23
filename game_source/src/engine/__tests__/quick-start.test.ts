import { describe, expect, it } from "vitest";
import { SHOWRUNNERS } from "../data";
import { randomQuickShowrunnerId, randomQuickStudioName } from "../quickStart";

describe("Quick Start", () => {
  it("generates proper studio names rather than placeholder-style labels", () => {
    const values = [0, 0.11, 0.24, 0.39, 0.51, 0.67, 0.82, 0.99];
    let index = 0;
    const rng = () => values[index++ % values.length];
    const names = Array.from({ length: 12 }, () => randomQuickStudioName(rng));
    expect(new Set(names).size).toBeGreaterThan(4);
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
