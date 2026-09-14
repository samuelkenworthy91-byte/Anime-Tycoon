from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(f"{path}: expected at least {count} occurrence(s), found {found}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))


state = "game_source/src/engine/state.ts"
replace(
    state,
    'import { trailblazerProductionMult } from "./showrunnerPerks";\n',
    'import { trailblazerProductionMult } from "./showrunnerPerks";\nimport { alignRecruitmentPool, specialisationProjectEffects } from "./specialisation";\n',
)
replace(
    state,
    '    candidates: rollHirePool(r.week),\n',
    '    candidates: alignRecruitmentPool(r, rollHirePool(r.week)),\n',
)
replace(
    state,
    '  const mods: StaffModFn = (st, p, team) => personMod(st, p, team, { bonds });\n',
    '''  const mods: StaffModFn = (st, p, team) => {\n    const base = personMod(st, p, team, { bonds });\n    const signature = specialisationProjectEffects(r, p.draft);\n    return { ...base, out: base.out * signature.outputMult, pace: base.pace * signature.paceMult };\n  };\n''',
)
replace(
    state,
    '    effective *= managementOutputMult(activeProjects(r.projects).length, r.officeLevel, Object.values(r.heads ?? {}).filter(Boolean).length, r.capitalProjects.includes("flagship_hq"));\n',
    '    effective *= managementOutputMult(activeProjects(r.projects).length, r.officeLevel, Object.values(r.heads ?? {}).filter(Boolean).length, r.capitalProjects.includes("flagship_hq"));\n    effective *= specialisationProjectEffects(r, project.draft).outputMult;\n',
)
old_runner = '''function showrunnerEffectiveSkill(r: RunState, type: PointType): number {\n  let skill = showrunnerContractSkill(r.showrunner, r.showrunnerCareer, type);\n  skill *= facilityFX(r.facilities).pointMult[type];\n  skill *= studioPointMult(r.heads ?? {}, r.staff, r.legends ?? [])[type];\n  if (r.research.includes("pipeline")) skill *= 1.12;\n  if (type === "story" && r.research.includes("storyboard")) skill *= 1.15;\n  if (type === "art" && r.research.includes("mocap")) skill *= 1.12;\n  skill *= managementOutputMult(activeProjects(r.projects).length, r.officeLevel, Object.values(r.heads ?? {}).filter(Boolean).length, r.capitalProjects.includes("flagship_hq"));\n  if (r.showrunner === "steady") skill *= 1.5;\n  return skill;\n}\n'''
new_runner = '''function showrunnerEffectiveSkill(r: RunState, type: PointType, project?: Project): number {\n  let skill = showrunnerContractSkill(r.showrunner, r.showrunnerCareer, type);\n  skill *= facilityFX(r.facilities).pointMult[type];\n  skill *= studioPointMult(r.heads ?? {}, r.staff, r.legends ?? [])[type];\n  if (r.research.includes("pipeline")) skill *= 1.12;\n  if (type === "story" && r.research.includes("storyboard")) skill *= 1.15;\n  if (type === "art" && r.research.includes("mocap")) skill *= 1.12;\n  skill *= managementOutputMult(activeProjects(r.projects).length, r.officeLevel, Object.values(r.heads ?? {}).filter(Boolean).length, r.capitalProjects.includes("flagship_hq"));\n  if (project) skill *= specialisationProjectEffects(r, project.draft).outputMult;\n  if (r.showrunner === "steady") skill *= 1.5;\n  return skill;\n}\n'''
replace(state, old_runner, new_runner)
replace(
    state,
    '      const skills = POINT_TYPES.map((type) => ({ type, skill: showrunnerEffectiveSkill(r, type) })).sort((a, b) => b.skill - a.skill);\n',
    '      const skills = POINT_TYPES.map((type) => ({ type, skill: showrunnerEffectiveSkill(r, type, active) })).sort((a, b) => b.skill - a.skill);\n',
)
replace(
    state,
    '      const points = showrunnerBubbleOutput(showrunnerEffectiveSkill(r, type));\n      if (points > 0) pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type, points, nonce: Date.now() + 900 + pulses.length, source: "project", projectId: active.id });\n',
    '      const points = showrunnerBubbleOutput(showrunnerEffectiveSkill(r, type, active));\n      if (points > 0) pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type, points, nonce: Date.now() + 900 + pulses.length, source: "project", projectId: active.id });\n',
)
replace(
    state,
    '    } else if (roll() < PROJECT_NOTE_PULSE_CHANCE * (r.showrunner === "steady" ? 0.75 : 1)) {\n',
    '    } else if (roll() < PROJECT_NOTE_PULSE_CHANCE * specialisationProjectEffects(r, production.draft).issueChanceMult * (r.showrunner === "steady" ? 0.75 : 1)) {\n',
)
old_live_mods = '''  const mods: StaffModFn = (st, p, team) => {\n    const base = personMod(st, p, team, { bonds: nx.bonds ?? {} });\n    const discovery = trailblazerProductionMult(nx.showrunner, p.draft.genres, nx.comboLevels ?? {});\n    return { ...base, out: base.out * discovery, pace: base.pace * discovery };\n  };\n'''
new_live_mods = '''  const mods: StaffModFn = (st, p, team) => {\n    const base = personMod(st, p, team, { bonds: nx.bonds ?? {} });\n    const discovery = trailblazerProductionMult(nx.showrunner, p.draft.genres, nx.comboLevels ?? {});\n    const signature = specialisationProjectEffects(nx, p.draft);\n    return {\n      ...base,\n      out: base.out * discovery * signature.outputMult,\n      pace: base.pace * discovery * signature.paceMult,\n    };\n  };\n'''
replace(state, old_live_mods, new_live_mods)

spending = "game_source/src/engine/spending.ts"
replace(
    spending,
    'import type { RunState } from "./state";\n',
    'import type { RunState } from "./state";\nimport { specialisationProjectEffects } from "./specialisation";\n',
)
replace(
    spending,
    'export function interventionQuote(run: RunState, d0: InterventionDef, tierId: InvestmentTierId = "standard"): InterventionQuote | null {\n',
    'export function interventionQuote(run: RunState, d0: InterventionDef, tierId: InvestmentTierId = "standard", draft?: Project["draft"]): InterventionQuote | null {\n',
)
replace(
    spending,
    '  const capability = d.capability ? productionCapability(run, d.capability) : null;\n  const capabilityMult = 1 + (capability?.level ?? 0) * .02;\n',
    '  const capability = d.capability ? productionCapability(run, d.capability) : null;\n  const signature = draft ? specialisationProjectEffects(run, draft) : null;\n  const capabilityMult = 1 + (capability?.level ?? 0) * .02;\n  const signatureEffectMult = signature?.interventionEffectMult ?? 1;\n',
)
replace(
    spending,
    '    cost: useTier === "standard" ? d.cost : round5k(d.cost * tier.costMult),\n    points: Math.max(0, Math.round(tuned.points * tier.pointMult * capabilityMult)),\n    issueDelta: scaleSigned(tuned.issueDelta, tier.repairMult * postRepairMult),\n    hype: scaleSigned(d.hype ?? 0, tier.hypeMult * (d.capability === "marketing" ? capabilityMult : 1) * marketingCapitalMult),\n    days: Math.max(0, Math.round((d.days ?? 0) * tier.scheduleMult)),\n    risk: Math.max(0, Math.min(.9, tuned.risk * tier.riskMult * riskExperience)),\n',
    '''    cost: (() => {\n      const baseCost = useTier === "standard" ? d.cost : round5k(d.cost * tier.costMult);\n      const mult = signature?.interventionCostMult ?? 1;\n      return Math.abs(mult - 1) < .001 ? baseCost : round5k(baseCost * mult);\n    })(),\n    points: Math.max(0, Math.round(tuned.points * tier.pointMult * capabilityMult * signatureEffectMult)),\n    issueDelta: scaleSigned(tuned.issueDelta, tier.repairMult * postRepairMult * (tuned.issueDelta < 0 ? signatureEffectMult : 1)),\n    hype: scaleSigned(d.hype ?? 0, tier.hypeMult * (d.capability === "marketing" ? capabilityMult : 1) * marketingCapitalMult * signatureEffectMult),\n    days: Math.max(0, Math.round((d.days ?? 0) * tier.scheduleMult)),\n    risk: Math.max(0, Math.min(.9, tuned.risk * tier.riskMult * riskExperience * (signature?.interventionRiskMult ?? 1))),\n''',
)
replace(
    spending,
    '  const quote = interventionQuote(run, d, useTier);\n',
    '  const quote = interventionQuote(run, d, useTier, p.draft);\n',
)
replace(
    spending,
    '  const quote = interventionQuote(run, d, parsed.tier)!;\n',
    '  const quote = interventionQuote(run, d, parsed.tier, p.draft)!;\n',
)

projects = "game_source/src/components/Projects.tsx"
replace(
    projects,
    'import { INTERVENTIONS, interventionBlock } from "../engine/spending";\n',
    'import { INTERVENTIONS, interventionBlock, interventionQuote } from "../engine/spending";\n',
)
old_row = '{INTERVENTIONS.map((d) => { const block=interventionBlock(run,p,d); return <button key={d.id} disabled={!!block} title={block??d.description} onClick={()=>onIntervention(p.id,d.id)} className={cn("rounded-lg border p-2 text-left text-[9px]",block?"border-line/40 opacity-35":"border-gold/35 bg-gold/5 hover:border-gold")}><b className="block text-paper">{d.name}</b><span className="text-gold">−{formatGBPShort(d.cost)}</span><span className="ml-1 text-paper/40">{block??d.description}</span></button>})}'
new_row = '''{INTERVENTIONS.map((d) => {\n              const block = interventionBlock(run, p, d);\n              const quote = interventionQuote(run, d, "standard", p.draft);\n              return <button key={d.id} disabled={!!block} title={block ?? d.description} onClick={() => onIntervention(p.id, d.id)} className={cn("rounded-lg border p-2 text-left text-[9px]", block ? "border-line/40 opacity-35" : "border-gold/35 bg-gold/5 hover:border-gold")}><b className="block text-paper">{d.name}</b><span className="text-gold">−{formatGBPShort(quote?.cost ?? d.cost)}</span><span className="ml-1 text-paper/40">{block ?? d.description}</span></button>;\n            })}'''
replace(projects, old_row, new_row)

ship = "game_source/src/components/Ship.tsx"
replace(
    ship,
    'import { cn } from "../utils/cn";\n',
    'import { campaignForecastAccess, specialisationProjectEffects } from "../engine/specialisation";\nimport { cn } from "../utils/cn";\n',
)
replace(
    ship,
    '  const dataTier = run.facilities.data ?? 0;\n',
    '  const dataTier = run.facilities.data ?? 0;\n  const forecastAccess = campaignForecastAccess(run, project.draft, dataTier);\n  const houseEffect = specialisationProjectEffects(run, project.draft);\n',
)
old_intel = '''          <span>·</span>\n          <span className={dataTier ? "text-cyanx" : "text-paper/35"}>Data Lab T{dataTier}: {dataTier ? "fit forecast active" : "fit hidden"}</span>\n          <span className="ml-auto font-bold text-gold">{bought.length}/{MAX_STRATEGIC_CAMPAIGNS} booked</span>\n'''
new_intel = '''          <span>·</span>\n          <span className={forecastAccess === "exact" ? "text-cyanx" : forecastAccess === "band" ? "text-gold" : "text-paper/35"}>Data Lab T{dataTier}: {forecastAccess === "exact" ? "exact fit forecast" : forecastAccess === "band" ? "directional fit band" : "fit hidden"}</span>\n          {houseEffect.active && <span className={houseEffect.signature ? "font-bold text-mint" : "font-bold text-neon"}>{houseEffect.signature ? `SIGNATURE · ${houseEffect.rank.toUpperCase()}` : "OUTSIDE SPECIALITY · LOWER CONFIDENCE"}</span>}\n          <span className="ml-auto font-bold text-gold">{bought.length}/{MAX_STRATEGIC_CAMPAIGNS} booked</span>\n'''
replace(ship, old_intel, new_intel)
replace(
    ship,
    '            const capitalActive = !!campaign.capitalSynergy && run.capitalProjects.includes(campaign.capitalSynergy);\n',
    '            const capitalActive = !!campaign.capitalSynergy && run.capitalProjects.includes(campaign.capitalSynergy);\n            const fitKnown = forecastAccess !== "hidden";\n            const fitExact = forecastAccess === "exact";\n',
)
old_fit = '<span className={cn("rounded border px-1.5 py-.5", dataTier ? (fit >= 1.05 ? "border-mint/40 text-mint" : fit < .9 ? "border-neon/40 text-neon" : "border-line text-paper/55") : "border-line text-paper/35")}>{dataTier ? `FIT ${campaignFitLabel(fit)} · ×${fit.toFixed(2)}` : "FIT ??? · build Data Lab"}</span>'
new_fit = '<span className={cn("rounded border px-1.5 py-.5", fitKnown ? (fit >= 1.05 ? "border-mint/40 text-mint" : fit < .9 ? "border-neon/40 text-neon" : "border-line text-paper/55") : "border-line text-paper/35")}>{fitKnown ? `FIT ${campaignFitLabel(fit)}${fitExact ? ` · ×${fit.toFixed(2)}` : " · directional"}` : "FIT ??? · improve forecasting"}</span>'
replace(ship, old_fit, new_fit)

rivals = "game_source/src/components/Rivals.tsx"
replace(
    rivals,
    'import { cn } from "../utils/cn";\n',
    'import StudioIdentity from "./StudioIdentity";\nimport { cn } from "../utils/cn";\n',
)
replace(
    rivals,
    '  const [tab, setTab] = useState<"rankings" | "studios" | "talent">("rankings");\n',
    '  const [tab, setTab] = useState<"identity" | "rankings" | "studios" | "talent">("rankings");\n',
)
replace(
    rivals,
    '          [\n            ["rankings", "RANKINGS"],\n',
    '          [\n            ["identity", "IDENTITY"],\n            ["rankings", "RANKINGS"],\n',
)
replace(
    rivals,
    '      {tab === "rankings" && (\n',
    '      {tab === "identity" && <StudioIdentity run={run} setRun={setRun} />}\n\n      {tab === "rankings" && (\n',
)

validation = ".github/workflows/midgame-endgame-validation.yml"
replace(
    validation,
    '        run: npx vitest run src/engine/__tests__/award-nominations.test.ts src/engine/__tests__/award-expectations.test.ts src/engine/__tests__/ip-renewal.test.ts --reporter=verbose\n',
    '        run: npx vitest run src/engine/__tests__/award-nominations.test.ts src/engine/__tests__/award-expectations.test.ts src/engine/__tests__/ip-renewal.test.ts src/engine/__tests__/studio-specialisation.test.ts --reporter=verbose\n',
)

print("Stage 6 patches applied")
