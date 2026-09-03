from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one anchor in {path}, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, repl: str) -> None:
    text = read(path)
    out, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"Expected one regex anchor in {path}: {pattern[:120]!r}")
    write(path, out)


# ---------------------------------------------------------------------------
# data.ts — richer arcs, ordered structures, discovery helpers, creative R&D
# ---------------------------------------------------------------------------
data = "game_source/src/engine/data.ts"
replace_once(
    data,
    '''  /** synergy bonus if the matching cast slot's affinities fit the genres */\n  cast?: CastRole;\n  castQ?: number;\n  /** what must be true before this arc can be picked */''',
    '''  /** synergy bonus if the matching cast slot's affinities fit the genres */\n  cast?: CastRole;\n  castQ?: number;\n  /** genres where this beat tends to fight the tone — hidden until learned */\n  anti?: GenreId[];\n  antiQ?: number;\n  antiF?: number;\n  /** what must be true before this arc can be picked */'''
)

replace_once(
    data,
    '''  minOffice: number;\n  minStaff: number;\n}\n\nexport const PRODUCTION_SCOPES: Record<ScopeId, ProductionScope> = {\n  short: { label: "Short Run", shortLabel: "SHORT", desc: "Lean, focused and forgiving — ideal for a small crew.", weeksMult: 0.78, costMult: 0.78, workMult: 0.72, audienceMult: 0.78, minOffice: 0, minStaff: 0 },\n  standard: { label: "Standard Production", shortLabel: "STANDARD", desc: "The normal seasonal production target.", weeksMult: 1, costMult: 1, workMult: 1, audienceMult: 1, minOffice: 0, minStaff: 0 },\n  extended: { label: "Extended Production", shortLabel: "EXTENDED", desc: "More episodes, more cuts and a much heavier pipeline.", weeksMult: 1.42, costMult: 1.5, workMult: 1.45, audienceMult: 1.18, minOffice: 1, minStaff: 3 },\n  prestige: { label: "Prestige Production", shortLabel: "PRESTIGE", desc: "An event-scale slate anchor. Huge ceiling, brutal departmental demand.", weeksMult: 1.82, costMult: 2.15, workMult: 1.9, audienceMult: 1.38, minOffice: 2, minStaff: 5 },\n};''',
    '''  minOffice: number;\n  minStaff: number;\n  /** how many major story beats this format can carry without feeling crammed */\n  arcLimit: number;\n}\n\nexport const PRODUCTION_SCOPES: Record<ScopeId, ProductionScope> = {\n  short: { label: "Short Run", shortLabel: "SHORT", desc: "Lean, focused and forgiving — ideal for a small crew.", weeksMult: 0.78, costMult: 0.78, workMult: 0.72, audienceMult: 0.78, minOffice: 0, minStaff: 0, arcLimit: 3 },\n  standard: { label: "Standard Production", shortLabel: "STANDARD", desc: "The normal seasonal production target.", weeksMult: 1, costMult: 1, workMult: 1, audienceMult: 1, minOffice: 0, minStaff: 0, arcLimit: 4 },\n  extended: { label: "Extended Production", shortLabel: "EXTENDED", desc: "More episodes, more cuts and a much heavier pipeline.", weeksMult: 1.42, costMult: 1.5, workMult: 1.45, audienceMult: 1.18, minOffice: 1, minStaff: 3, arcLimit: 5 },\n  prestige: { label: "Prestige Production", shortLabel: "PRESTIGE", desc: "An event-scale slate anchor. Huge ceiling, brutal departmental demand.", weeksMult: 1.82, costMult: 2.15, workMult: 1.9, audienceMult: 1.38, minOffice: 2, minStaff: 5, arcLimit: 6 },\n};'''
)

replace_once(
    data,
    '''  { id: "autoclean", name: "Auto-Cleanup", rd: 52, desc: "Automatically clears 35% of outstanding edit notes before final QA." },\n  { id: "merch2", name: "Global Merch", rd: 60, desc: "Merch revenue bonus rises to +30%." },\n];''',
    '''  { id: "autoclean", name: "Auto-Cleanup", rd: 52, desc: "Automatically clears 35% of outstanding edit notes before final QA." },\n  { id: "merch2", name: "Global Merch", rd: 60, desc: "Merch revenue bonus rises to +30%." },\n  { id: "genre_studies", name: "Genre Studies", rd: 32, desc: "Researches a starter set of arc-to-genre fits so the Story Arc screen can label them before you risk a production." },\n  { id: "narrative_analytics", name: "Narrative Analytics", rd: 38, desc: "Researches several classic story structures, permanently revealing their combo ratings in the Story Arc planner." },\n];'''
)

