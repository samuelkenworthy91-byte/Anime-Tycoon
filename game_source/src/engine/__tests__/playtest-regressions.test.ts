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

  it("keeps the APK-style time controls collapsed on every viewport and usable over Office/R&D", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    const css = readFileSync("src/mobile-layout.css", "utf8");
    const mediaStart = css.indexOf("@media (max-width: 600px)");
    const panelRule = css.indexOf(".game-controls-panel {");
    const openRule = css.indexOf(".game-controls-open .game-controls-panel");

    expect(app).toContain('z-[60]');
    expect(app).toContain("controlsOpen");
    expect(panelRule).toBeGreaterThanOrEqual(0);
    expect(openRule).toBeGreaterThanOrEqual(0);
    expect(panelRule).toBeLessThan(mediaStart);
    expect(openRule).toBeLessThan(mediaStart);
    expect(css).toContain("display: none !important");
    expect(css).toContain("display: flex !important");
    expect(css).not.toContain("@media (min-width: 601px), (orientation: landscape)");
    expect(css).toContain("z-index: 60");
    expect(css).toContain("safe-area-inset-top");
  });

  it("keeps the worker dossier close target deliberately below the very top edge", () => {
    const css = readFileSync("src/mobile-layout.css", "utf8");
    expect(css).toContain("margin-top: 5px");
    expect(css).toContain("+ 52px");
  });
});
