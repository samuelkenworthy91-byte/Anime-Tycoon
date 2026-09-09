from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text()


def write(rel, text):
    (ROOT / rel).write_text(text)


def once(text, old, new, label):
    if text.count(old) != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {text.count(old)}")
    return text.replace(old, new, 1)

def first(text, old, new, label):
    if old not in text:
        raise SystemExit(f"{label}: patch point missing")
    return text.replace(old, new, 1)

# ---------------------------------------------------------------- events.ts
p = "src/engine/events.ts"
s = read(p)
s = once(s,
'import type { Project } from "./projects";\nimport type { RunState } from "./state";\n',
'import type { Project } from "./projects";\nimport type { RunState } from "./state";\nimport { rollAdvancedDecision, resolveAdvancedDecision, type AdvancedDecisionContext, type AdvancedDecisionEvent } from "./decisionEvents";\n',
"events imports")
s = once(s,
'  | "backlash"\n  | "convention";\n',
'  | "backlash"\n  | "convention"\n  | "decision";\n',
"event kind")
s = once(s,
'  text: string;\n  choices: EventChoice[];\n',
'  text: string;\n  choices: EventChoice[];\n  /** full-screen high-stakes decision metadata */\n  headline?: string;\n  category?: string;\n  payload?: AdvancedDecisionEvent["payload"];\n',
"event metadata")
old_ctx = '''export interface StudioEventContext {\n  crew: { id: string; name: string; role: Staff["role"]; level: number; morale: number }[];\n  active: { id: string; title: string; stage: string; hype: number; issues: number }[];\n  topFranchise: { key: string; title: string; popularity: number } | null;\n}\n'''
new_ctx = '''export interface StudioEventContext extends AdvancedDecisionContext {\n  crew: { id: string; name: string; role: Staff["role"]; level: number; morale: number }[];\n  active: { id: string; title: string; stage: string; hype: number; issues: number }[];\n  topFranchise: { key: string; title: string; popularity: number } | null;\n}\n'''
s = once(s, old_ctx, new_ctx, "event context")
s = once(s,
'export function rollStudioEvent(week: number, ctx: StudioEventContext): StudioEvent | null {\n  const kinds: StudioEventKind[] = [];\n',
'export function rollStudioEvent(week: number, ctx: StudioEventContext): StudioEvent | null {\n  /* Most rolls now come from the broad executive-decision deck. The original\n     production dilemmas remain as the studio-floor half of the same system. */\n  if (Math.random() < 0.72) {\n    const advanced = rollAdvancedDecision(week, ctx);\n    if (advanced) return advanced as StudioEvent;\n  }\n  const kinds: StudioEventKind[] = [];\n',
"advanced roll")
s = once(s,
'  const choice = ev.choices.find((c) => c.id === choiceId);\n  if (!choice) return null;\n  const rest = (run.studioEvents ?? []).filter((x) => x.id !== eventId);\n',
'  const choice = ev.choices.find((c) => c.id === choiceId);\n  if (!choice) return null;\n  if (ev.kind === "decision") return resolveAdvancedDecision(run, ev as AdvancedDecisionEvent, choiceId);\n  const rest = (run.studioEvents ?? []).filter((x) => x.id !== eventId);\n',
"advanced resolve")
write(p, s)

# ----------------------------------------------------------- projects.ts
p = "src/engine/projects.ts"
s = read(p)
s = once(s,
'import { computeResult, type Points, type ShowResult } from "./scoring";\n',
'import { computeResult, type Points, type ShowResult } from "./scoring";\nimport { genreTargetFor } from "./genreTargets";\n',
"project target import")
s = once(s,
'  /** production automation (engine/automation.ts) — null = fully manual */\n  auto?: AutoState | null;\n',
'  /** small spontaneous polish win rolled as the edit bay hands off to marketing */\n  lastMinuteBoost?: { type: PointType; points: number } | null;\n  /** production automation (engine/automation.ts) — null = fully manual */\n  auto?: AutoState | null;\n',
"project boost field")
s = once(s,
'  const draft: Draft = o.rename ? { ...directed, ...o.rename } : directed;\n  const nx = NEXT_STAGE[p.stage] ?? p.stage;\n  return {\n',
'  const draft: Draft = o.rename ? { ...directed, ...o.rename } : directed;\n  const nx = NEXT_STAGE[p.stage] ?? p.stage;\n  /* A small post-QC chance for one last inspired bubble before marketing.\n     It is deliberately modest: 24% chance, +2..6 in one craft. */\n  const lastMinuteBoost = done === "edit" && Math.random() < 0.24\n    ? { type: (["story", "art", "sound"] as PointType[])[Math.floor(Math.random() * 3)], points: 2 + Math.floor(Math.random() * 5) }\n    : null;\n  return {\n',
"last minute roll")
s = once(s,
'    points: {\n      story: p.points.story + o.points.story,\n      art: p.points.art + o.points.art,\n      sound: p.points.sound + o.points.sound,\n    },\n',
'    points: {\n      story: p.points.story + o.points.story + (lastMinuteBoost?.type === "story" ? lastMinuteBoost.points : 0),\n      art: p.points.art + o.points.art + (lastMinuteBoost?.type === "art" ? lastMinuteBoost.points : 0),\n      sound: p.points.sound + o.points.sound + (lastMinuteBoost?.type === "sound" ? lastMinuteBoost.points : 0),\n    },\n    lastMinuteBoost,\n',
"last minute points")
old_target = '''  const d = p.draft;\n  const genres = d.genres;\n  const avgOf = (pick: (i: number) => number[]) =>\n    [0, 1, 2].map((i) => pick(i).reduce((a, b) => a + b, 0) / Math.max(1, genres.length));\n  const ideal = avgOf((i) => genres.map((g) => GENRES.find((x) => x.id === g)!.ideal[i])).map(Math.round) as [number, number, number];\n  const ratio = (genres.length\n    ? avgOf((i) => genres.map((g) => GENRES.find((x) => x.id === g)!.ratio[i]))\n    : [0.34, 0.33, 0.33]) as [number, number, number];\n'''
new_target = '''  const d = p.draft;\n  const genres = d.genres;\n  const productionTarget = genreTargetFor(genres);\n  const ideal = productionTarget.ideal;\n  const ratio = productionTarget.ratio;\n'''
s = once(s, old_target, new_target, "specific genre targets")
write(p, s)