new_arcs = '''  /* --------------------------------------- discovery-era narrative beats */\n  { id: "narr_slowburn", name: "Slow-Burn Introduction", cost: 9_000, q: 4, f: 0.01, syn: ["slice", "romance", "noir"], synQ: 3, anti: ["racing", "shonen"], antiQ: -2, desc: "Let the cast breathe before the plot starts squeezing." },\n  { id: "narr_flashforward", name: "Flash-Forward Teaser", cost: 13_000, q: 3, f: 0.04, syn: ["mystery", "cyber", "noir"], synQ: 3, anti: ["slice"], antiQ: -1, desc: "Show the destination first and dare viewers to work out the road.", unlock: { kind: "shows", n: 2 } },\n  { id: "narr_mediasres", name: "In Medias Res", cost: 15_000, q: 4, f: 0.03, syn: ["shonen", "military", "racing"], synQ: 3, anti: ["slice", "cooking"], antiQ: -2, desc: "Open halfway through the disaster and explain later.", unlock: { kind: "score", n: 22 } },\n  { id: "narr_rivalintro", name: "Rival Introduction", cost: 12_000, q: 3, f: 0.05, syn: ["shonen", "sports", "racing"], synQ: 4, cast: "secondary", castQ: 2, desc: "A perfect foil arrives and immediately steals the frame." },\n  { id: "narr_mentor", name: "Mentor Arc", cost: 14_000, q: 4, f: 0.03, syn: ["shonen", "fantasy", "military"], synQ: 3, cast: "secondary", castQ: 2, desc: "Wisdom, bad habits, and one lesson that matters later." },\n  { id: "narr_foundfamily", name: "Found Family", cost: 13_000, q: 4, f: 0.05, syn: ["slice", "fantasy", "shojo"], synQ: 3, anti: ["noir"], antiQ: -1, desc: "The team slowly becomes the home they were missing.", unlock: { kind: "genre", genre: "slice" } },\n  { id: "narr_journey", name: "Journey Arc", cost: 16_000, q: 3, f: 0.05, syn: ["fantasy", "isekai", "space"], synQ: 4, desc: "New places, new problems, increasingly questionable maps." },\n  { id: "narr_politics", name: "Political Intrigue", cost: 19_000, q: 5, f: 0.01, syn: ["military", "noir", "fantasy"], synQ: 4, anti: ["idol", "cooking"], antiQ: -2, desc: "Factions smile politely while sharpening knives.", unlock: { kind: "rd", cost: 16 } },\n  { id: "narr_explore", name: "Exploration Expedition", cost: 15_000, q: 3, f: 0.04, syn: ["space", "fantasy", "isekai"], synQ: 3, desc: "Put something impossible beyond the next horizon." },\n  { id: "narr_siege", name: "Siege Arc", cost: 31_000, q: 6, f: 0.06, syn: ["military", "fantasy", "mecha"], synQ: 4, anti: ["slice", "romance"], antiQ: -3, desc: "One location, no escape, every department working overtime.", unlock: { kind: "hits", n: 2 } },\n  { id: "narr_survival", name: "Survival Game", cost: 22_000, q: 3, f: 0.08, syn: ["horror", "mystery", "shonen"], synQ: 4, anti: ["shojo", "cooking"], antiQ: -2, desc: "Rules are announced. Half the cast immediately breaks them.", unlock: { kind: "genre", genre: "horror" } },\n  { id: "narr_rescue", name: "Rescue Mission", cost: 18_000, q: 3, f: 0.06, syn: ["shonen", "military", "space"], synQ: 3, desc: "Someone is missing; everyone else gets one shot." },\n  { id: "narr_revenge", name: "Revenge Arc", cost: 19_000, q: 4, f: 0.04, syn: ["noir", "shonen", "horror"], synQ: 3, anti: ["idol", "cooking"], antiQ: -2, desc: "A clean objective gradually becomes a terrible idea.", unlock: { kind: "shows", n: 3 } },\n  { id: "narr_betrayal", name: "Betrayal", cost: 17_000, q: 5, f: 0.02, syn: ["mystery", "military", "noir"], synQ: 3, desc: "The trusted ally was taking notes for somebody else.", unlock: { kind: "hits", n: 1 } },\n  { id: "narr_secretid", name: "Secret Identity", cost: 14_000, q: 4, f: 0.04, syn: ["mystery", "magical", "supernatural"], synQ: 4, desc: "Two lives, one increasingly impossible calendar.", unlock: { kind: "genre", genre: "mystery" } },\n  { id: "narr_falsewin", name: "False Victory", cost: 20_000, q: 5, f: 0.03, syn: ["shonen", "horror", "military"], synQ: 3, desc: "They won. Which is exactly why something feels wrong.", unlock: { kind: "score", n: 26 } },\n  { id: "narr_villainreveal", name: "Villain Reveal", cost: 18_000, q: 5, f: 0.05, syn: ["mystery", "horror", "noir"], synQ: 4, cast: "villain", castQ: 3, desc: "The camera finally turns toward the person behind it all." },\n  { id: "narr_quiet", name: "Quiet Character Episode", cost: 8_000, q: 4, f: 0.02, syn: ["slice", "romance", "shojo"], synQ: 4, anti: ["racing", "military"], antiQ: -2, desc: "No explosions. One conversation. Somehow the episode everyone quotes." },\n  { id: "narr_pov", name: "POV Switch", cost: 16_000, q: 5, f: 0.01, syn: ["mystery", "noir", "horror"], synQ: 3, anti: ["kids" as GenreId], antiQ: -1, desc: "Retell the conflict through the eyes of somebody the audience mistrusted.", unlock: { kind: "rd", cost: 22 } },\n  { id: "narr_sacrifice", name: "Heroic Sacrifice", cost: 24_000, q: 6, f: 0.03, syn: ["shonen", "fantasy", "military"], synQ: 4, anti: ["comedy", "cooking"], antiQ: -3, desc: "One character pays the bill for everybody else's tomorrow.", unlock: { kind: "score", n: 30 } },\n'''
# Remove the deliberately invalid pseudo-genre before writing; POV is simply neutral outside its synergies.
new_arcs = new_arcs.replace(' anti: ["kids" as GenreId], antiQ: -1,', '')
replace_once(
    data,
    '''  { id: "idolfest", name: "Idol Festival", cost: 22_000, q: 2, f: 0.1, syn: ["idol"], synQ: 4, desc: "Three nights. One stage. Zero dry eyes.", unlock: { kind: "genre", genre: "idol" } },\n];''',
    '''  { id: "idolfest", name: "Idol Festival", cost: 22_000, q: 2, f: 0.1, syn: ["idol"], synQ: 4, desc: "Three nights. One stage. Zero dry eyes.", unlock: { kind: "genre", genre: "idol" } },\n''' + new_arcs + '''];'''
)

