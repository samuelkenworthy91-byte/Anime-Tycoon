from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), found {found}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))

# 1) Level-ups are a durable queue and must never cover the final release/scoring sequence.
replace(
    "game_source/src/engine/presentation.ts",
    "  auctionForecastOpen: boolean;\n}",
    "  auctionForecastOpen: boolean;\n  productionRevealOpen: boolean;\n}",
)
replace(
    "game_source/src/engine/presentation.ts",
    "    !context.decisionEventOpen &&\n    !context.auctionForecastOpen\n",
    "    !context.decisionEventOpen &&\n    !context.auctionForecastOpen &&\n    !context.productionRevealOpen\n",
)
replace(
    "game_source/src/engine/__tests__/presentation.test.ts",
    "  auctionForecastOpen: false,\n};",
    "  auctionForecastOpen: false,\n  productionRevealOpen: false,\n};",
)
replace(
    "game_source/src/engine/__tests__/presentation.test.ts",
    "    expect(canPresentDeferredLevelUp({ ...base, auctionForecastOpen: true })).toBe(false);\n",
    "    expect(canPresentDeferredLevelUp({ ...base, auctionForecastOpen: true })).toBe(false);\n    expect(canPresentDeferredLevelUp({ ...base, productionRevealOpen: true })).toBe(false);\n",
)

# 2) App uses the stronger release guard, keeps global controls over Office/R&D modals.
replace(
    "game_source/src/App.tsx",
    "    auctionForecastOpen: !!run?.ipMarket.pendingPromptId,\n  }) && !nominationAnnouncementOpen && !bigThreeRevealOpen;",
    "    auctionForecastOpen: !!run?.ipMarket.pendingPromptId,\n    productionRevealOpen: screen === \"release\" || !!released,\n  }) && !nominationAnnouncementOpen && !bigThreeRevealOpen && !released;",
)
replace(
    "game_source/src/App.tsx",
    'className={cn("game-controls absolute right-3 top-2.5 z-40", controlsOpen && "game-controls-open")}',
    'className={cn("game-controls absolute right-3 top-2.5 z-[60]", controlsOpen && "game-controls-open")}',
)

# 3) Pixel portrait: put the collapsed toolbar below modal close controls and lower dossier X.
replace(
    "game_source/src/mobile-layout.css",
    "  .game-controls {\n    top: 5px !important;\n    right: 5px !important;\n  }",
    "  .game-controls {\n    top: calc(env(safe-area-inset-top, 0px) + 48px) !important;\n    right: 5px !important;\n    z-index: 60 !important;\n  }",
)
replace(
    "game_source/src/mobile-layout.css",
    "    padding-top: calc(env(safe-area-inset-top, 0px) + 44px) !important;",
    "    padding-top: calc(env(safe-area-inset-top, 0px) + 52px) !important;",
)
replace(
    "game_source/src/mobile-layout.css",
    "    max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 60px) !important;",
    "    max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 68px) !important;",
)
replace(
    "game_source/src/mobile-layout.css",
    "    margin-top: -3px;",
    "    margin-top: 5px;",
)

# 4) Hiring: normal appearances are an equal uniform draw from the unused pool.
replace(
    "game_source/src/engine/careers.ts",
    """  const base = rollCandidate(week);\n  const specialRoll = rng();\n  let candidate = specialRoll < DANTE_HIRE_CHANCE && !excludedLooks.has(DANTE_WORKER_LOOK_INDEX)\n    ? applyDanteEasterEgg(base, week)\n    : specialRoll < DANTE_HIRE_CHANCE + AVRIL_HIRE_CHANCE && !excludedLooks.has(AVRIL_WORKER_LOOK_INDEX)\n      ? applyAvrilEasterEgg(base, week)\n      : base;\n  if (candidate.look !== undefined && excludedLooks.has(candidate.look)) {\n    const availableLook = STANDARD_WORKER_LOOK_INDICES.find((look) => !excludedLooks.has(look));\n    if (availableLook !== undefined) candidate = { ...candidate, look: availableLook };\n  }\n  return ensureCareer(candidate, week);\n""",
    """  const rolled = rollCandidate(week);\n  const availableStandard = STANDARD_WORKER_LOOK_INDICES.filter((look) => !excludedLooks.has(look));\n  const standardLook = availableStandard.length\n    ? availableStandard[Math.min(availableStandard.length - 1, Math.floor(rng() * availableStandard.length))]\n    : rolled.look;\n  const base = { ...rolled, look: standardLook };\n  const specialRoll = rng();\n  const candidate = specialRoll < DANTE_HIRE_CHANCE && !excludedLooks.has(DANTE_WORKER_LOOK_INDEX)\n    ? applyDanteEasterEgg(base, week)\n    : specialRoll < DANTE_HIRE_CHANCE + AVRIL_HIRE_CHANCE && !excludedLooks.has(AVRIL_WORKER_LOOK_INDEX)\n      ? applyAvrilEasterEgg(base, week)\n      : base;\n  return ensureCareer(candidate, week);\n""",
)