# ------------------------------------------------------------ scoring.ts
p = "src/engine/scoring.ts"
s = read(p)
s = once(s,
'} from "./production";\n',
'} from "./production";\nimport { genreTargetFor } from "./genreTargets";\n',
"scoring target import")
s = once(s, 'export const RAW_QUALITY_BASE = 10;\nexport const RAW_QUALITY_FLOOR = 14;\n', 'export const RAW_QUALITY_BASE = 8;\nexport const RAW_QUALITY_FLOOR = 12;\n', "quality baseline")
s = once(s, 'export const CAST_BASE_QUALITY = 0.5;\nexport const VISIBLE_CAST_QUALITY = 0.6;\n', 'export const CAST_BASE_QUALITY = 0.25;\nexport const VISIBLE_CAST_QUALITY = 0.75;\n', "cast weights")
old_slider = '''  let sliderPart = 0;\n  const perPhase: number[] = [];\n  for (let p = 0; p < 3; p++) {\n    const diff = Math.abs(draft.sliders[p] - genreIdeal[p]);\n    const pts = clamp(4 - (diff / 100) * 4 * 1.7, 0, 4);\n    perPhase.push(pts);\n    sliderPart += pts;\n  }\n'''
new_slider = '''  let sliderPart = 0;\n  const perPhase: number[] = [];\n  const sliderFits: number[] = [];\n  for (let p = 0; p < 3; p++) {\n    const diff = Math.abs(draft.sliders[p] - genreIdeal[p]);\n    const pts = clamp(4 - (diff / 100) * 4 * 2.1, 0, 4);\n    perPhase.push(pts);\n    sliderPart += pts;\n    sliderFits.push(\n      diff <= 4 ? 1.04 :\n      diff <= 8 ? 1.00 :\n      diff <= 14 ? 0.92 :\n      diff <= 22 ? 0.80 :\n      diff <= 32 ? 0.68 : 0.56\n    );\n  }\n  const sliderFitMult = sliderFits.reduce((a, b) => a + b, 0) / Math.max(1, sliderFits.length);\n'''
s = once(s, old_slider, new_slider, "slider fit")
s = once(s,
'  const casting = castParts.reduce((sum, part) => sum + part.totalQuality, 0);\n  const castSalesMultiplier = 1 + castParts.reduce((sum, part) => sum + part.salesBonus, 0);\n',
'  const casting = castParts.reduce((sum, part) => sum + part.totalQuality, 0);\n  const zeroAffinityRoles = castParts.filter((part) => part.tier === 0).length;\n  const wrongTypeRoles = castParts.filter((part) => !part.member.legacyPlaceholder && part.member.type !== draft.animeType).length;\n  /* Bad casting now hurts the WHOLE production instead of merely missing a tiny bonus.\n     Four completely unsuitable roles can cut raw quality by roughly a third. */\n  const castFitMult = clamp(1 - zeroAffinityRoles * 0.075 - wrongTypeRoles * 0.035, 0.62, 1.02);\n  const castSalesMultiplier = 1 + castParts.reduce((sum, part) => sum + part.salesBonus, 0);\n',
"casting penalty")
s = once(s,
'  raw *= comboFactor;\n  raw -= issues * ISSUE_QUALITY_COST;\n',
'  /* Direction, pairing and casting are now hard gates. Great raw craft cannot\n     completely rescue a production whose creative brief is badly wrong. */\n  raw *= sliderFitMult;\n  raw *= genreTargetFor(draft.genres).comboQualityMult;\n  raw *= castFitMult;\n  raw *= comboFactor;\n  raw -= issues * ISSUE_QUALITY_COST;\n',
"hard quality gates")
s = once(s, '  const floor = showrunner === "vision" ? 3 : 1;\n', '  /* Hard mode has a humane critic floor: disastrous work bottoms out around 4/10,\n     but getting above that now demands correct direction, pairing and casting. */\n  const floor = 4;\n', "review floor")
write(p, s)

