import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, s) => fs.writeFileSync(path.join(root, p), s);
const replaceExact = (src, oldText, newText, label) => {
  if (!src.includes(oldText)) {
    if (src.includes(newText)) return src;
    throw new Error(`Hotfix anchor missing: ${label}`);
  }
  return src.replace(oldText, newText);
};

// 1) Work / Studio Slate must survive saves created before every newer field existed.
{
  const p = "src/components/StudioSlate.tsx";
  let s = read(p);
  s = replaceExact(
    s,
    `  const depts = departmentStatuses(run.projects, run.staff, run.facilities, run.research);\n  const active = run.projects.filter((p) => p.stage !== "done" && p.stage !== "airing");\n  const plans = plansForQuarter(run, year, quarter);\n  const warnings = slateQuarterWarnings(run, year, quarter);\n  const franchises = Object.values(run.franchises).filter((fr) => !fr.soldTo);\n  const ownedIps = Object.values(run.ipMarket.owned)`,
    `  const projects = run.projects ?? [];\n  const staff = run.staff ?? [];\n  const research = run.research ?? [];\n  const contractJobs = run.contractJobs ?? [];\n  const trainingJobs = run.trainingJobs ?? [];\n  const researchJobs = run.researchJobs ?? [];\n  const depts = departmentStatuses(projects, staff, run.facilities, research);\n  const active = projects.filter((p) => p.stage !== "done" && p.stage !== "airing");\n  const plans = plansForQuarter(run, year, quarter);\n  const warnings = slateQuarterWarnings(run, year, quarter);\n  const franchises = Object.values(run.franchises ?? {}).filter((fr) => !fr.soldTo);\n  const ownedIps = Object.values(run.ipMarket?.owned ?? {})`,
    "StudioSlate save-safe inputs",
  );
  s = replaceExact(s, "{run.contractJobs.map((j)=>", "{contractJobs.map((j)=>", "StudioSlate contract jobs");
  s = replaceExact(s, "{run.trainingJobs.map((j)=>", "{trainingJobs.map((j)=>", "StudioSlate training jobs");
  s = replaceExact(s, "{run.researchJobs.map((j)=>", "{researchJobs.map((j)=>", "StudioSlate research jobs");
  write(p, s);
}

// 2) Repeatable discovery research starts cheap and becomes a serious late-game investment.
{
  const p = "src/engine/state.ts";
  let s = read(p);
  const oldBlock = `  const base = fallbackRd ?? def?.rd ?? 0;\n  const repeats = repeatResearchRunIndex(r, id);\n  return researchRdCost(Math.round(base * (1 + repeats * 0.5)), r.showrunner);`;
  const newBlock = `  const base = fallbackRd ?? def?.rd ?? 0;\n  const repeats = repeatResearchRunIndex(r, id);\n\n  // Discovery studies are deliberately almost free at the start so a new studio\n  // can learn by experimenting. Costs then curve upward with actual discovery\n  // progress: final Genre Studies passes approach 200 RD and final Narrative /\n  // Arc Combo passes approach 300 RD. The first four passes are 2, 4, 8, 12.\n  if (id === "genre_studies" || id === "narrative_analytics") {\n    const genreStudy = id === "genre_studies";\n    const known = genreStudy\n      ? ARC_RESEARCH_ALL_GENRE_KEYS.filter((key) => (r.arcGenreKnowledge?.[key] ?? 0) > 0).length\n      : ARC_RESEARCH_ALL_COMBO_IDS.filter((comboId) => r.arcCombos?.includes(comboId)).length;\n    const total = genreStudy ? ARC_RESEARCH_ALL_GENRE_KEYS.length : ARC_RESEARCH_ALL_COMBO_IDS.length;\n    const batch = genreStudy ? GENRE_STUDY_FIRST_BATCH : NARRATIVE_STUDY_FIRST_BATCH;\n    const ceiling = genreStudy ? 200 : 300;\n    const early = [2, 4, 8, 12] as const;\n    let rawCost: number;\n    if (repeats < early.length) {\n      rawCost = early[repeats];\n    } else if (total - known <= batch) {\n      rawCost = ceiling;\n    } else {\n      const progress = Math.max(0, Math.min(1, known / Math.max(1, total - batch)));\n      const curved = 12 + (ceiling - 12) * Math.pow(progress, 1.8);\n      rawCost = Math.min(ceiling, Math.max(12, Math.round(curved / 2) * 2));\n    }\n    return researchRdCost(rawCost, r.showrunner);\n  }\n\n  return researchRdCost(Math.round(base * (1 + repeats * 0.5)), r.showrunner);`;
  s = replaceExact(s, oldBlock, newBlock, "researchProjectCost discovery curve");
  write(p, s);
}

