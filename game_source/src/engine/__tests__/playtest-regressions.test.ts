import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SHOWRUNNERS } from "../data";
import { showrunnerImpactSummary } from "../showrunnerImpact";

describe("playtest regression guards", () => {
  it("publishes an exact numeric advantage for every selectable showrunner", () => {
    for (const runner of SHOWRUNNERS) {
      const impact = showrunnerImpactSummary(runner.id);
      expect(impact.name).toBe(runner.name);
      expect(impact.numbers).toMatch(/\d/);
    }
    expect(showrunnerImpactSummary("casting").name).toBe("Ren Mercer");
    expect(showrunnerImpactSummary("casting").numbers).toContain("×1.50");
  });

  it("keeps the collapsed time controls above Office/R&D modals but below major reveals", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    const mobile = readFileSync("src/mobile-layout.css", "utf8");
    expect(app).toContain('z-[60]');
    expect(mobile).toContain('z-index: 60');
    expect(mobile).toContain('safe-area-inset-top');
  });

  it("keeps the worker dossier close target deliberately below the very top edge", () => {
    const css = readFileSync("src/mobile-layout.css", "utf8");
    expect(css).toContain("margin-top: 5px");
    expect(css).toContain("+ 52px");
  });
});