# --------------------------------------------------------------- state.ts
p = "src/engine/state.ts"
s = read(p)
s = once(s,
'import { rollStudioEvent, type StudioEvent } from "./events";\n',
'import { rollStudioEvent, type StudioEvent } from "./events";\nimport {\n  consumeDecisionModifiers,\n  decisionMerchMult,\n  decisionReleaseFansMult,\n  decisionReleaseQualityBonus,\n  decisionReleaseSalesMult,\n  decisionResearchSpeedMult,\n  modifierMatchesDraft,\n  type DecisionModifier,\n} from "./decisionEvents";\n',
"state decision imports")
s = once(s,
'  /** pending studio dilemmas — 2–3 responses with real trade-offs */\n  studioEvents: StudioEvent[];\n',
'  /** pending studio dilemmas — 2–3 responses with real trade-offs */\n  studioEvents: StudioEvent[];\n  /** persistent one-use / timed consequences created by executive decisions */\n  decisionModifiers: DecisionModifier[];\n  /** recent template ids prevent the decision deck feeling repetitive */\n  studioEventHistory: string[];\n',
"run decision fields")
s = once(s,
'    studioEvents: [],\n    contractJobs: [],\n',
'    studioEvents: [],\n    decisionModifiers: [],\n    studioEventHistory: [],\n    contractJobs: [],\n',
"initial decision fields")
s = once(s,
'    studioEvents: Array.isArray(r.studioEvents) ? r.studioEvents : [],\n    contractJobs: Array.isArray(r.contractJobs) ? r.contractJobs.map((j) => ({ ...j, showrunner: !!j.showrunner, liveProgressThisWeek: j.liveProgressThisWeek ?? 0 })) : [],\n',
'    studioEvents: Array.isArray(r.studioEvents) ? r.studioEvents : [],\n    decisionModifiers: Array.isArray(r.decisionModifiers) ? r.decisionModifiers : [],\n    studioEventHistory: Array.isArray(r.studioEventHistory) ? r.studioEventHistory : [],\n    contractJobs: Array.isArray(r.contractJobs) ? r.contractJobs.map((j) => ({ ...j, showrunner: !!j.showrunner, liveProgressThisWeek: j.liveProgressThisWeek ?? 0 })) : [],\n',
"migrate decision fields")
old_event = '''    /* the occasional studio dilemma — slow cadence so it feels special */\n    studioEvents = studioEvents.filter((e) => w <= e.expiresWeek);\n    if (w % 9 === 0 && studioEvents.length === 0 && Math.random() < 0.45) {\n      const sev = rollStudioEvent(w, {\n        crew: staffArr.map((s) => ({\n          id: s.id,\n          name: s.name,\n          role: s.role,\n          level: s.level,\n          morale: moraleOf(s),\n        })),\n        active: projects\n          .filter((p) => p.stage !== "airing" && p.stage !== "done")\n          .map((p) => ({ id: p.id, title: p.draft.title, stage: p.stage, hype: p.hype, issues: p.issues })),\n        topFranchise: topFranchiseFor(franchises),\n      });\n      if (sev) {\n        studioEvents = [sev];\n        notices.push("🎬 A studio dilemma lands on your desk — open the market to decide.");\n      }\n    }\n'''
new_event = '''    /* High-stakes studio/industry decisions. Roughly 4 per industry year;\n       every one is blocking and the App halts the live clock immediately. */\n    studioEvents = studioEvents.filter((e) => w <= e.expiresWeek);\n    if (w % 7 === 0 && studioEvents.length === 0 && Math.random() < 0.60) {\n      const sev = rollStudioEvent(w, {\n        crew: staffArr.map((s) => ({\n          id: s.id,\n          name: s.name,\n          role: s.role,\n          level: s.level,\n          morale: moraleOf(s),\n        })),\n        active: projects\n          .filter((p) => p.stage !== "airing" && p.stage !== "done")\n          .map((p) => ({ id: p.id, title: p.draft.title, stage: p.stage, hype: p.hype, issues: p.issues })),\n        topFranchise: topFranchiseFor(franchises),\n        market,\n        genresUnlocked: r.genresUnlocked,\n        mediumsUnlocked: r.mediumsUnlocked as MediumId[],\n        researchJobs,\n        yearShows,\n        research,\n      });\n      if (sev) {\n        studioEvents = [sev];\n        notices.push("⚠ EXECUTIVE DECISION — the studio clock has stopped until you choose.");\n      }\n    }\n'''
s = once(s, old_event, new_event, "decision cadence")
# market/release multiplier
s = once(s,
'      marketMult(r.market ?? initMarket(), r.recentReleases ?? [], p.draft, r.week) *\n        attentionMult(othersAiring) *\n        boost *\n',
'      marketMult(r.market ?? initMarket(), r.recentReleases ?? [], p.draft, r.week) *\n        attentionMult(othersAiring) *\n        boost *\n        decisionReleaseSalesMult(r, p.draft) *\n',
"decision release sales")
# fan multiplier in preview
s = once(s,
'    castAffinityDiscovered: r.castAffinityDiscovered,\n  });\n  const scope = PRODUCTION_SCOPES[d.scope ?? "standard"];\n',
'    castAffinityDiscovered: r.castAffinityDiscovered,\n  });\n  const decisionFanMult = decisionReleaseFansMult(r, d);\n  if (Math.abs(decisionFanMult - 1) > 0.001) {\n    out = {\n      ...out,\n      fans: Math.round(out.fans * decisionFanMult),\n      breakdown: [...out.breakdown, { label: "Decision-event audience effect", pts: `×${decisionFanMult.toFixed(2)} fans` }],\n    };\n  }\n  const scope = PRODUCTION_SCOPES[d.scope ?? "standard"];\n',
"decision fan mult")
# start project quality modifier
s = once(s,
'  let p = makeProject(d, r.week, r.day ?? r.week * 7);\n  /* the Hype Machine opens every show with a ready-made buzz */\n',
'  let p = makeProject(d, r.week, r.day ?? r.week * 7);\n  const decisionQuality = decisionReleaseQualityBonus(r, d);\n  if (decisionQuality.length) {\n    for (const bonus of decisionQuality) p = { ...p, points: { ...p.points, [bonus.point]: p.points[bonus.point] + bonus.amount } };\n  }\n  /* the Hype Machine opens every show with a ready-made buzz */\n',
"next product quality")
s = once(s,
'    commissions: commission ? r.commissions.filter((c) => c.id !== commission.id) : r.commissions,\n',
'    commissions: commission ? r.commissions.filter((c) => c.id !== commission.id) : r.commissions,\n    decisionModifiers: consumeDecisionModifiers(r.decisionModifiers ?? [], (m) => m.kind === "releaseQuality" && modifierMatchesDraft(m, d, r.week)),\n',
"consume quality modifier")
# consume release modifiers on release
s = once(s,
'    lastDraft: draft,\n    notices,\n    /* the finished team is freed for the next production */\n',
'    lastDraft: draft,\n    notices,\n    decisionModifiers: consumeDecisionModifiers(\n      r.decisionModifiers ?? [],\n      (m) => ["releaseSales", "releaseFans", "marketBrief"].includes(m.kind) && modifierMatchesDraft(m, draft, r.week),\n    ),\n    /* the finished team is freed for the next production */\n',
"consume release mods")
# research speed regex and consume
s = once(s,
'  const weeks = researchWeeks(rdCost, r.facilities.archive ?? 0, r.showrunner);\n',
'  const baseResearchWeeks = researchWeeks(rdCost, r.facilities.archive ?? 0, r.showrunner);\n  const researchDecisionMult = decisionResearchSpeedMult(r);\n  const weeks = Math.max(0.25, baseResearchWeeks * researchDecisionMult);\n',
"research speed")
s = once(s,
'  return {\n    ...r, rd: r.rd - rdCost, researchJobs: [...(r.researchJobs ?? []), job],\n    notices: [...r.notices, `🔬 ${def.name} begins — ${Math.ceil(weeks * 7)} days in R&D (cost ${rdCost} RD).`],\n  };\n',
'  return {\n    ...r, rd: r.rd - rdCost, researchJobs: [...(r.researchJobs ?? []), job],\n    decisionModifiers: consumeDecisionModifiers(r.decisionModifiers ?? [], (m) => m.kind === "researchSpeed" && m.expiresWeek >= r.week && m.uses > 0),\n    notices: [...r.notices, `🔬 ${def.name} begins — ${Math.ceil(weeks * 7)} days in R&D (cost ${rdCost} RD).${researchDecisionMult < 1 ? " Decision-event acceleration applied." : ""}`],\n  };\n',
"consume research mod")
# merch multiplier
s = once(s,
'  const total = merchReturn(fr, product);\n  const weekly = Math.floor(total / product.weeks);\n',
'  const merchDecisionMult = decisionMerchMult(r);\n  const total = Math.round(merchReturn(fr, product) * merchDecisionMult);\n  const weekly = Math.floor(total / product.weeks);\n',
"merch decision mult")
s = once(s,
'    cash: r.cash - product.cost,\n    payouts,\n',
'    cash: r.cash - product.cost,\n    payouts,\n    decisionModifiers: consumeDecisionModifiers(r.decisionModifiers ?? [], (m) => m.kind === "merch" && m.expiresWeek >= r.week && m.uses > 0),\n',
"consume merch mod")
write(p, s)