replace_once(
    data,
    '''export interface ArcCombo {\n  id: string;\n  name: string;\n  /** every arc in this list must be in the season for the synergy to fire */\n  arcs: string[];\n  q: number;\n  f: number;\n}''',
    '''export interface ArcCombo {\n  id: string;\n  name: string;\n  /** required beats. `ordered` combos only fire when they appear in this sequence. */\n  arcs: string[];\n  q: number;\n  f: number;\n  ordered?: boolean;\n}'''
)

new_combos = '''  /* ordered structures: sequencing now matters, not just the shopping list */\n  { id: "earned_victory", name: "Earned Victory", arcs: ["montage", "tournament", "finale"], q: 4, f: 0.03, ordered: true },\n  { id: "rival_payoff", name: "Rivalry Payoff", arcs: ["narr_rivalintro", "tournament", "finale"], q: 4, f: 0.04, ordered: true },\n  { id: "mentor_legacy", name: "Mentor's Legacy", arcs: ["narr_mentor", "narr_sacrifice", "finale"], q: 5, f: 0.02, ordered: true },\n  { id: "mystery_reveal", name: "The Long Reveal", arcs: ["hook", "case", "narr_villainreveal", "twist"], q: 5, f: 0.02, ordered: true },\n  { id: "false_betrayal", name: "Victory Was a Lie", arcs: ["narr_falsewin", "narr_betrayal", "finale"], q: 4, f: 0.03, ordered: true },\n  { id: "journey_family", name: "Road Becomes Home", arcs: ["narr_journey", "narr_foundfamily", "finale"], q: 3, f: 0.04, ordered: true },\n  { id: "political_siege", name: "War by Other Means", arcs: ["narr_politics", "narr_siege", "war"], q: 5, f: 0.01, ordered: true },\n  { id: "identity_confession", name: "Mask Comes Off", arcs: ["narr_secretid", "confession"], q: 3, f: 0.03, ordered: true },\n  { id: "survival_rescue", name: "No One Left Behind", arcs: ["narr_survival", "narr_rescue", "finale"], q: 4, f: 0.03, ordered: true },\n  { id: "revenge_redemption", name: "Break the Cycle", arcs: ["narr_revenge", "redemption", "finale"], q: 4, f: 0.02, ordered: true },\n  { id: "slowburn_payoff", name: "Slow Fuse", arcs: ["narr_slowburn", "twist", "finale"], q: 4, f: 0.02, ordered: true },\n  { id: "pov_mystery", name: "Other Side of the Case", arcs: ["narr_pov", "case", "twist"], q: 4, f: 0.01, ordered: true },\n  { id: "flashforward_loop", name: "Promise Kept", arcs: ["narr_flashforward", "origin", "finale"], q: 3, f: 0.02, ordered: true },\n  /* deliberately bad structures teach the player that order can hurt too */\n  { id: "backwards_training", name: "Training After the Test", arcs: ["tournament", "montage"], q: -3, f: -0.01, ordered: true },\n  { id: "spoiled_mystery", name: "Mystery Spoiled Early", arcs: ["narr_villainreveal", "case"], q: -3, f: -0.01, ordered: true },\n'''
replace_once(
    data,
    '''  { id: "magicgirl", name: "Magical Rising", arcs: ["transformation", "live", "confession"], q: 2, f: 0.01 },\n];\n\n/** synergies whose arcs are all present in the season */\nexport const arcCombosFor = (arcIds: string[]): ArcCombo[] =>\n  ARC_COMBOS.filter((c) => c.arcs.every((a) => arcIds.includes(a)));\n\n/* ------------------------------------------------------------------ staff */''',
    '''  { id: "magicgirl", name: "Magical Rising", arcs: ["transformation", "live", "confession"], q: 2, f: 0.01 },\n''' + new_combos + '''];\n\nconst containsInOrder = (haystack: string[], needles: string[]) => {\n  let at = -1;\n  return needles.every((id) => {\n    at = haystack.indexOf(id, at + 1);\n    return at >= 0;\n  });\n};\n\n/** hidden story structures. Some only work when the beats are in the right order. */\nexport const arcCombosFor = (arcIds: string[]): ArcCombo[] =>\n  ARC_COMBOS.filter((c) => c.ordered ? containsInOrder(arcIds, c.arcs) : c.arcs.every((a) => arcIds.includes(a)));\n\nexport const arcGenreKey = (arcId: string, genre: GenreId) => `${arcId}|${genre}`;\n\nexport const arcGenreFit = (arc: Arc, genre: GenreId) => {\n  if (arc.anti?.includes(genre)) return { label: "RISKY FIT", cls: "text-neon", score: arc.antiQ ?? -2 };\n  if (arc.syn?.includes(genre)) {\n    const score = arc.synQ ?? 0;\n    if (score >= 4 || (arc.synF ?? 0) >= 0.03) return { label: "GREAT FIT", cls: "text-gold", score };\n    return { label: "GOOD FIT", cls: "text-mint", score };\n  }\n  return { label: "NEUTRAL", cls: "text-paper/50", score: 0 };\n};\n\nexport const arcComboRating = (combo: ArcCombo) => {\n  if (combo.q < 0 || combo.f < 0) return { label: "RISKY STRUCTURE", cls: "text-neon" };\n  if (combo.q >= 4 || combo.f >= 0.035) return { label: "GREAT COMBO!", cls: "text-gold" };\n  if (combo.q >= 2 || combo.f >= 0.015) return { label: "GOOD SYNERGY", cls: "text-mint" };\n  return { label: "WORKABLE", cls: "text-cyanx" };\n};\n\n/** Creative research can reveal a starter library without forcing blind releases. */\nexport const ARC_RESEARCH_COMBOS = ["rivalry", "suspense", "deep", "earned_victory", "heart"] as const;\nexport const ARC_RESEARCH_GENRE_KEYS = [\n  arcGenreKey("hook", "shonen"),\n  arcGenreKey("lore", "fantasy"),\n  arcGenreKey("montage", "shonen"),\n  arcGenreKey("tournament", "sports"),\n  arcGenreKey("festival", "shojo"),\n  arcGenreKey("case", "mystery"),\n  arcGenreKey("narr_slowburn", "slice"),\n  arcGenreKey("narr_rivalintro", "sports"),\n  arcGenreKey("narr_politics", "noir"),\n  arcGenreKey("narr_quiet", "slice"),\n] as const;\n\n/* ------------------------------------------------------------------ staff */'''
)

