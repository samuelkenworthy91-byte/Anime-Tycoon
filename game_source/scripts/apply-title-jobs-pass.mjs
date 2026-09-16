import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
function replaceOnce(relativePath, before, after) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Title/jobs patch anchor missing in ${relativePath}`);
  writeFileSync(path, source.replace(before, after));
  return true;
}
let changed = false;

changed = replaceOnce(
  "src/components/Create.tsx",
  '  mediumAllowsScope,\n  randomTitle,\n  scopeLabel,',
  '  mediumAllowsScope,\n  scopeLabel,',
) || changed;

changed = replaceOnce(
  "src/components/Create.tsx",
  'import { visionAlignment } from "../engine/creatorVision";\n\nimport { filterCastByFilters, mixedCastOrder, type CastBrowseFilter } from "../engine/castDisplayOrder";',
  'import { visionAlignment } from "../engine/creatorVision";\nimport { randomAnimeTitle } from "../engine/titleGenerator";\n\nimport { filterCastByFilters, mixedCastOrder, type CastBrowseFilter } from "../engine/castDisplayOrder";',
) || changed;

changed = replaceOnce(
  "src/components/Create.tsx",
  '    title: randomTitle(),\n    medium: startMedium,',
  '    title: randomAnimeTitle([], fr && plan?.kind !== "crossover" ? fr.animeType : last?.animeType ?? "shonen"),\n    medium: startMedium,',
) || changed;

changed = replaceOnce(
  "src/components/Create.tsx",
  '<Btn variant="ghost" onClick={() => set({ title: randomTitle() })} aria-label="Random title">\n                    <Dices size={18} />\n                  </Btn>',
  '<Btn variant="ghost" onClick={() => set({ title: randomAnimeTitle(d.genres, d.animeType) })} aria-label="Random title" title={d.genres.length ? "Generate a title using the selected genre style" : "Generate a title from the full anime title pool"}>\n                    <Dices size={18} />\n                  </Btn>',
) || changed;

changed = replaceOnce(
  "src/components/ContractJob.tsx",
  'import { useState } from "react";\nimport { Briefcase, Calendar, Check, ChevronLeft, Database, UserRound, Users } from "lucide-react";',
  'import { useMemo, useState } from "react";\nimport { Briefcase, Calendar, Check, ChevronLeft, Database, Sparkles, UserRound, Users } from "lucide-react";',
) || changed;

changed = replaceOnce(
  "src/components/ContractJob.tsx",
  '  const likely = projected >= contract.target;\n\n  const toggle = (id: string) => {',
  `  const likely = projected >= contract.target;\n\n  /* Quick Pick is deliberately resource-aware: choose the smallest available\n     team projected to finish by the deadline; if no combination can do that,\n     choose the highest-output three-seat team. This restores the one-tap job\n     assignment flow without quietly pulling busy staff off productions. */\n  const quickPick = useMemo(() => {\n    const staffIds = run.staff.filter((s) => !staffBusyReason(run, s.id)).map((s) => s.id);\n    const seats: ({ kind: "staff"; id: string } | { kind: "runner" })[] = staffIds.map((id) => ({ kind: "staff" as const, id }));\n    if (!runnerBusy) seats.push({ kind: "runner" });\n    type Candidate = { staffIds: string[]; showrunner: boolean; rate: number; size: number; meets: boolean };\n    let best: Candidate | null = null;\n    const consider = (picked: typeof seats) => {\n      const ids = picked.filter((x): x is { kind: "staff"; id: string } => x.kind === "staff").map((x) => x.id);\n      const showrunner = picked.some((x) => x.kind === "runner");\n      const rate = contractSelectionDailyOutputEstimate(run, contract, ids, showrunner);\n      const candidate: Candidate = { staffIds: ids, showrunner, rate, size: picked.length, meets: rate * contract.weeks * 7 >= contract.target };\n      if (!best ||\n        (candidate.meets && !best.meets) ||\n        (candidate.meets === best.meets && candidate.meets && candidate.size < best.size) ||\n        (candidate.meets === best.meets && (!candidate.meets || candidate.size === best.size) && candidate.rate > best.rate)) best = candidate;\n    };\n    for (let a = 0; a < seats.length; a++) {\n      consider([seats[a]]);\n      for (let b = a + 1; b < seats.length; b++) {\n        consider([seats[a], seats[b]]);\n        for (let c = b + 1; c < seats.length; c++) consider([seats[a], seats[b], seats[c]]);\n      }\n    }\n    return best;\n  }, [run, contract, runnerBusy]);\n\n  const applyQuickPick = () => {\n    if (!quickPick) return;\n    sfx.click();\n    setSelected(quickPick.staffIds);\n    setShowrunnerSelected(quickPick.showrunner);\n  };\n\n  const toggle = (id: string) => {`,
) || changed;

changed = replaceOnce(
  "src/components/ContractJob.tsx",
  '<div className="mb-2 flex items-center gap-2"><Users size={14} className="text-cyanx" /><span className="font-display text-sm font-extrabold">TEAM {seats}/3</span></div>',
  '<div className="mb-2 flex items-center gap-2"><Users size={14} className="text-cyanx" /><span className="font-display text-sm font-extrabold">TEAM {seats}/3</span><Btn variant="ghost" className="ml-auto !px-2 !py-1 text-[9px]" disabled={!quickPick} onClick={applyQuickPick}><Sparkles size={12}/> QUICK PICK</Btn></div>',
) || changed;

console.log(changed ? "Title generator + contract Quick Pick wiring applied." : "Title/jobs wiring already present.");
