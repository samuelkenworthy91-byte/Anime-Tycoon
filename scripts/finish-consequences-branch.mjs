import fs from "node:fs";

function replaceOnce(path, from, to) {
  const src = fs.readFileSync(path, "utf8");
  const first = src.indexOf(from);
  if (first < 0) throw new Error(`Missing target in ${path}: ${from.slice(0, 80)}`);
  if (src.indexOf(from, first + from.length) >= 0) throw new Error(`Target not unique in ${path}: ${from.slice(0, 80)}`);
  fs.writeFileSync(path, src.slice(0, first) + to + src.slice(first + from.length));
}

// --- Accurate two-month insolvency copy ---
replaceOnce(
  "game_source/src/components/Office.tsx",
`                  {fc.cashAfter < 0 ? (\n                    <div className="mt-2 rounded-lg border border-neon/50 bg-neon/10 px-2 py-1.5 text-[10px] font-bold text-neon">\n                      At this rate the studio bounces next week\n                      {run.bailouts < 2\n                        ? " — the fans can crowdfund a rescue, but a contract or a cheaper week buys you time NOW."\n                        : " — no bailouts left. Take a contract or this is the last week."}\n                    </div>\n                  ) : fc.net < 0 && fc.payday > 0 ? (`,
`                  {fc.cashAfter < 0 ? (\n                    <div className="mt-2 rounded-lg border border-neon/50 bg-neon/10 px-2 py-1.5 text-[10px] font-bold text-neon">\n                      Next week leaves the studio below £0. Debt is allowed, but eight consecutive negative weeks ends the lease.\n                      {(run.negativeCashWeeks ?? 0) > 0\n                        ? \` Current debt streak: \${run.negativeCashWeeks ?? 0}/8 weeks.\`\n                        : " The landlord clock starts when the first negative week closes."}\n                    </div>\n                  ) : fc.net < 0 && fc.payday > 0 ? (`
);

replaceOnce(
  "game_source/src/components/Projects.tsx",
`          {fc.cashAfter < 0 && <b className="block font-bold text-neon">BANKRUPT NEXT WEEK — take a contract first!</b>}`,
`          {fc.cashAfter < 0 && <b className="block font-bold text-neon">DEBT WARNING — recover before 8 consecutive weeks below £0 or the landlord shuts the studio.</b>}`
);

// --- R&D-discovered secret combos are real scoring knowledge ---
replaceOnce(
  "game_source/src/engine/projects.ts",
`import { genreTargetFor } from "./genreTargets";\nimport { NO_FX, fxSpeedFor, type FacilityFX } from "./facilities";`,
`import { genreTargetFor } from "./genreTargets";\nimport { secretComboResearched } from "./creativeDiscovery";\nimport { NO_FX, fxSpeedFor, type FacilityFX } from "./facilities";`
);
replaceOnce(
  "game_source/src/engine/projects.ts",
`  const key = comboKey(genres);\n  const comboLevel = ctx.comboLevels[key] ?? 0;\n  const franchiseMult = ctx.franchiseMult ?? (d.franchiseKey ? 1 + 0.14 * (d.season - 1) : 1);`,
`  const key = comboKey(genres);\n  const comboLevel = ctx.comboLevels[key] ?? 0;\n  const comboKnown = (key in ctx.comboLevels) || secretComboResearched(ctx.research, key);\n  const franchiseMult = ctx.franchiseMult ?? (d.franchiseKey ? 1 + 0.14 * (d.season - 1) : 1);`
);
replaceOnce(
  "game_source/src/engine/projects.ts",
`    newCombo: !(key in ctx.comboLevels),\n    comboDiscovered: key in ctx.comboLevels,`,
`    newCombo: !(key in ctx.comboLevels),\n    comboDiscovered: comboKnown,`
);