# ---------------------------------------------------------------------------
# scoring.ts — genre mismatches can hurt, but stay hidden until learned
# ---------------------------------------------------------------------------
scoring = "game_source/src/engine/scoring.ts"
replace_once(
    scoring,
    '''    if (arc.syn?.some((s) => draft.genres.includes(s))) {\n      arcQ += arc.synQ ?? 0;\n      arcsF += arc.synF ?? 0;\n      if (showrunner === "vision" && (arc.id === "twist" || arc.id === "lore")) arcQ += 2;\n    }\n    /* arcs that shine with the right cast member */''',
    '''    if (arc.syn?.some((s) => draft.genres.includes(s))) {\n      arcQ += arc.synQ ?? 0;\n      arcsF += arc.synF ?? 0;\n      if (showrunner === "vision" && (arc.id === "twist" || arc.id === "lore")) arcQ += 2;\n    }\n    if (arc.anti?.some((s) => draft.genres.includes(s))) {\n      arcQ += arc.antiQ ?? -2;\n      arcsF += arc.antiF ?? -0.01;\n    }\n    /* arcs that shine with the right cast member */'''
)

# ---------------------------------------------------------------------------
# state.ts — persist arc×genre learning and allow creative R&D to reveal data
# ---------------------------------------------------------------------------
state = "game_source/src/engine/state.ts"
replace_once(
    state,
    '''  GENRES,\n  OFFICES,''',
    '''  GENRES,\n  ARC_COMBOS,\n  ARC_RESEARCH_COMBOS,\n  ARC_RESEARCH_GENRE_KEYS,\n  OFFICES,'''
)
replace_once(
    state,
    '''  /** how many times each arc id has been shipped (stats stay hidden until then) */\n  arcKnowledge: Record<string, number>;\n  /** best raw quality ever shipped — reviews compare against this */''',
    '''  /** how many times each arc id has been shipped (stats stay hidden until then) */\n  arcKnowledge: Record<string, number>;\n  /** arc×genre relationships learned by shipping that exact pairing or by research */\n  arcGenreKnowledge: Record<string, number>;\n  /** best raw quality ever shipped — reviews compare against this */'''
)
replace_once(
    state,
    '''    arcUnlocked: [],\n    arcKnowledge: {},\n    studioTop: 0,''',
    '''    arcUnlocked: [],\n    arcKnowledge: {},\n    arcGenreKnowledge: {},\n    studioTop: 0,'''
)
replace_once(
    state,
    '''    researchJobs: Array.isArray(r.researchJobs) ? r.researchJobs : [],\n    revBoostUntil: typeof r.revBoostUntil === "number" ? r.revBoostUntil : 0,''',
    '''    researchJobs: Array.isArray(r.researchJobs) ? r.researchJobs : [],\n    arcCombos: Array.isArray(r.arcCombos) ? r.arcCombos : [],\n    arcUnlocked: Array.isArray(r.arcUnlocked) ? r.arcUnlocked : [],\n    arcKnowledge: r.arcKnowledge && typeof r.arcKnowledge === "object" ? r.arcKnowledge : {},\n    arcGenreKnowledge: r.arcGenreKnowledge && typeof r.arcGenreKnowledge === "object" ? r.arcGenreKnowledge : {},\n    revBoostUntil: typeof r.revBoostUntil === "number" ? r.revBoostUntil : 0,'''
)
replace_once(
    state,
    '''  let research = [...(r.research ?? [])];\n  let contractJobs = [...(r.contractJobs ?? [])];''',
    '''  let research = [...(r.research ?? [])];\n  let arcCombos = [...(r.arcCombos ?? [])];\n  let arcKnowledge = { ...(r.arcKnowledge ?? {}) };\n  let arcGenreKnowledge = { ...(r.arcGenreKnowledge ?? {}) };\n  let contractJobs = [...(r.contractJobs ?? [])];'''
)
replace_once(
    state,
    '''        if (w < job.completesWeek) { keep.push(job); continue; }\n        if (!research.includes(job.researchId)) research.push(job.researchId);\n        notices.push(`🔬 Research complete: ${job.name}!`);''',
    '''        if (w < job.completesWeek) { keep.push(job); continue; }\n        if (!research.includes(job.researchId)) research.push(job.researchId);\n        if (job.researchId === "narrative_analytics") {\n          arcCombos = [...new Set([...arcCombos, ...ARC_RESEARCH_COMBOS])];\n          for (const id of ARC_RESEARCH_COMBOS) {\n            const combo = ARC_COMBOS.find((c) => c.id === id);\n            for (const arcId of combo?.arcs ?? []) arcKnowledge[arcId] = Math.max(1, arcKnowledge[arcId] ?? 0);\n          }\n          notices.push("📚 Narrative Analytics adds several proven structures to the Studio Bible.");\n        }\n        if (job.researchId === "genre_studies") {\n          for (const key of ARC_RESEARCH_GENRE_KEYS) arcGenreKnowledge[key] = Math.max(1, arcGenreKnowledge[key] ?? 0);\n          notices.push("📚 Genre Studies reveals a starter set of arc-to-genre relationships.");\n        }\n        notices.push(`🔬 Research complete: ${job.name}!`);'''
)
replace_once(
    state,
    '''    projects,\n    research,\n    contractJobs,''',
    '''    projects,\n    research,\n    arcCombos,\n    arcKnowledge,\n    arcGenreKnowledge,\n    contractJobs,'''
)
replace_once(
    state,
    '''  if (result.hallOfFame) notices.push(`“${draft.title}” enters the HALL OF FAME!`);\n  if (p.lateWeeks > 0)''',
    '''  if (result.hallOfFame) notices.push(`“${draft.title}” enters the HALL OF FAME!`);\n  for (const id of result.arcCombosDiscovered) {\n    const combo = ARC_COMBOS.find((c) => c.id === id);\n    if (combo) notices.push(`🧠 STORY BREAKTHROUGH: ${combo.name} discovered — its structure rating is now visible whenever you plan it.`);\n  }\n  if (p.lateWeeks > 0)'''
)
replace_once(
    state,
    '''    arcKnowledge: draft.arcs.reduce(\n      (acc2, id) => ({ ...acc2, [id]: (acc2[id] ?? 0) + 1 }),\n      r.arcKnowledge\n    ),\n    studioTop: Math.max(r.studioTop, result.quality),''',
    '''    arcKnowledge: draft.arcs.reduce(\n      (acc2, id) => ({ ...acc2, [id]: (acc2[id] ?? 0) + 1 }),\n      r.arcKnowledge ?? {}\n    ),\n    arcGenreKnowledge: draft.arcs.reduce((acc2, id) => {\n      for (const genre of draft.genres) {\n        const key = `${id}|${genre}`;\n        acc2[key] = (acc2[key] ?? 0) + 1;\n      }\n      return acc2;\n    }, { ...(r.arcGenreKnowledge ?? {}) } as Record<string, number>),\n    studioTop: Math.max(r.studioTop, result.quality),'''
)

