import { describe, expect, it } from "vitest";
import {
  RESEARCH,
  CAST_V2,
} from "../data";
import {
  initialRun,
  startResearchProject,
  researchBlockReason,
  advanceWeeks,
  tickStudioDay,
  TALENT_ANALYSIS_ID,
  allCastProfiled,
  undiscoveredProfileIds,
  profileableCastIds,
} from "../state";
import { catalogHasSecret, isCastingActive } from "../castCatalog";
import {
  MERCH_CAPABILITY_RESEARCH,
  MERCH_PRODUCTS,
  createFranchise,
  merchBlock,
  merchProductById,
  type Franchise,
} from "../franchise";

/* ------------------------------------------------------------ helpers */

const richRun = (over: never[] | Record<string, unknown> = {}) =>
  ({
    ...initialRun("Test", "steady"),
    cash: 50_000_000,
    rd: 5_000,
    ...over,
  }) as ReturnType<typeof initialRun>;

const TEST_RESULT = {
  points: { story: 30, art: 30, sound: 30 },
  quality: 7, total: 34, tier: "Golden" as const, hallOfFame: true,
  fans: 500_000, revenue: 100_000,
  reviews: [{ quote: "q", outlet: "o", score: 8 }],
};

const warmFr = (over: Partial<Franchise> = {}): Franchise => ({
  ...createFranchise(
    "IP",
    {
      title: "IP", genres: ["sports"], medium: "tv", budget: "standard", slot: "midnight",
      animeType: "shonen", audience: "teens", protag: "hero", protagName: "Aki",
      secondary: "", pet: "", villain: "warlord", arcs: [], sliders: [50, 50, 50], season: 1,
    },
    { protag: "hero", protagName: "Aki", secondary: "rival", pet: "none", villain: "warlord" } as never,
    TEST_RESULT as never,
    10
  ),
  ...over,
});

/* ---------------------------------------------- merch research (PART D) */

describe("merch research identity", () => {
  it("MERCH DIVISION is the capability research every line requires", () => {
    expect(MERCH_CAPABILITY_RESEARCH).toBe("merch");
    const r = RESEARCH.find((x) => x.id === "merch")!;
    expect(r).toBeTruthy();
  });

  it("every merch product maps to exactly one named research in R&D", () => {
    for (const p of MERCH_PRODUCTS) {
      expect(p.research).toBeTruthy();
      const def = RESEARCH.find((x) => x.id === p.research);
      expect(def, `${p.label} research ${p.research} missing from RESEARCH`).toBeTruthy();
      expect(p.researchName).toBe(def!.name);
      expect(def!.section).toBe("merch");
      expect(def!.requires).toBe(MERCH_CAPABILITY_RESEARCH);
    }
  });

  it("the five required individual lines exist with sane costs", () => {
    const want = ["merch_plush", "merch_soundtrack", "merch_figures", "merch_apparel", "merch_collectors"];
    for (const id of want) {
      const def = RESEARCH.find((x) => x.id === id);
      expect(def, id).toBeTruthy();
      expect(def!.rd).toBeGreaterThan(0);
      expect(def!.rd).toBeLessThanOrEqual(120);
    }
  });

  it("without MERCH DIVISION every merch action is research-blocked first", () => {
    const fr = warmFr();
    const research: string[] = [];
    for (const p of MERCH_PRODUCTS) {
      const block = merchBlock(fr, p, 10, 99_000_000, research);
      expect(block, p.id).toBe("Requires Merch Division research (R&D)");
    }
  });

  it("after MERCH DIVISION, each line still needs its own research — and reports it", () => {
    const fr = warmFr();
    const research: string[] = ["merch"];
    const plush = merchProductById("plush")!;
    expect(merchBlock(fr, plush, 10, 99_000_000, research)).toBe("Requires Plush Production research (R&D)");
    const ost = merchProductById("ost")!;
    expect(merchBlock(fr, ost, 10, 99_000_000, research)).toBe("Requires Soundtrack Publishing research (R&D)");
    const plushResearch: string[] = ["merch", "merch_plush"];
    expect(merchBlock(fr, plush, 10, 99_000_000, plushResearch)).toBeNull();
    expect(merchBlock(fr, merchProductById("figures")!, 10, 99_000_000, plushResearch)).toBe("Requires Scale Figure Licensing research (R&D)");
    const m2 = RESEARCH.find((x) => x.id === "merch2")!;
    expect(m2.requires).toBe("merch");
    expect(m2.section).toBe("merch");
  });

  it("research-hard gate comes BEFORE cash/capacity gates so players see the true blocker", () => {
    const broke = 0;
    const fr = warmFr();
    expect(merchBlock(fr, merchProductById("figures")!, 10, broke, ["merch"])).toBe("Requires Scale Figure Licensing research (R&D)");
    expect(merchBlock(fr, merchProductById("figures")!, 10, broke, ["merch", "merch_figures"])).not.toBe("Requires Scale Figure Licensing research (R&D)");
    expect(merchBlock(fr, merchProductById("figures")!, 10, broke, ["merch", "merch_figures"])).toBeTruthy();
  });
});