// --- Continuation planner remembers final character names and learned bad structures ---
replaceOnce(
  "game_source/src/components/Create.tsx",
`import { secretComboResearched } from "../engine/creativeDiscovery";`,
`import { arcClashesFor, secretComboResearched } from "../engine/creativeDiscovery";`
);
replaceOnce(
  "game_source/src/components/Create.tsx",
`    protag: protagChar?.id ?? base.protag,\n    protagName: protagChar?.name ?? base.protagName,\n    secondary: castOf("secondary")?.id ?? base.secondary,\n    pet: castOf("pet")?.id ?? base.pet,\n    villain: castOf("villain")?.id ?? base.villain,`,
`    protag: protagChar?.id ?? base.protag,\n    protagName: protagChar?.name ?? base.protagName,\n    secondary: castOf("secondary")?.id ?? base.secondary,\n    secondaryName: castOf("secondary")?.name,\n    pet: castOf("pet")?.id ?? base.pet,\n    petName: castOf("pet")?.name,\n    villain: castOf("villain")?.id ?? base.villain,\n    villainName: castOf("villain")?.name,`
);
replaceOnce(
  "game_source/src/components/Create.tsx",
`  const selectedArcCombos = useMemo(() => arcCombosFor(d.arcs), [d.arcs]);\n  const learnedArcCombos = selectedArcCombos.filter((c) => run.arcCombos.includes(c.id));`,
`  const selectedArcCombos = useMemo(() => arcCombosFor(d.arcs), [d.arcs]);\n  const learnedArcCombos = selectedArcCombos.filter((c) => run.arcCombos.includes(c.id));\n  const learnedArcClashes = useMemo(\n    () => arcClashesFor(d.arcs).filter((c) => run.arcCombos.includes(c.id)),\n    [d.arcs, run.arcCombos]\n  );`
);
replaceOnce(
  "game_source/src/components/Create.tsx",
`    const combos = arcCombosFor(d.arcs);\n    q += combos.reduce((sum, c) => sum + c.q, 0);\n    f += combos.reduce((sum, c) => sum + c.f, 0);\n    if (combos.some((c) => !run.arcCombos.includes(c.id))) known = false;\n    return { q, f, known };`,
`    const combos = arcCombosFor(d.arcs);\n    q += combos.reduce((sum, c) => sum + c.q, 0);\n    f += combos.reduce((sum, c) => sum + c.f, 0);\n    if (combos.some((c) => !run.arcCombos.includes(c.id))) known = false;\n    const clashes = arcClashesFor(d.arcs);\n    q += clashes.reduce((sum, c) => sum + c.q, 0);\n    f += clashes.reduce((sum, c) => sum + c.f, 0);\n    if (clashes.some((c) => !run.arcCombos.includes(c.id))) known = false;\n    return { q, f, known };`
);
replaceOnce(
  "game_source/src/components/Create.tsx",
`                {combo.secret && comboDiscovered && (\n                  <span className="ml-2 text-xs text-viol">✦ ×{combo.mult.toFixed(2)} review score — you discovered this!</span>\n                )}`,
`                {combo.secret && comboDiscovered && (\n                  <span className="ml-2 text-xs text-viol">\n                    {comboResearchKnown\n                      ? \`✦ R&D CONFIRMED · ×\${combo.mult.toFixed(2)} review score\`\n                      : \`✦ ×\${combo.mult.toFixed(2)} review score — you discovered this!\`}\n                  </span>\n                )}`
);
replaceOnce(
  "game_source/src/components/Create.tsx",
`                    {learnedArcCombos.length > 0 ? (\n                      <div className="mt-1.5 flex flex-wrap gap-1.5">\n                        {learnedArcCombos.map((c) => {\n                          const rating = arcComboRating(c);\n                          return (\n                            <span key={c.id} className={cn("rounded-lg border border-line px-2 py-1 text-[10px] font-extrabold", rating.cls)}>\n                              {rating.label} · {c.name}{c.ordered ? " ↦" : ""}\n                            </span>\n                          );\n                        })}\n                      </div>\n                    ) : (\n                      <div className="mt-1 text-[10px] italic text-viol">No proven structure here yet — release it, or research narrative analytics.</div>\n                    )}`,
`                    {learnedArcCombos.length > 0 || learnedArcClashes.length > 0 ? (\n                      <div className="mt-1.5 flex flex-wrap gap-1.5">\n                        {learnedArcCombos.map((c) => {\n                          const rating = arcComboRating(c);\n                          return (\n                            <span key={c.id} className={cn("rounded-lg border border-line px-2 py-1 text-[10px] font-extrabold", rating.cls)}>\n                              {rating.label} · {c.name}{c.ordered ? " ↦" : ""}\n                            </span>\n                          );\n                        })}\n                        {learnedArcClashes.map((c) => (\n                          <span key={c.id} className="rounded-lg border border-neon/60 bg-neon/10 px-2 py-1 text-[10px] font-extrabold text-neon">\n                            KNOWN BAD STRUCTURE · {c.name} ↦\n                          </span>\n                        ))}\n                      </div>\n                    ) : (\n                      <div className="mt-1 text-[10px] italic text-viol">No proven structure here yet — release it, or research narrative analytics.</div>\n                    )}`
);