# --------------------------------------- audience combo exact-learning patch
p = "src/engine/state.ts"
s = read(p)
s = once(s,
'import { rollStudioEvent, type StudioEvent } from "./events";\n',
'import { rollStudioEvent, type StudioEvent } from "./events";\nimport { genreTargetFor } from "./genreTargets";\n',
"state genre target import")
s = once(s,
'  /** how many distinct findings have been extracted from each release */\n  audienceTestCounts: Record<string, number>;\n',
'  /** how many distinct findings have been extracted from each release */\n  audienceTestCounts: Record<string, number>;\n  /** distinct released series that completed at least one audience panel, keyed by exact genre combo */\n  audienceComboSeries: Record<string, string[]>;\n',
"audience combo field")
s = once(s,
'    audienceTestCounts: {},\n    audienceInsights: [],\n',
'    audienceTestCounts: {},\n    audienceComboSeries: {},\n    audienceInsights: [],\n',
"audience combo initial")
s = once(s,
'    audienceTestCounts: r.audienceTestCounts && typeof r.audienceTestCounts === "object" ? r.audienceTestCounts : {},\n    audienceInsights: Array.isArray(r.audienceInsights) ? r.audienceInsights : [],\n',
'    audienceTestCounts: r.audienceTestCounts && typeof r.audienceTestCounts === "object" ? r.audienceTestCounts : {},\n    audienceComboSeries: r.audienceComboSeries && typeof r.audienceComboSeries === "object" ? r.audienceComboSeries : {},\n    audienceInsights: Array.isArray(r.audienceInsights) ? r.audienceInsights : [],\n',
"audience combo migration")
old_memo = '''const blendedGenreMemo = (draft: Draft) => {\n  const defs = draft.genres.map((id) => GENRES.find((g) => g.id === id)).filter(Boolean) as typeof GENRES;\n  const n = Math.max(1, defs.length);\n  const ideal: [number, number, number] = [0, 1, 2].map((i) => Math.round(defs.reduce((a, g) => a + g.ideal[i], 0) / n)) as [number, number, number];\n  const ratio: [number, number, number] = [0, 1, 2].map((i) => defs.reduce((a, g) => a + g.ratio[i], 0) / n) as [number, number, number];\n  return { ideal, ratio };\n};\n'''
s = once(s, old_memo, 'const blendedGenreMemo = (draft: Draft) => genreTargetFor(draft.genres);\n', "audience exact hardmode memo")
s = once(s,
'    const counts = { ...(nx.audienceTestCounts ?? {}), [r.audienceTest.showKey]: r.audienceTest.round + 1 };\n    const insight: AudienceInsight = { showKey: r.audienceTest.showKey, title: r.audienceTest.title, text: found.text, day: nx.day ?? nx.week * 7 };\n',
'    const counts = { ...(nx.audienceTestCounts ?? {}), [r.audienceTest.showKey]: r.audienceTest.round + 1 };\n    const testedComboKey = comboKey(r.audienceTest.draft.genres);\n    const testedSeries = new Set(nx.audienceComboSeries?.[testedComboKey] ?? []);\n    testedSeries.add(r.audienceTest.showKey);\n    const audienceComboSeries = { ...(nx.audienceComboSeries ?? {}), [testedComboKey]: [...testedSeries] };\n    const insight: AudienceInsight = { showKey: r.audienceTest.showKey, title: r.audienceTest.title, text: found.text, day: nx.day ?? nx.week * 7 };\n',
"audience distinct-series tracking")
s = once(s,
'      audienceTestCounts: counts,\n      audienceInsights: [...(nx.audienceInsights ?? []), insight].slice(-30),\n',
'      audienceTestCounts: counts,\n      audienceComboSeries,\n      audienceInsights: [...(nx.audienceInsights ?? []), insight].slice(-30),\n',
"audience combo persistence")
write(p, s)

