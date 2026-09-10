import { describe, expect, it } from "vitest";
import type { Draft } from "../data";
import { RESEARCH } from "../data";
import {
  RESEARCHABLE_SECRET_COMBOS,
  arcClashesFor,
  secretComboResearched,
} from "../creativeDiscovery";
import {
  SEQUEL_SCORE_THRESHOLD,
  continuationBlock,
  createFranchise,
  recordContinuation,
  type Franchise,
} from "../franchise";
import { computeProjectResult, makeProject } from "../projects";
import { contextualReviewQuote } from "../reviewNarrative";

const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Memory Test",
  medium: "tv",
  budget: "indie",
  slot: "midnight",
  animeType: "shonen",
  genres: ["sports"],
  audience: "teens",
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  secondaryName: "Riko",
  pet: "none",
  petName: "Mochi",
  villain: "warlord",
  villainName: "Gharn",
  arcs: ["hook", "montage", "finale"],
  sliders: [50, 50, 50],
  season: 1,
  ...over,
});

const seed = {
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  secondaryName: "Riko",
  pet: "none",
  petName: "Mochi",
  villain: "warlord",
  villainName: "Gharn",
};

const result = (total: number) => ({ total, revenue: 300_000, fans: 20_000, hallOfFame: total >= 32 });
const opts = { week: 60, franchiseCount: 2, officeLevel: 3, projects: [] };

function franchise(score: number): Franchise {
  return createFranchise("Memory Test", draft(), seed, result(score), 10);
}

describe("32/40 sequel-rights threshold", () => {
  it("blocks mainline season and sequel film below 32", () => {
    const fr = franchise(31);
    expect(SEQUEL_SCORE_THRESHOLD).toBe(32);
    expect(continuationBlock(fr, "season", opts)).toContain("32/40");
    expect(continuationBlock(fr, "movie", opts)).toContain("32/40");
  });

  it("allows the mainline sequel gate at exactly 32", () => {
    const fr = franchise(32);
    expect(continuationBlock(fr, "season", opts)).toBeNull();
    expect(continuationBlock(fr, "movie", opts)).toBeNull();
  });

  it("keeps salvage routes available to a sub-32 IP", () => {
    const fr = franchise(24);
    /* A poor first entry may be rebooted immediately rather than waiting for
       the normal age/fatigue reboot gate. */
    expect(continuationBlock(fr, "reboot", { ...opts, week: 11 })).toBeNull();
    /* Spin-offs are score-eligible too; their separate character-popularity
       requirement remains meaningful. */
    const hotCast = { ...fr, cast: fr.cast.map((c) => ({ ...c, popularity: 60 })) };
    expect(continuationBlock(hotCast, "spinoff", opts)).toBeNull();
  });
});

describe("continuation character billing memory", () => {
  it("writes renamed/recast characters back to the franchise record", () => {
    const fr = franchise(34);
    const sequel = draft({
      franchiseKey: fr.key,
      continuation: "season",
      season: 2,
      protag: "hero",
      protagName: "Akira",
      secondary: "rival",
      secondaryName: "Renamed Rival",
      pet: "none",
      petName: "Bean",
      villain: "warlord",
      villainName: "The Iron King",
    });
    const next = recordContinuation(fr, sequel, result(35), 70).franchise;
    expect(next.cast.find((c) => c.role === "protag")?.name).toBe("Akira");
    expect(next.cast.find((c) => c.role === "secondary")?.name).toBe("Renamed Rival");
    expect(next.cast.find((c) => c.role === "pet")?.name).toBe("Bean");
    expect(next.cast.find((c) => c.role === "villain")?.name).toBe("The Iron King");
  });
});

describe("experimental combo research", () => {
  it("registers eight expensive Genre Studies follow-up projects", () => {
    expect(RESEARCHABLE_SECRET_COMBOS).toHaveLength(8);
    const ids = new Set(RESEARCHABLE_SECRET_COMBOS.map((study) => study.id));
    expect(ids.size).toBe(8);
    for (const study of RESEARCHABLE_SECRET_COMBOS) {
      const item = RESEARCH.find((entry) => entry.id === study.id);
      expect(item).toBeTruthy();
      expect(item?.requires).toBe("genre_studies");
      expect(item?.rd).toBeGreaterThanOrEqual(60);
      expect(secretComboResearched([study.id], study.key)).toBe(true);
    }
  });

  it("pre-research prevents a secret pairing being reported as a new accidental discovery", () => {
    const study = RESEARCHABLE_SECRET_COMBOS[0];
    const genres = study.key.split("|") as Draft["genres"];
    const p = makeProject(draft({ genres }), 20);
    p.points = { story: 80, art: 80, sound: 80 };
    const out = computeProjectResult(p, {
      research: [study.id],
      showrunner: "steady",
      comboLevels: {},
      castCombos: [],
      arcCombos: [],
      studioTop: 20,
      franchises: {},
      fans: 0,
    });
    expect(out.secretDiscovered).toBe(false);
    expect(out.newCombo).toBe(true);
  });
});

describe("remembered bad story structures", () => {
  it("detects ordered clashes for the planner to warn about after discovery", () => {
    const hits = arcClashesFor(["hook", "twist", "case", "finale"]);
    expect(hits.some((c) => c.id === "clash_twist_before_case")).toBe(true);
    expect(arcClashesFor(["hook", "case", "twist", "finale"]).some((c) => c.id === "clash_twist_before_case")).toBe(false);
  });
});

describe("review variety", () => {
  const outlets = ["Animage Monthly", "Otaku Pulse", "The London Reel", "StudioScope"];

  it("is deterministic for the same release but changes with score/year/release identity", () => {
    const base = {
      title: "One Release",
      outlet: "Animage Monthly",
      focus: "writing",
      score: 6,
      total: 24,
      quality: 26,
      careerWeek: 96,
      showsMade: 5,
      baseQuote: "fallback",
    };
    expect(contextualReviewQuote(base)).toBe(contextualReviewQuote(base));
    expect(contextualReviewQuote({ ...base, score: 7, total: 28 })).not.toBe(contextualReviewQuote(base));
    expect(contextualReviewQuote({ ...base, careerWeek: 48 })).not.toBe(contextualReviewQuote(base));
  });

  it("produces a large bank of distinct score/year/outlet observations", () => {
    const lines = new Set<string>();
    for (let year = 1; year <= 12; year += 1) {
      for (let score = 4; score <= 10; score += 1) {
        for (const outlet of outlets) {
          for (let release = 0; release < 4; release += 1) {
            lines.add(contextualReviewQuote({
              title: `Show ${year}-${score}-${release}`,
              outlet,
              focus: outlet,
              score,
              total: score * 4,
              quality: score * 4,
              careerWeek: (year - 1) * 48,
              showsMade: year === 1 && release === 0 ? 0 : year * 3 + release,
              baseQuote: "fallback",
            }));
          }
        }
      }
    }
    expect(lines.size).toBeGreaterThan(180);
  });
});