// --- 32/40 sequel rights and low-score reboot salvage route ---
replaceOnce(
  "game_source/src/engine/franchise.ts",
`export const continuationDef = (kind: EntryKind): ContinuationDef | null =>\n  CONTINUATIONS.find((c) => c.kind === kind) ?? null;`,
`export const continuationDef = (kind: EntryKind): ContinuationDef | null =>\n  CONTINUATIONS.find((c) => c.kind === kind) ?? null;\n\nexport const SEQUEL_SCORE_THRESHOLD = 32;`
);
replaceOnce(
  "game_source/src/engine/franchise.ts",
`): string | null {\n  if (kind === "season") {`,
`): string | null {\n  if ((kind === "season" || kind === "movie") && fr.lastScore < SEQUEL_SCORE_THRESHOLD) {\n    return \`Sequel rights require \${SEQUEL_SCORE_THRESHOLD}/40 on the latest entry (currently \${fr.lastScore}/40). A spin-off or reboot can still rescue the IP.\`;\n  }\n  if (kind === "season") {`
);
replaceOnce(
  "game_source/src/engine/franchise.ts",
`  if (kind === "reboot") {\n    if (fr.entries.length < 2) return "Needs at least 2 entries to reboot";\n    if (fr.fatigue < 40 && opts.week - fr.lastEntryWeek < 96)\n      return "Only worth it once the IP is tired (fatigue 40+) or long dormant (2+ years)";\n  }`,
`  if (kind === "reboot" && fr.lastScore >= SEQUEL_SCORE_THRESHOLD) {\n    if (fr.entries.length < 2) return "Needs at least 2 entries to reboot";\n    if (fr.fatigue < 40 && opts.week - fr.lastEntryWeek < 96)\n      return "Only worth it once the IP is tired (fatigue 40+) or long dormant (2+ years)";\n  }`
);
replaceOnce(
  "game_source/src/engine/franchise.ts",
`  const charDelta = verdict.verdict === "delight" ? 8 : verdict.verdict === "fine" ? 4 : -6;\n  const cast = fr.cast.map((c) => ({ ...c, popularity: clampPct(c.popularity + charDelta) }));`,
`  const charDelta = verdict.verdict === "delight" ? 8 : verdict.verdict === "fine" ? 4 : -6;\n  const latestBilling: Record<FranchiseChar["role"], { id: string; name?: string }> = {\n    protag: { id: d.protag, name: d.protagName },\n    secondary: { id: d.secondary, name: d.secondaryName },\n    pet: { id: d.pet, name: d.petName },\n    villain: { id: d.villain, name: d.villainName },\n  };\n  const cast = fr.cast.map((c) => {\n    const billing = latestBilling[c.role];\n    return {\n      ...c,\n      id: billing.id || c.id,\n      name: billing.name?.trim() || c.name,\n      popularity: clampPct(c.popularity + charDelta),\n    };\n  });`
);

// --- Release-screen sequel-rights messaging + title in review seed ---
replaceOnce(
  "game_source/src/components/Release.tsx",
`                        outlet: r.outlet,\n                        focus: r.focus,`,
`                        title: draft.title,\n                        outlet: r.outlet,\n                        focus: r.focus,`
);
replaceOnce(
  "game_source/src/components/Release.tsx",
`                      {result.hallOfFame && <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-extrabold text-gold"><Trophy size={12} /> THE POSTER WILL HANG IN YOUR STUDIO</div>}\n                      {!result.hallOfFame && result.total >= 30 && <div className="mt-2 text-[10px] font-extrabold text-mint">SEQUEL RIGHTS SECURED</div>}`,
`                      {result.hallOfFame && <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-extrabold text-gold"><Trophy size={12} /> THE POSTER WILL HANG IN YOUR STUDIO</div>}\n                      {result.total >= 32\n                        ? <div className="mt-2 text-[10px] font-extrabold text-mint">SEQUEL RIGHTS SECURED · 32/40 THRESHOLD MET</div>\n                        : <div className="mt-2 text-[10px] font-extrabold text-neon">NO SEQUEL RIGHTS · SPIN-OFF / REBOOT ROUTES REMAIN</div>}`
);
replaceOnce(
  "game_source/src/components/Release.tsx",
`                {draft.franchiseKey && result.total < 30 && <div className="mt-2 rounded-xl border border-neon/40 bg-neon/10 p-2 text-center text-[10px] font-bold text-neon2">The sequel underperformed, but the series remains available from SERIES in the office.</div>}`,
`                {draft.franchiseKey && result.total < 32 && <div className="mt-2 rounded-xl border border-neon/40 bg-neon/10 p-2 text-center text-[10px] font-bold text-neon2">This entry missed 32/40, so another season or sequel film is locked. Spin-off and reboot routes remain available from SERIES.</div>}`
);

console.log("Finished consequences branch source patches.");