p = "src/components/Produce.tsx"
s = read(p)
s = once(s,
'  formatGBP,\n  staffPoint,\n',
'  formatGBP,\n  comboKey,\n  staffPoint,\n',
"produce combo import")
s = once(s,
'import { rushBoostPoint, rushOutcomeRange, rushResearchCost, rushTeamSupport, studioKnowledgeEmphasis } from "../engine/studioOps";\n',
'import { rushBoostPoint, rushOutcomeRange, rushResearchCost, rushTeamSupport, studioKnowledgeEmphasis } from "../engine/studioOps";\nimport { genreTargetFor } from "../engine/genreTargets";\n',
"produce target import")
old_knowledge = '''              const genres = project.draft.genres;\n              const defs = genres.map((id) => GENRES.find((g) => g.id === id)).filter((g) => !!g);\n              const known = defs.map((g) => run.genreKnowledge?.[g!.id] ?? 0);\n              const k = known.length ? Math.min(...known) : 0;\n              const ideal = defs.length\n                ? Math.round(defs.reduce((a, g) => a + g!.ideal[phase!.idx], 0) / defs.length)\n                : 50;\n              /* the same blended ideal drives the early hint, the working\n                 read and the exact estimate — no second knowledge calculation */\n              const emphasis = studioKnowledgeEmphasis(ideal, phase!.a, phase!.b);\n'''
new_knowledge = '''              const genres = project.draft.genres;\n              const defs = genres.map((id) => GENRES.find((g) => g.id === id)).filter((g) => !!g);\n              const known = defs.map((g) => run.genreKnowledge?.[g!.id] ?? 0);\n              const k = known.length ? Math.min(...known) : 0;\n              const exactTarget = genreTargetFor(genres).ideal[phase!.idx];\n              const testedSeries = run.audienceComboSeries?.[comboKey(genres)]?.length ?? 0;\n              const exactComboLearned = genres.length === 2 && testedSeries >= 3;\n              const exactSingles = defs.map((g) => ({ id: g!.id, label: g!.label, target: genreTargetFor([g!.id]).ideal[phase!.idx] }));\n              const emphasis = studioKnowledgeEmphasis(exactTarget, phase!.a, phase!.b);\n'''
s = once(s, old_knowledge, new_knowledge, "produce exact knowledge maths")
old_render = '''                  {k <= 0 ? (\n                    <div className="mt-0.5 text-[10px] text-paper/55">No data on {defs.map((g) => g!.label).join("/") || "this genre"} yet — ship it or run a test audience to learn what works.</div>\n                  ) : k <= 2 ? (\n                    <div className="mt-0.5 text-[10px] text-paper/55">Early read: {emphasis} appears more important for {phase!.name.toLowerCase()}.</div>\n                  ) : k <= 5 ? (\n                    <div className="mt-0.5 text-[10px] text-paper/55">Working read: the blend leans toward <b className="text-paper/85">{emphasis}</b> — more releases narrow the slider target.</div>\n                  ) : (\n                    <div className="mt-0.5 text-[10px] font-bold text-mint">\n                      Studio estimate: <span className="text-neon2">{phase!.a}</span> around {Math.round(ideal / 5) * 5}% · {phase!.b} around {100 - Math.round(ideal / 5) * 5}%\n                    </div>\n                  )}\n'''
new_render = '''                  {exactComboLearned ? (\n                    <div className="mt-1 space-y-1 text-[10px] font-bold text-mint">\n                      <div>EXACT COMBO TARGET · <span className="text-neon2">{phase!.a} {exactTarget}%</span> · {phase!.b} {100 - exactTarget}%</div>\n                      {exactSingles.map((g) => (\n                        <div key={g.id} className="text-paper/75">{g.label}: {phase!.a} {g.target}% · {phase!.b} {100 - g.target}%</div>\n                      ))}\n                      <div className="text-[9px] text-cyanx">Verified from {testedSeries} separate test-audience series using this exact combo.</div>\n                    </div>\n                  ) : k <= 0 ? (\n                    <div className="mt-0.5 text-[10px] text-paper/55">No data on {defs.map((g) => g!.label).join("/") || "this genre"} yet — ship it or run a test audience to learn what works.</div>\n                  ) : k <= 2 ? (\n                    <div className="mt-0.5 text-[10px] text-paper/55">Early read: {emphasis} appears more important for {phase!.name.toLowerCase()}.</div>\n                  ) : k <= 5 ? (\n                    <div className="mt-0.5 text-[10px] text-paper/55">Working read: the combo leans toward <b className="text-paper/85">{emphasis}</b> — test audiences on three separate series reveal the exact values.</div>\n                  ) : (\n                    <div className="mt-0.5 text-[10px] font-bold text-mint">\n                      Studio estimate: <span className="text-neon2">{phase!.a}</span> around {Math.round(exactTarget / 5) * 5}% · {phase!.b} around {100 - Math.round(exactTarget / 5) * 5}%\n                    </div>\n                  )}\n'''
s = once(s, old_render, new_render, "produce exact knowledge render")
write(p, s)