# ---------------------------------------------------------------------------
# Create.tsx — learned relationships become permanent tooltips
# ---------------------------------------------------------------------------
create = "game_source/src/components/Create.tsx"
replace_once(
    create,
    '''  ARCS,\n  AUDIENCES,''',
    '''  ARCS,\n  arcCombosFor,\n  arcComboRating,\n  arcGenreFit,\n  arcGenreKey,\n  AUDIENCES,'''
)
replace_once(
    create,
    '''  const greenlightBlock = startBlockReason(run, d);\n\n\n  const stepValid =''',
    '''  const greenlightBlock = startBlockReason(run, d);\n  const arcLimit = PRODUCTION_SCOPES[d.scope ?? "standard"].arcLimit;\n  const selectedArcCombos = useMemo(() => arcCombosFor(d.arcs), [d.arcs]);\n  const learnedArcCombos = selectedArcCombos.filter((c) => run.arcCombos.includes(c.id));\n\n  const stepValid ='''
)
replace_once(
    create,
    '''      d.arcs.length >= 3,\n    ][step] ?? true;''',
    '''      d.arcs.length >= 3 && d.arcs.length <= arcLimit,\n    ][step] ?? true;'''
)
replace_once(
    create,
    '''      if (old.arcs.length >= 6) return old;\n      return { ...old, arcs: [...old.arcs, id] };''',
    '''      const limit = PRODUCTION_SCOPES[old.scope ?? "standard"].arcLimit;\n      if (old.arcs.length >= limit) return old;\n      return { ...old, arcs: [...old.arcs, id] };'''
)
regex_once(
    create,
    r'''  const arcTotals = useMemo\(\(\) => \{.*?\n  \}, \[d\.arcs, d\.genres, run\.arcKnowledge\]\);''',
    '''  const arcTotals = useMemo(() => {\n    let q = 0;\n    let f = 0;\n    let known = true;\n    d.arcs.forEach((id, idx) => {\n      const a = ARCS.find((x) => x.id === id)!;\n      if ((run.arcKnowledge[id] ?? 0) <= 0) known = false;\n      q += a.q;\n      f += a.f;\n      const hasPositive = a.syn?.some((s) => d.genres.includes(s));\n      const hasNegative = a.anti?.some((s) => d.genres.includes(s));\n      if (hasPositive) { q += a.synQ ?? 0; f += a.synF ?? 0; }\n      if (hasNegative) { q += a.antiQ ?? -2; f += a.antiF ?? -0.01; }\n      for (const genre of d.genres)\n        if ((run.arcGenreKnowledge[arcGenreKey(id, genre)] ?? 0) <= 0) known = false;\n      if (a.id === "finale" && idx === d.arcs.length - 1) {\n        if (d.arcs.length >= 6) q += 6;\n        else if (d.arcs.length >= 4) q += 4;\n      }\n    });\n    const combos = arcCombosFor(d.arcs);\n    q += combos.reduce((sum, c) => sum + c.q, 0);\n    f += combos.reduce((sum, c) => sum + c.f, 0);\n    if (combos.some((c) => !run.arcCombos.includes(c.id))) known = false;\n    return { q, f, known };\n  }, [d.arcs, d.genres, run.arcKnowledge, run.arcGenreKnowledge, run.arcCombos]);'''
)
replace_once(
    create,
    '''                      <Pick key={scope} active={(d.scope ?? "standard") === scope} disabled={locked} onClick={() => set({ scope })}>\n                        <div className="font-display text-sm font-extrabold">{scopeLabel(scope, d.medium)}</div>\n                        <div className="text-[10px] font-bold text-gold">×{def.costMult.toFixed(2)} cost · ×{def.weeksMult.toFixed(2)} time</div>''',
    '''                      <Pick key={scope} active={(d.scope ?? "standard") === scope} disabled={locked} onClick={() => set({ scope, arcs: d.arcs.slice(0, def.arcLimit) })}>\n                        <div className="font-display text-sm font-extrabold">{scopeLabel(scope, d.medium)}</div>\n                        <div className="text-[10px] font-bold text-gold">×{def.costMult.toFixed(2)} cost · ×{def.weeksMult.toFixed(2)} time · {def.arcLimit} arcs</div>'''
)
replace_once(
    create,
    '''              <Section title={`PLAN THE SEASON — PICK 3–6 ARCS (${d.arcs.length}/6)`}>''',
    '''              <Section title={`PLAN THE SEASON — PICK 3–${arcLimit} ARCS (${d.arcs.length}/${arcLimit})`}>'''
)
replace_once(
    create,
    '''                </div>\n                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">\n                  {ARCS.map((a) => {''',
    '''                </div>\n                {d.arcs.length >= 2 && (\n                  <div className="rounded-xl border border-line bg-panel2/60 p-2.5">\n                    <div className="text-[9px] font-extrabold tracking-[0.18em] text-paper/45">STUDIO STORY KNOWLEDGE</div>\n                    {learnedArcCombos.length > 0 ? (\n                      <div className="mt-1.5 flex flex-wrap gap-1.5">\n                        {learnedArcCombos.map((c) => {\n                          const rating = arcComboRating(c);\n                          return (\n                            <span key={c.id} className={cn("rounded-lg border border-line px-2 py-1 text-[10px] font-extrabold", rating.cls)}>\n                              {rating.label} · {c.name}{c.ordered ? " ↦" : ""}\n                            </span>\n                          );\n                        })}\n                      </div>\n                    ) : (\n                      <div className="mt-1 text-[10px] italic text-viol">No proven structure here yet — release it, or research narrative analytics.</div>\n                    )}\n                  </div>\n                )}\n                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">\n                  {ARCS.map((a) => {'''
)
replace_once(
    create,
    '''                    const known = (run.arcKnowledge[a.id] ?? 0) > 0;\n                    const study = reason?.startsWith("Study") && onUnlockArc;''',
    '''                    const known = (run.arcKnowledge[a.id] ?? 0) > 0;\n                    const genreFits = d.genres.map((genre) => ({\n                      genre,\n                      known: (run.arcGenreKnowledge[arcGenreKey(a.id, genre)] ?? 0) > 0,\n                      fit: arcGenreFit(a, genre),\n                    }));\n                    const study = reason?.startsWith("Study") && onUnlockArc;'''
)
replace_once(
    create,
    '''                        ) : (\n                          <div className="mt-1 text-[9px] italic text-viol">Payoff unknown — ship it to find out</div>\n                        )}\n                        {!on && !locked && <Plus size={13} className="absolute right-2 top-2 text-paper/30" />}''',
    '''                        ) : (\n                          <div className="mt-1 text-[9px] italic text-viol">Payoff unknown — ship it to find out</div>\n                        )}\n                        {!locked && d.genres.length > 0 && (\n                          <div className="mt-1.5 flex flex-wrap gap-1">\n                            {genreFits.map(({ genre, known: fitKnown, fit }) => {\n                              const g = GENRES.find((x) => x.id === genre)!;\n                              return fitKnown ? (\n                                <span key={genre} className={cn("rounded border border-line px-1.5 py-0.5 text-[8px] font-extrabold", fit.cls)}>\n                                  {g.label}: {fit.label}\n                                </span>\n                              ) : (\n                                <span key={genre} className="rounded border border-line/50 px-1.5 py-0.5 text-[8px] italic text-paper/35">\n                                  {g.label}: FIT ?\n                                </span>\n                              );\n                            })}\n                          </div>\n                        )}\n                        {!on && !locked && <Plus size={13} className="absolute right-2 top-2 text-paper/30" />}'''
)

