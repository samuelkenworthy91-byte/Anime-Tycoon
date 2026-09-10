import fs from "node:fs";

function replaceOnce(path, from, to) {
  const src = fs.readFileSync(path, "utf8");
  const first = src.indexOf(from);
  if (first < 0) throw new Error(`Missing target in ${path}: ${from.slice(0, 100)}`);
  if (src.indexOf(from, first + from.length) >= 0) throw new Error(`Target not unique in ${path}`);
  fs.writeFileSync(path, src.slice(0, first) + to + src.slice(first + from.length));
}

replaceOnce(
  "game_source/src/engine/state.ts",
`  continuationBlock,\n  continuationDef,\n  createFranchise,`,
`  continuationBlock,\n  continuationDef,\n  createFranchise,\n  SEQUEL_SCORE_THRESHOLD,`
);
replaceOnce(
  "game_source/src/engine/state.ts",
`    pendingSequel:\n      result.total >= 30 ? fkey : draft.franchiseKey === r.pendingSequel ? null : r.pendingSequel,`,
`    pendingSequel:\n      result.total >= SEQUEL_SCORE_THRESHOLD ? fkey : draft.franchiseKey === r.pendingSequel ? null : r.pendingSequel,`
);

replaceOnce(
  "game_source/src/components/Projects.tsx",
`import { HEAD_TITLES, type HeadSlot } from "../engine/careers";`,
`import { HEAD_TITLES, type HeadSlot } from "../engine/careers";\nimport { SEQUEL_SCORE_THRESHOLD } from "../engine/franchise";`
);
replaceOnce(
  "game_source/src/components/Projects.tsx",
`          const nextNo = fr.season + 1;\n          const inFlight = run.projects.some(`,
`          const nextNo = fr.season + 1;\n          if (fr.lastScore < SEQUEL_SCORE_THRESHOLD) {\n            return (\n              <div className="mt-1.5 rounded-lg border border-neon/40 bg-neon/10 px-2 py-1.5 text-[10px] font-bold text-neon2">\n                NO SEQUEL RIGHTS — latest entry {fr.lastScore}/40. Use SERIES for a spin-off or reboot.\n              </div>\n            );\n          }\n          const inFlight = run.projects.some(`
);

console.log("Final sequel-rights edges patched.");