# --------------------------------------------------------------- App.tsx
p = "src/App.tsx"
s = read(p)
s = once(s,
'import AwardsCeremony from "./components/AwardsCeremony";\n',
'import AwardsCeremony from "./components/AwardsCeremony";\nimport DecisionEventOverlay from "./components/DecisionEventOverlay";\nimport { resolveStudioEvent } from "./engine/events";\n',
"app decision import")
s = once(s,
'        {paused && pauseMenu}\n        {paused && savePicker && savePickerOverlay}\n',
'        {run && run.studioEvents.length > 0 && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && (\n          <DecisionEventOverlay\n            event={run.studioEvents[0]}\n            onChoose={(choiceId) => {\n              setTimeSpeed(0);\n              setRun((current) => current ? (resolveStudioEvent(current, current.studioEvents[0].id, choiceId) ?? current) : current);\n            }}\n          />\n        )}\n\n        {paused && pauseMenu}\n        {paused && savePicker && savePickerOverlay}\n',
"app overlay")
write(p, s)

# ----------------------------------------------------------- Projects.tsx
p = "src/components/Projects.tsx"
s = read(p)
s = once(s,
'  Zap,\n} from "lucide-react";\n',
'  Zap,\n  Trash2,\n} from "lucide-react";\n',
"projects trash icon")
s = first(s,
'  onResume,\n  onContinueSeason,\n}: {\n',
'  onResume,\n  onScrap,\n  onContinueSeason,\n}: {\n',
"card scrap prop")
s = once(s,
'  onResume: (projectId: string) => void;\n  /** jump straight into creating this IP\'s next season while it\'s still on air */\n',
'  onResume: (projectId: string) => void;\n  onScrap: (projectId: string) => void;\n  /** jump straight into creating this IP\'s next season while it\'s still on air */\n',
"card scrap type")
s = once(s,
'      {/* actions */}\n      {!auto && p.milestone && !p.rush && (\n',
'      {/* actions */}\n      {inPipeline && p.lastMinuteBoost && (\n        <div className="mt-2 rounded-lg border border-mint/40 bg-mint/10 px-2.5 py-2 text-[10px] font-bold text-mint">\n          ✨ LAST-MINUTE BREAKTHROUGH · +{p.lastMinuteBoost.points} {p.lastMinuteBoost.type.toUpperCase()} before marketing\n        </div>\n      )}\n      {inPipeline && (\n        <Btn\n          variant="ghost"\n          className="mt-2 w-full border-neon/40 !py-1.5 text-[10px] text-neon"\n          onClick={() => {\n            const clawback = p.commission ? ` Commission advance £${p.commission.advance.toLocaleString("en-GB")} will also be clawed back.` : "";\n            if (window.confirm(`SCRAP “${p.draft.title}”? £${Math.round(p.spent).toLocaleString("en-GB")} already spent will be lost.${clawback} This cannot be undone.`)) onScrap(p.id);\n          }}\n        >\n          <Trash2 size={13} /> SCRAP PROJECT · WRITE OFF {formatGBPShort(p.spent)}\n        </Btn>\n      )}\n      {!auto && p.milestone && !p.rush && (\n',
"scrap button")
s = once(s,
'  onResume,\n  onContinueSeason,\n}: {\n  run: RunState;\n',
'  onResume,\n  onScrap,\n  onContinueSeason,\n}: {\n  run: RunState;\n',
"panel scrap prop")
s = once(s,
'  onResume: (projectId: string) => void;\n  /** greenlight the next season of an IP straight from its airing card */\n',
'  onResume: (projectId: string) => void;\n  onScrap: (projectId: string) => void;\n  /** greenlight the next season of an IP straight from its airing card */\n',
"panel scrap type")
s = once(s,
'          onResume={onResume}\n          onContinueSeason={onContinueSeason}\n',
'          onResume={onResume}\n          onScrap={onScrap}\n          onContinueSeason={onContinueSeason}\n',
"pass scrap card")
write(p, s)