/* --------------------------------------- talent analysis (PART F) */

describe("TALENT ANALYSIS repeatable research", () => {
  it("is expensive, slow and marked repeatable", () => {
    const def = RESEARCH.find((x) => x.id === TALENT_ANALYSIS_ID)!;
    expect(def).toBeTruthy();
    expect(def.rd).toBeGreaterThanOrEqual(60);
    expect(def.repeatable).toBe(true);
  });

  it("profiles only active catalogue characters that genuinely have a secret", () => {
    const ids = profileableCastIds();
    expect(ids).toHaveLength(140 * 8);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      const member = CAST_V2.find((cast) => cast.id === id)!;
      expect(isCastingActive(member), id).toBe(true);
      expect(catalogHasSecret(member), id).toBe(true);
      expect(member.legacyPlaceholder ?? false).toBe(false);
    }
    for (const member of CAST_V2.filter((cast) => !isCastingActive(cast) || !catalogHasSecret(cast))) {
      expect(ids, member.id).not.toContain(member.id);
    }
  });

  it("can be taken again and again (run.research never accumulates it)", () => {
    let r = richRun({ castAffinityDiscovered: [] });
    r = startResearchProject(r, TALENT_ANALYSIS_ID, 85)!;
    expect(r).toBeTruthy();
    r = advanceWeeks(r, 20);
    expect(r.research.includes(TALENT_ANALYSIS_ID)).toBe(false);
    expect(r.castAffinityDiscovered).toHaveLength(1);
    expect(researchBlockReason(r, TALENT_ANALYSIS_ID)).toBeNull();
    r = startResearchProject(r, TALENT_ANALYSIS_ID, 85)!;
    r = advanceWeeks(r, 20);
    expect(r.castAffinityDiscovered).toHaveLength(2);
    expect(new Set(r.castAffinityDiscovered).size).toBe(2);
  });

  it("never wastes: while one is running it cannot be double-started", () => {
    const r = startResearchProject(richRun({ castAffinityDiscovered: [] }), TALENT_ANALYSIS_ID, 85)!;
    expect(startResearchProject(r, TALENT_ANALYSIS_ID, 85)).toBeNull();
    expect(researchBlockReason(r, TALENT_ANALYSIS_ID)).toBe("Already in research");
  });

  it("completes even through the day-precision live loop", () => {
    let r = richRun({ castAffinityDiscovered: [] });
    r = startResearchProject(r, TALENT_ANALYSIS_ID, 85)!;
    const days = (r.researchJobs![0].completesDay ?? 0) - (r.researchJobs![0].startDay ?? 0);
    for (let d = 0; d < days + 3; d++) {
      r = tickStudioDay({ ...r, day: (r.day ?? r.week * 7) + 1 }).run;
      if ((r.day ?? 0) % 7 === 0) r = advanceWeeks(r, 1, { liveDaysAlreadyApplied: true });
    }
    expect(r.researchJobs).toHaveLength(0);
    expect(r.castAffinityDiscovered).toHaveLength(1);
    expect(r.notices.some((n) => n.includes("HIDDEN AFFINITY DISCOVERED"))).toBe(true);
  });

  it("ALL CAST PROFILED disables the button state with a clear reason", () => {
    const every = profileableCastIds();
    const r = richRun({ castAffinityDiscovered: every });
    expect(allCastProfiled(r)).toBe(true);
    expect(undiscoveredProfileIds(r)).toHaveLength(0);
    expect(researchBlockReason(r, TALENT_ANALYSIS_ID)).toContain("ALL CAST PROFILED");
    expect(startResearchProject(r, TALENT_ANALYSIS_ID, 85)).toBeNull();
  });

  it("protects research dependency rules for merch lines (requires merch)", () => {
    const r = richRun({ research: [] });
    expect(researchBlockReason(r, "merch_figures")).toContain("Merch Division");
    expect(researchBlockReason(richRun({ research: ["merch"] }), "merch_figures")).toBeNull();
  });
});
