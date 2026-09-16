import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
function replaceOnce(relativePath, before, after) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Research patch anchor missing in ${relativePath}`);
  writeFileSync(path, source.replace(before, after));
  return true;
}
let changed = false;

changed = replaceOnce(
  "src/engine/data.ts",
  '{ id: "genre_studies", name: "Genre Studies", rd: 32, desc: "Researches at least two usable, positive story-arc fits for every genre (usually three) and adds them to the Story Arc quick picks." },\n  { id: "narrative_analytics", name: "Narrative Analytics", rd: 38, desc: "Researches several classic story structures, permanently revealing their combo ratings in the Story Arc planner." },',
  '{ id: "genre_studies", name: "Genre Studies", rd: 32, repeatable: true, desc: "Progressive story research. The first study adds strong Quick Picks; later studies reveal more arc × genre fits until every standard arc is understood." },\n  { id: "narrative_analytics", name: "Narrative Analytics", rd: 38, repeatable: true, desc: "Progressive structure research. Repeat studies reveal more real combo effects until every standard story structure is understood." },',
) || changed;

changed = replaceOnce(
  "src/engine/data.ts",
  'export const ARC_RESEARCH_UNLOCK_IDS: string[] = [...new Set(ARC_RESEARCH_GENRE_KEYS.map((key) => key.slice(0, key.lastIndexOf("|"))))]\n  .filter((id) => !!ARCS.find((arc) => arc.id === id)?.unlock);',
  'export const ARC_RESEARCH_UNLOCK_IDS: string[] = [...new Set(ARC_RESEARCH_GENRE_KEYS.map((key) => key.slice(0, key.lastIndexOf("|"))))]\n  .filter((id) => !!ARCS.find((arc) => arc.id === id)?.unlock);\n\n/** Full non-secret research pools. Licensed-property/studio-blueprint arcs stay\n * on their intended discovery path and are never spoiled by generic R&D. */\nexport const ARC_RESEARCH_ALL_GENRE_KEYS: string[] = GENRES.flatMap((genre) =>\n  ARCS\n    .filter((arc) => !arc.franchiseOnly && arc.unlock?.kind !== "studioArc")\n    .map((arc) => arcGenreKey(arc.id, genre.id))\n).sort();\nexport const ARC_RESEARCH_ALL_COMBO_IDS: string[] = ARC_COMBOS\n  .filter((combo) => combo.arcs.every((arcId) => {\n    const arc = ARCS.find((candidate) => candidate.id === arcId);\n    return !!arc && !arc.franchiseOnly && arc.unlock?.kind !== "studioArc";\n  }))\n  .map((combo) => combo.id)\n  .sort();',
) || changed;

changed = replaceOnce(
  "src/engine/state.ts",
  '  ARC_RESEARCH_COMBOS,\n  ARC_RESEARCH_GENRE_KEYS,\n  ARC_RESEARCH_UNLOCK_IDS,',
  '  ARC_RESEARCH_COMBOS,\n  ARC_RESEARCH_GENRE_KEYS,\n  ARC_RESEARCH_UNLOCK_IDS,\n  ARC_RESEARCH_ALL_GENRE_KEYS,\n  ARC_RESEARCH_ALL_COMBO_IDS,',
) || changed;

const researchHelpersAnchor = '/** why a research project can\'t be started (null = allowed). Repeatable\n *  projects skip the "already researched" rule; talent analysis needs an\n *  undiscovered subject so a completed project can never be wasted. */';
const researchHelpers = `export const GENRE_STUDY_BATCH = 30;\nexport const NARRATIVE_STUDY_BATCH = 10;\n\nexport function researchProgressLabel(r: Pick<RunState, \"research\" | \"arcGenreKnowledge\" | \"arcCombos\">, id: string): string | null {\n  if (id === \"genre_studies\") {\n    const known = ARC_RESEARCH_ALL_GENRE_KEYS.filter((key) => (r.arcGenreKnowledge?.[key] ?? 0) > 0).length;\n    return \`ARC FITS \${known}/\${ARC_RESEARCH_ALL_GENRE_KEYS.length}\`;\n  }\n  if (id === \"narrative_analytics\") {\n    const known = ARC_RESEARCH_ALL_COMBO_IDS.filter((comboId) => r.arcCombos.includes(comboId)).length;\n    return \`STRUCTURES \${known}/\${ARC_RESEARCH_ALL_COMBO_IDS.length}\`;\n  }\n  return null;\n}\n\nfunction repeatResearchRunIndex(r: Pick<RunState, \"research\" | \"arcGenreKnowledge\" | \"arcCombos\">, id: string): number {\n  if (!r.research.includes(id)) return 0;\n  if (id === \"genre_studies\") {\n    const known = ARC_RESEARCH_ALL_GENRE_KEYS.filter((key) => (r.arcGenreKnowledge?.[key] ?? 0) > 0).length;\n    return 1 + Math.floor(Math.max(0, known - ARC_RESEARCH_GENRE_KEYS.length) / GENRE_STUDY_BATCH);\n  }\n  if (id === \"narrative_analytics\") {\n    const known = ARC_RESEARCH_ALL_COMBO_IDS.filter((comboId) => r.arcCombos.includes(comboId)).length;\n    return 1 + Math.floor(Math.max(0, known - ARC_RESEARCH_COMBOS.length) / NARRATIVE_STUDY_BATCH);\n  }\n  return 0;\n}\n\n/** Escalating base RD cost: each completed repeat pass adds 50% of the original\n * cost. Showrunner discounts are applied after this value is calculated. */\nexport function researchProjectCost(r: RunState, id: string, fallbackRd?: number): number {\n  const def = RESEARCH.find((x) => x.id === id);\n  const base = fallbackRd ?? def?.rd ?? 0;\n  const repeats = repeatResearchRunIndex(r, id);\n  return researchRdCost(Math.round(base * (1 + repeats * 0.5)), r.showrunner);\n}\n\n${researchHelpersAnchor}`;
changed = replaceOnce("src/engine/state.ts", researchHelpersAnchor, researchHelpers) || changed;

changed = replaceOnce(
  "src/engine/state.ts",
  '  if (id === TALENT_ANALYSIS_ID && allCastProfiled(r)) return "ALL CAST PROFILED — every hidden affinity is known";\n  const effectiveRdCost = researchRdCost(def.rd, r.showrunner);',
  '  if (id === TALENT_ANALYSIS_ID && allCastProfiled(r)) return "ALL CAST PROFILED — every hidden affinity is known";\n  if (id === "genre_studies" && ARC_RESEARCH_ALL_GENRE_KEYS.every((key) => (r.arcGenreKnowledge?.[key] ?? 0) > 0)) return "COMPLETE — every standard arc/genre relationship is understood";\n  if (id === "narrative_analytics" && ARC_RESEARCH_ALL_COMBO_IDS.every((comboId) => r.arcCombos.includes(comboId))) return "COMPLETE — every standard story structure is understood";\n  const effectiveRdCost = researchProjectCost(r, id, def.rd);',
) || changed;
changed = replaceOnce(
  "src/engine/state.ts",
  '  const effectiveRdCost = researchRdCost(rdCost, r.showrunner);\n  if (r.rd < effectiveRdCost) return null;\n  const def = RESEARCH.find((x) => x.id === id);\n  if (!def) return null;\n  const baseResearchWeeks = researchWeeks(rdCost, r.facilities.archive ?? 0, r.showrunner);',
  '  const def = RESEARCH.find((x) => x.id === id);\n  if (!def) return null;\n  const runIndex = repeatResearchRunIndex(r, id);\n  const scaledBaseRd = Math.round(rdCost * (1 + runIndex * 0.5));\n  const effectiveRdCost = researchProjectCost(r, id, rdCost);\n  if (r.rd < effectiveRdCost) return null;\n  const baseResearchWeeks = researchWeeks(scaledBaseRd, r.facilities.archive ?? 0, r.showrunner);',
) || changed;

changed = replaceOnce(
  "src/engine/state.ts",
  '  if (researchId === "narrative_analytics") {\n    arcCombos = [...new Set([...carrier.arcCombos, ...ARC_RESEARCH_COMBOS])];\n    arcKnowledge = { ...carrier.arcKnowledge };\n    for (const id of ARC_RESEARCH_COMBOS) {\n      const combo = ARC_COMBOS.find((c) => c.id === id);\n      for (const arcId of combo?.arcs ?? []) arcKnowledge[arcId] = Math.max(1, arcKnowledge[arcId] ?? 0);\n    }\n    notices.push("📚 Narrative Analytics adds several proven structures to the Studio Bible.");\n  }',
  '  if (researchId === "narrative_analytics") {\n    const firstPass = !carrier.research.includes("narrative_analytics");\n    const unknown = ARC_RESEARCH_ALL_COMBO_IDS.filter((id) => !carrier.arcCombos.includes(id));\n    const discoveries = firstPass ? ARC_RESEARCH_COMBOS.filter((id) => unknown.includes(id)) : unknown.slice(0, NARRATIVE_STUDY_BATCH);\n    arcCombos = [...new Set([...carrier.arcCombos, ...discoveries])];\n    arcKnowledge = { ...carrier.arcKnowledge };\n    for (const id of discoveries) {\n      const combo = ARC_COMBOS.find((c) => c.id === id);\n      for (const arcId of combo?.arcs ?? []) arcKnowledge[arcId] = Math.max(1, arcKnowledge[arcId] ?? 0);\n    }\n    notices.push(`📚 Narrative Analytics reveals ${discoveries.length} more structure${discoveries.length === 1 ? "" : "s"}. ${arcCombos.filter((id) => ARC_RESEARCH_ALL_COMBO_IDS.includes(id)).length}/${ARC_RESEARCH_ALL_COMBO_IDS.length} standard structures understood.`);\n  }',
) || changed;
changed = replaceOnce(
  "src/engine/state.ts",
  '  if (researchId === "genre_studies") {\n    arcGenreKnowledge = { ...carrier.arcGenreKnowledge };\n    for (const key of ARC_RESEARCH_GENRE_KEYS) arcGenreKnowledge[key] = Math.max(1, arcGenreKnowledge[key] ?? 0);\n    arcUnlocked = [...new Set([...carrier.arcUnlocked, ...ARC_RESEARCH_UNLOCK_IDS])];\n    notices.push(`📚 Genre Studies adds at least two usable story beats for every genre to Quick Picks (${ARC_RESEARCH_GENRE_KEYS.length} relationships).`);\n  }',
  '  if (researchId === "genre_studies") {\n    const firstPass = !carrier.research.includes("genre_studies");\n    arcGenreKnowledge = { ...carrier.arcGenreKnowledge };\n    const unknown = ARC_RESEARCH_ALL_GENRE_KEYS.filter((key) => (arcGenreKnowledge[key] ?? 0) <= 0);\n    const discoveries = firstPass ? ARC_RESEARCH_GENRE_KEYS.filter((key) => unknown.includes(key)) : unknown.slice(0, GENRE_STUDY_BATCH);\n    for (const key of discoveries) arcGenreKnowledge[key] = Math.max(1, arcGenreKnowledge[key] ?? 0);\n    const discoveredArcIds = discoveries.map((key) => key.slice(0, key.lastIndexOf("|")));\n    arcUnlocked = [...new Set([...carrier.arcUnlocked, ...(firstPass ? ARC_RESEARCH_UNLOCK_IDS : []), ...discoveredArcIds])];\n    const known = ARC_RESEARCH_ALL_GENRE_KEYS.filter((key) => (arcGenreKnowledge[key] ?? 0) > 0).length;\n    notices.push(firstPass\n      ? `📚 Genre Studies establishes the studio\'s first curated Quick Picks and maps ${discoveries.length} useful relationships.`\n      : `📚 Genre Studies maps ${discoveries.length} more arc/genre relationships. ${known}/${ARC_RESEARCH_ALL_GENRE_KEYS.length} understood.`);\n  }',
) || changed;

changed = replaceOnce(
  "src/components/Office.tsx",
  '  researchBlockReason,\n  type RunState,',
  '  researchBlockReason,\n  researchProjectCost,\n  researchProgressLabel,\n  type RunState,',
) || changed;
changed = replaceOnce(
  "src/components/Office.tsx",
  '  const research = (id: string, rd: number) => {\n    if (run.rd < researchRdCost(rd, run.showrunner)) return;\n    sfx.fanfare();',
  '  const research = (id: string, rd: number) => {\n    if (run.rd < researchProjectCost(run, id, rd)) return;\n    sfx.fanfare();',
) || changed;
changed = replaceOnce(
  "src/components/Office.tsx",
  '                    const displayResearch = experimentalStudyPresentation(u, owned);\n                    return (',
  '                    const displayResearch = experimentalStudyPresentation(u, owned);\n                    const progress = researchProgressLabel(run, u.id);\n                    const complete = !!block?.startsWith("COMPLETE —");\n                    const currentCost = researchProjectCost(run, u.id, u.rd);\n                    return (',
) || changed;
changed = replaceOnce(
  "src/components/Office.tsx",
  '                      <div key={u.id} className={cn("ink-card p-3", owned && !u.repeatable && "border-mint/50", block === "ALL CAST PROFILED — every hidden affinity is known" && "border-gold/50 bg-gold/5")}>',
  '                      <div key={u.id} className={cn("ink-card p-3", owned && !u.repeatable && "border-mint/50", (block === "ALL CAST PROFILED — every hidden affinity is known" || complete) && "border-gold/50 bg-gold/5")}>',
) || changed;
changed = replaceOnce(
  "src/components/Office.tsx",
  '                        <div className="mt-0.5 text-[11px] text-paper/55">{displayResearch.desc}</div>',
  '                        <div className="mt-0.5 text-[11px] text-paper/55">{displayResearch.desc}</div>\n                        {progress && <div className="mt-1 text-[9px] font-bold tracking-wider text-cyanx">{progress} · NEXT RUN {currentCost} RD</div>}',
) || changed;
changed = replaceOnce(
  "src/components/Office.tsx",
  '                          ) : block === "ALL CAST PROFILED — every hidden affinity is known" ? (\n                            <span className="text-xs font-bold text-gold">⭐ ALL CAST PROFILED ✓</span>\n                          ) : (\n                            <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={!!block} onClick={() => research(u.id, u.rd)}>\n                              {u.repeatable && block === null ? "RUN AGAIN" : "START"} · {researchRdCost(u.rd, run.showrunner)} RD',
  '                          ) : block === "ALL CAST PROFILED — every hidden affinity is known" ? (\n                            <span className="text-xs font-bold text-gold">⭐ ALL CAST PROFILED ✓</span>\n                          ) : complete ? (\n                            <span className="text-xs font-bold text-gold">⭐ RESEARCH COMPLETE ✓</span>\n                          ) : (\n                            <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={!!block} onClick={() => research(u.id, u.rd)}>\n                              {u.repeatable && owned ? "RUN AGAIN" : "START"} · {currentCost} RD',
) || changed;

console.log(changed ? "Progressive research patches applied." : "Progressive research patches already present.");