# ------------------------------------------------------------- Office.tsx
p = "src/components/Office.tsx"
s = read(p)
s = once(s,
'import { type Commission } from "../engine/market";\n',
'import { type Commission } from "../engine/market";\nimport { scrapProject } from "../engine/projectActions";\n',
"office scrap import")
s = once(s,
'            onResume={(projectId) => {\n              sfx.click();\n              setRun((r) => resumeAuto(r, projectId));\n            }}\n',
'            onResume={(projectId) => {\n              sfx.click();\n              setRun((r) => resumeAuto(r, projectId));\n            }}\n            onScrap={(projectId) => {\n              sfx.back();\n              setRun((r) => scrapProject(r, projectId) ?? r);\n            }}\n',
"office scrap callback")
write(p, s)

# ------------------------------------------------------------- Create.tsx
p = "src/components/Create.tsx"
s = read(p)
s = once(s,
'  const expectation = planFr && plan ? expectedScore(planFr, plan.kind) : null;\n\n  const set = (patch: Partial<Draft>) => setD((old) => ({ ...old, ...patch }));\n',
'  const expectation = planFr && plan ? expectedScore(planFr, plan.kind) : null;\n  const marketBrief = (run.decisionModifiers ?? []).find((m) => m.kind === "marketBrief" && m.expiresWeek >= run.week && m.uses > 0);\n\n  const set = (patch: Partial<Draft>) => setD((old) => ({ ...old, ...patch }));\n',
"create market brief state")
s = once(s,
'      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-4 p-3 md:p-4">\n',
'      {marketBrief && (\n        <div className="relative z-10 border-b border-gold/30 bg-gold/10 px-3 py-2 text-[10px] text-paper/80">\n          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">\n            <b className="tracking-wider text-gold">MARKET BRIEF</b>\n            <span>{marketBrief.label}</span>\n            <span className="text-cyanx">Match it by week {marketBrief.expiresWeek} for ×{(marketBrief.mult ?? 1).toFixed(2)} release sales.</span>\n            <Btn\n              variant="gold"\n              className="ml-auto !px-2 !py-1 text-[9px]"\n              onClick={() => {\n                const medium = marketBrief.medium ?? d.medium;\n                set({\n                  genres: marketBrief.genres?.slice(0, 2) ?? d.genres,\n                  audience: marketBrief.audience ?? d.audience,\n                  medium,\n                  slot: slotForMedium(medium, d.slot),\n                });\n                setStep(2);\n              }}\n            >USE BRIEF</Btn>\n          </div>\n        </div>\n      )}\n\n      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-4 p-3 md:p-4">\n',
"create brief banner")
write(p, s)