# 5) Every showrunner level-up explicitly reminds the player of the numeric advantage.
replace(
    "game_source/src/components/ShowrunnerLevelUpModal.tsx",
    'import { showrunnerLevelTitle } from "../engine/showrunnerCareer";\n',
    'import { showrunnerLevelTitle } from "../engine/showrunnerCareer";\nimport { showrunnerImpactSummary } from "../engine/showrunnerImpact";\n',
)
replace(
    "game_source/src/components/ShowrunnerLevelUpModal.tsx",
    "  const total = record.gains.story + record.gains.art + record.gains.sound;\n",
    "  const total = record.gains.story + record.gains.art + record.gains.sound;\n  const founderImpact = showrunnerImpactSummary(run.showrunner);\n",
)
replace(
    "game_source/src/components/ShowrunnerLevelUpModal.tsx",
    '        {step >= 5 && <div className="anim-pop mt-2 rounded-xl border border-mint/30 bg-mint/5 p-2 text-xs text-mint"><Check size={13} className="mr-1 inline" /> Total growth +{Math.round(total)}</div>}\n',
    '        {step >= 5 && <div className="anim-pop mt-2 rounded-xl border border-mint/30 bg-mint/5 p-2 text-xs text-mint"><Check size={13} className="mr-1 inline" /> Total growth +{Math.round(total)}</div>}\n        {step >= 5 && <div className="anim-pop rounded-xl border border-gold/35 bg-gold/5 p-3 text-left"><div className="text-[8px] font-black tracking-[0.2em] text-gold">FOUNDER ADVANTAGE · LIVE NUMBERS</div><div className="mt-1 text-[11px] font-bold text-paper/85">{founderImpact.name} · {founderImpact.title}</div><div className="mt-1 text-[10px] leading-relaxed text-paper/60">{founderImpact.numbers}</div></div>}\n',
)

# 6) Release development report exposes direct showrunner impact for show-result relevant perks.
replace(
    "game_source/src/engine/scoring.ts",
    "  let arcQ = 0;\n  let arcsF = 0;\n",
    "  let arcQ = 0;\n  let arcsF = 0;\n  let visionArcBonus = 0;\n",
)
replace(
    "game_source/src/engine/scoring.ts",
    '      if (showrunner === "vision" && (arc.id === "twist" || arc.id === "lore")) arcQ += 2;\n',
    '      if (showrunner === "vision" && (arc.id === "twist" || arc.id === "lore")) { arcQ += 2; visionArcBonus += 2; }\n',
)
replace(
    "game_source/src/engine/scoring.ts",
    "  const actualComboMult = contrarianComboMult(showrunner, draft.genres);\n",
    "  const baseComboMult = comboMult(draft.genres, true);\n  const actualComboMult = contrarianComboMult(showrunner, draft.genres);\n",
)
replace(
    "game_source/src/engine/scoring.ts",
    "  const fans = Math.round(units * (web ? web.fanPerView : 0.09) * tierFan * narrativeMomentumFanMult(showrunner, draft, points));\n",
    "  const showrunnerFanMult = narrativeMomentumFanMult(showrunner, draft, points);\n  const fans = Math.round(units * (web ? web.fanPerView : 0.09) * tierFan * showrunnerFanMult);\n",
)
replace(
    "game_source/src/engine/scoring.ts",
    '  if (secretDiscovered) breakdown.push({ label: "Secret combo discovered!", pts: `×${genreEffect.salesMultiplier.toFixed(2)} sales` });\n\n  return {\n',
    '''  if (secretDiscovered) breakdown.push({ label: "Secret combo discovered!", pts: `×${genreEffect.salesMultiplier.toFixed(2)} sales` });\n\n  /* Make founder perks legible as actual advantages rather than flavour text. */\n  if (showrunner === "casting") {\n    const withoutFounder = Math.round(fans / showrunnerFanMult);\n    breakdown.push({\n      label: "Ren Mercer · Narrative Momentum",\n      pts: `×${showrunnerFanMult.toFixed(2)} fans · +${Math.max(0, fans - withoutFounder).toLocaleString("en-GB")} fans this release`,\n    });\n  }\n  if (showrunner === "festival" && actualComboMult !== baseComboMult)\n    breakdown.push({ label: "Soren Berg · Against the Grain", pts: `genre synergy ×${baseComboMult.toFixed(2)} → ×${actualComboMult.toFixed(2)}` });\n  if (showrunner === "vision" && visionArcBonus > 0)\n    breakdown.push({ label: "Akari Natsume · Vision", pts: `+${(visionArcBonus * arcWeight).toFixed(1)} story quality from Twist/Lore synergy` });\n  if (showrunner === "genre" && newCombo)\n    breakdown.push({ label: "Roxie Kade · No Blueprint", pts: "×1.35 production output & pace on this first-time genre pairing" });\n  if (showrunner === "marketer")\n    breakdown.push({ label: "Sana Kobayashi · Buzz Engine", pts: `+10 opening hype · final hype ${Math.round(hype)} · marketing gains ×1.50` });\n  if (showrunner === "steady")\n    breakdown.push({ label: "Genji Ashida · Steady Hand", pts: `staff contribution ×1.50 · note chance ×0.75 · ${issues} unresolved note${issues === 1 ? "" : "s"}` });\n\n  return {\n''',
)