// 3) Update repeat-research regression coverage to the new intended economy.
{
  const p = "src/engine/__tests__/research-scaling.test.ts";
  const s = `import { describe, expect, it } from "vitest";\nimport { ARC_RESEARCH_ALL_COMBO_IDS, ARC_RESEARCH_ALL_GENRE_KEYS } from "../data";\nimport {\n  GENRE_STUDY_FIRST_BATCH,\n  NARRATIVE_STUDY_FIRST_BATCH,\n  applyResearchCompletion,\n  initialRun,\n  researchProjectCost,\n  startResearchProject,\n} from "../state";\n\ndescribe("repeat research economics", () => {\n  it("starts Genre Studies at 2, 4, 8, 12 RD", () => {\n    const start = initialRun("Genre Lab", "steady");\n    const first = applyResearchCompletion(start, "genre_studies", "Genre Studies");\n    const second = applyResearchCompletion(first, "genre_studies", "Genre Studies");\n    const third = applyResearchCompletion(second, "genre_studies", "Genre Studies");\n\n    expect(Object.keys(first.arcGenreKnowledge)).toHaveLength(GENRE_STUDY_FIRST_BATCH);\n    expect(Object.keys(second.arcGenreKnowledge).length - Object.keys(first.arcGenreKnowledge).length).toBe(GENRE_STUDY_FIRST_BATCH);\n    expect(researchProjectCost(start, "genre_studies", 32)).toBe(2);\n    expect(researchProjectCost(first, "genre_studies", 32)).toBe(4);\n    expect(researchProjectCost(second, "genre_studies", 32)).toBe(8);\n    expect(researchProjectCost(third, "genre_studies", 32)).toBe(12);\n  });\n\n  it("starts Narrative Analytics at 2, 4, 8, 12 RD", () => {\n    const start = initialRun("Story Lab", "steady");\n    const first = applyResearchCompletion(start, "narrative_analytics", "Narrative Analytics");\n    const second = applyResearchCompletion(first, "narrative_analytics", "Narrative Analytics");\n    const third = applyResearchCompletion(second, "narrative_analytics", "Narrative Analytics");\n\n    expect(first.arcCombos).toHaveLength(NARRATIVE_STUDY_FIRST_BATCH);\n    expect(second.arcCombos.length - first.arcCombos.length).toBe(NARRATIVE_STUDY_FIRST_BATCH);\n    expect(researchProjectCost(start, "narrative_analytics", 38)).toBe(2);\n    expect(researchProjectCost(first, "narrative_analytics", 38)).toBe(4);\n    expect(researchProjectCost(second, "narrative_analytics", 38)).toBe(8);\n    expect(researchProjectCost(third, "narrative_analytics", 38)).toBe(12);\n  });\n\n  it("tops out at 200 RD for the final genre-fit batch and 300 RD for final arc-combo batch", () => {\n    const start = initialRun("Late Lab", "steady");\n    const genreKnown = Object.fromEntries(\n      ARC_RESEARCH_ALL_GENRE_KEYS.slice(0, Math.max(0, ARC_RESEARCH_ALL_GENRE_KEYS.length - GENRE_STUDY_FIRST_BATCH)).map((key) => [key, 1]),\n    );\n    const genreLate = { ...start, research: [...start.research, "genre_studies"], arcGenreKnowledge: genreKnown };\n    expect(researchProjectCost(genreLate, "genre_studies", 32)).toBe(200);\n\n    const arcLate = {\n      ...start,\n      research: [...start.research, "narrative_analytics"],\n      arcCombos: ARC_RESEARCH_ALL_COMBO_IDS.slice(0, Math.max(0, ARC_RESEARCH_ALL_COMBO_IDS.length - NARRATIVE_STUDY_FIRST_BATCH)),\n    };\n    expect(researchProjectCost(arcLate, "narrative_analytics", 38)).toBe(300);\n  });\n\n  it("does not make later repeat studies take longer just because they cost more RD", () => {\n    const start = { ...initialRun("Timing Lab", "steady"), rd: 9999 };\n    const firstJob = startResearchProject(start, "genre_studies", 32);\n    expect(firstJob).not.toBeNull();\n    const firstDuration = firstJob!.researchJobs[0].completesDay! - firstJob!.researchJobs[0].startDay!;\n\n    const completed = { ...applyResearchCompletion(start, "genre_studies", "Genre Studies"), rd: 9999 };\n    const secondJob = startResearchProject(completed, "genre_studies", 32);\n    expect(secondJob).not.toBeNull();\n    const secondDuration = secondJob!.researchJobs[0].completesDay! - secondJob!.researchJobs[0].startDay!;\n\n    expect(secondDuration).toBe(firstDuration);\n    expect(secondJob!.researchJobs[0].rdCost).toBeGreaterThan(firstJob!.researchJobs[0].rdCost);\n  });\n});\n`;
  write(p, s);
}

// 4) Reproduce the Work-tab entry with a deliberately older-shaped save.
{
  const p = "src/engine/__tests__/studio-slate-compat.test.ts";
  const s = `import { createElement } from "react";\nimport { renderToStaticMarkup } from "react-dom/server";\nimport { describe, expect, it } from "vitest";\nimport StudioSlate from "../../components/StudioSlate";\nimport { initialRun, type RunState } from "../state";\n\ndescribe("StudioSlate save compatibility", () => {\n  it("opens Work without crashing when optional/newer collections are absent", () => {\n    const fresh = initialRun("Legacy Work Save", "steady");\n    const legacy = {\n      ...fresh,\n      ipMarket: undefined,\n      contractJobs: undefined,\n      trainingJobs: undefined,\n      researchJobs: undefined,\n      slatePlans: undefined,\n    } as unknown as RunState;\n\n    expect(() => renderToStaticMarkup(createElement(StudioSlate, {\n      run: legacy,\n      setRun: () => {},\n      onOriginal: () => {},\n    }))).not.toThrow();\n  });\n});\n`;
  write(p, s);
}

console.log("Applied Work-tab compatibility + discovery R&D curve hotfix.");