# --------------------------------------------- add next-product quality event
p = "src/engine/decisionEvents.ts"
s = read(p)
needle = '    () => make(week, "investor", "AN INVESTOR OFFERS A LIFELINE", "FINANCE",\n'
insert = '''    () => make(week, "creative_consultant", "A CREATIVE CONSULTANT HAS AN OPENING", "NEXT PRODUCTION",\n      `A famously difficult development consultant can spend one week shaping your NEXT greenlight. They are expensive, but their notes are unusually specific.`, [\n        { id: "story", label: "BOOK STORY DEVELOPMENT", effect: "−£45,000 · next production starts +8 Story", effects: [\n          { type: "cash", amount: -45_000 }, { type: "modifier", modifier: { kind: "releaseQuality", label: "Consultant story development", expiresWeek: week + 14, uses: 1, flat: 8, pointType: "story" } },\n        ] },\n        { id: "visual", label: "BOOK VISUAL DEVELOPMENT", effect: "−£45,000 · next production starts +8 Art", effects: [\n          { type: "cash", amount: -45_000 }, { type: "modifier", modifier: { kind: "releaseQuality", label: "Consultant visual development", expiresWeek: week + 14, uses: 1, flat: 8, pointType: "art" } },\n        ] },\n        { id: "pass", label: "PASS", effect: "no cost", effects: [] },\n      ]),\n\n'''
if needle not in s:
    raise SystemExit("decision quality event insertion point missing")
s = s.replace(needle, insert + needle, 1)
write(p, s)

# ----------------------------------------------------------- focused tests
p = ROOT / "src/engine/__tests__/decision-hardmode.test.ts"
p.write_text('''import { describe, expect, it, vi } from "vitest";\nimport { genreTargetFor } from "../genreTargets";\nimport { initialRun, startResearchProject } from "../state";\nimport { makeProject, applyMilestoneOutcome } from "../projects";\nimport { scrapProject } from "../projectActions";\nimport type { Draft } from "../data";\n\nconst draft: Draft = {\n  title: "Hard Mode", medium: "fanweb", budget: "indie", slot: "web", animeType: "shonen",\n  genres: ["slice", "fantasy"], audience: "teens", protag: "kai", protagName: "Kai",\n  secondary: "s_aoi", pet: "p_mochi", villain: "v_akuma", arcs: [], sliders: [50,50,50], season: 1,\n};\n\ndescribe("hard-mode production targets", () => {\n  it("gives different genre pairs distinct exact targets", () => {\n    expect(genreTargetFor(["slice", "fantasy"]).ideal).not.toEqual(genreTargetFor(["slice", "horror"]).ideal);\n    expect(genreTargetFor(["slice"]).ideal).not.toEqual(genreTargetFor(["fantasy"]).ideal);\n  });\n});\n\ndescribe("project control", () => {\n  it("scraps an unfinished project and writes off the slot", () => {\n    const run = initialRun("Test", "steady");\n    const p = makeProject(draft, 0);\n    const out = scrapProject({ ...run, projects: [p] }, p.id)!;\n    expect(out.projects).toHaveLength(0);\n    expect(out.notices.at(-1)).toContain("SCRAPPED");\n  });\n\n  it("can award a last-minute craft bubble after edit", () => {\n    const p = { ...makeProject(draft, 0), stage: "post" as const, milestone: "edit" as const };\n    vi.spyOn(Math, "random").mockReturnValue(0.1);\n    const out = applyMilestoneOutcome(p, { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0, squashed: 0 });\n    expect(out.lastMinuteBoost).toBeTruthy();\n    vi.restoreAllMocks();\n  });\n});\n\ndescribe("decision modifiers", () => {\n  it("can accelerate the next R&D job", () => {\n    const base = { ...initialRun("Test", "steady"), rd: 100 };\n    const boosted = { ...base, decisionModifiers: [{ id: "x", kind: "researchSpeed" as const, label: "boost", createdWeek: 0, expiresWeek: 20, uses: 1, mult: 0.5 }] };\n    const a = startResearchProject(base, "storyboard", 20)!;\n    const b = startResearchProject(boosted, "storyboard", 20)!;\n    expect((b.researchJobs[0].completesDay ?? 999)).toBeLessThan(a.researchJobs[0].completesDay ?? 0);\n    expect(b.decisionModifiers).toHaveLength(0);\n  });\n});\n''')

print("decision hardmode integration applied")