# ---------------------------------------------------------------------------
# permanent regression coverage
# ---------------------------------------------------------------------------
test_path = ROOT / "game_source/src/engine/__tests__/arc-discovery.test.ts"
test_path.write_text('''import { describe, expect, it } from "vitest";\nimport {\n  ARCS,\n  ARC_COMBOS,\n  PRODUCTION_SCOPES,\n  RESEARCH,\n  arcComboRating,\n  arcCombosFor,\n  arcGenreFit,\n  arcGenreKey,\n} from "../data";\nimport { initialRun, migrateRun } from "../state";\n\ndescribe("creative discovery", () => {\n  it("expands the story board to a sixty-arc catalogue", () => {\n    expect(ARCS.length).toBeGreaterThanOrEqual(60);\n  });\n\n  it("ordered structures care about sequence", () => {\n    expect(arcCombosFor(["montage", "tournament", "finale"]).some((c) => c.id === "earned_victory")).toBe(true);\n    expect(arcCombosFor(["tournament", "montage", "finale"]).some((c) => c.id === "earned_victory")).toBe(false);\n    expect(arcCombosFor(["tournament", "montage"]).some((c) => c.id === "backwards_training")).toBe(true);\n  });\n\n  it("learned structures classify as great, good or risky", () => {\n    const great = ARC_COMBOS.find((c) => c.id === "earned_victory")!;\n    const risky = ARC_COMBOS.find((c) => c.id === "backwards_training")!;\n    expect(arcComboRating(great).label).toMatch(/GREAT/);\n    expect(arcComboRating(risky).label).toMatch(/RISKY/);\n  });\n\n  it("arc-to-genre fit can be positive, neutral or risky", () => {\n    const slow = ARCS.find((a) => a.id === "narr_slowburn")!;\n    expect(arcGenreFit(slow, "slice").label).toMatch(/GREAT|GOOD/);\n    expect(arcGenreFit(slow, "racing").label).toMatch(/RISKY/);\n    expect(arcGenreFit(slow, "space").label).toBe("NEUTRAL");\n    expect(arcGenreKey(slow.id, "slice")).toBe("narr_slowburn|slice");\n  });\n\n  it("scope controls how much story a production can carry", () => {\n    expect(PRODUCTION_SCOPES.short.arcLimit).toBe(3);\n    expect(PRODUCTION_SCOPES.standard.arcLimit).toBe(4);\n    expect(PRODUCTION_SCOPES.extended.arcLimit).toBe(5);\n    expect(PRODUCTION_SCOPES.prestige.arcLimit).toBe(6);\n  });\n\n  it("creative research routes exist alongside experimentation", () => {\n    expect(RESEARCH.some((r) => r.id === "genre_studies")).toBe(true);\n    expect(RESEARCH.some((r) => r.id === "narrative_analytics")).toBe(true);\n  });\n\n  it("legacy saves migrate with empty relationship knowledge", () => {\n    const raw = initialRun("Legacy", "steady") as unknown as Record<string, unknown>;\n    delete raw.arcGenreKnowledge;\n    const migrated = migrateRun(raw);\n    expect(migrated.arcGenreKnowledge).toEqual({});\n  });\n});\n''', encoding="utf-8")

print("Applied arc discovery, ordered structures, creative research and learned tooltips")