# 7) Extend hiring/presentation/showrunner regression coverage.
replace(
    "game_source/src/engine/__tests__/recruitment-ads.test.ts",
    'import { rollHirePool } from "../careers";\n',
    'import { DANTE_HIRE_CHANCE, AVRIL_HIRE_CHANCE, rollHire, rollHirePool } from "../careers";\nimport { DANTE_WORKER_LOOK_INDEX, AVRIL_WORKER_LOOK_INDEX, STANDARD_WORKER_LOOK_INDICES } from "../data";\n',
)
replace(
    "game_source/src/engine/__tests__/recruitment-ads.test.ts",
    '  it("increases the price for each refresh during the same month", () => {\n',
    '''  it("gives every ordinary look the same selectable interval while reserving Dante and Avril", () => {\n    expect(DANTE_HIRE_CHANCE).toBe(0.01);\n    expect(AVRIL_HIRE_CHANCE).toBe(0.01);\n    expect(STANDARD_WORKER_LOOK_INDICES).not.toContain(DANTE_WORKER_LOOK_INDEX);\n    expect(STANDARD_WORKER_LOOK_INDICES).not.toContain(AVRIL_WORKER_LOOK_INDEX);\n    for (let index = 0; index < STANDARD_WORKER_LOOK_INDICES.length; index += 1) {\n      const normalRoll = (index + 0.5) / STANDARD_WORKER_LOOK_INDICES.length;\n      const values = [normalRoll, 0.5];\n      const candidate = rollHire(0, () => values.shift() ?? 0.5);\n      expect(candidate.look).toBe(STANDARD_WORKER_LOOK_INDICES[index]);\n    }\n  });\n\n  it("increases the price for each refresh during the same month", () => {\n''',
)

# Helper mapping and source-layout assertions live in one lightweight playtest guard.
Path("game_source/src/engine/__tests__/playtest-regressions.test.ts").write_text('''import { readFileSync } from "node:fs";\nimport { describe, expect, it } from "vitest";\nimport { SHOWRUNNERS } from "../data";\nimport { showrunnerImpactSummary } from "../showrunnerImpact";\n\ndescribe("playtest regression guards", () => {\n  it("publishes an exact numeric advantage for every selectable showrunner", () => {\n    for (const runner of SHOWRUNNERS) {\n      const impact = showrunnerImpactSummary(runner.id);\n      expect(impact.name).toBe(runner.name);\n      expect(impact.numbers).toMatch(/\\d/);\n    }\n    expect(showrunnerImpactSummary("casting").name).toBe("Ren Mercer");\n    expect(showrunnerImpactSummary("casting").numbers).toContain("×1.50");\n  });\n\n  it("keeps the collapsed time controls above Office/R&D modals but below major reveals", () => {\n    const app = readFileSync("src/App.tsx", "utf8");\n    const mobile = readFileSync("src/mobile-layout.css", "utf8");\n    expect(app).toContain('z-[60]');\n    expect(mobile).toContain('z-index: 60');\n    expect(mobile).toContain('safe-area-inset-top');\n  });\n\n  it("keeps the worker dossier close target deliberately below the very top edge", () => {\n    const css = readFileSync("src/mobile-layout.css", "utf8");\n    expect(css).toContain("margin-top: 5px");\n    expect(css).toContain("+ 52px");\n  });\n});\n''')
