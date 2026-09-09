from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPLY = ROOT / "scripts/apply-decision-hardmode.py"


def replace_block_by_label(text: str, label: str, replacement: str) -> str:
    lines = text.splitlines(keepends=True)
    hit = next((i for i, line in enumerate(lines) if label in line), None)
    if hit is None:
        if label in replacement and replacement in text:
            return text
        raise SystemExit(f"missing block label: {label}")
    start = hit
    while start >= 0 and not lines[start].startswith("s = once(s,"):
        start -= 1
    if start < 0:
        raise SystemExit(f"could not find start of block: {label}")
    lines[start:hit + 1] = replacement.splitlines(keepends=True)
    return "".join(lines)


s = APPLY.read_text()

# The previous patch used a one-line anchor that appears twice in state.ts.
# Anchor to the tail of previewResult instead.
fan_block = '''s = once(s,
'    castAffinityDiscovered: r.castAffinityDiscovered,\\n  });\\n  const scope = PRODUCTION_SCOPES[d.scope ?? "standard"];\\n',
'    castAffinityDiscovered: r.castAffinityDiscovered,\\n  });\\n  const decisionFanMult = decisionReleaseFansMult(r, d);\\n  if (Math.abs(decisionFanMult - 1) > 0.001) {\\n    out = {\\n      ...out,\\n      fans: Math.round(out.fans * decisionFanMult),\\n      breakdown: [...out.breakdown, { label: "Decision-event audience effect", pts: `×${decisionFanMult.toFixed(2)} fans` }],\\n    };\\n  }\\n  const scope = PRODUCTION_SCOPES[d.scope ?? "standard"];\\n',
"decision fan mult")
'''
s = replace_block_by_label(s, '"decision fan mult")', fan_block)

# Add exact audience-learning support once. Three DISTINCT tested releases of
# the same genre combo unlock exact combo and per-genre slider values.
if "audience combo exact-learning patch" not in s:
    marker = '# --------------------------------------------------------------- App.tsx\n'
    if marker not in s:
        raise SystemExit("missing App.tsx insertion marker")
    audience_patch = r"""# --------------------------------------- audience combo exact-learning patch
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

"""
    s = s.replace(marker, audience_patch + marker, 1)

APPLY.write_text(s)

# Curated exact targets for the three Direction Meeting axes.
TARGETS = '''import { GENRES, comboMult, type GenreId } from "./data";

export interface GenreProductionTarget {
  key: string;
  ideal: [number, number, number];
  ratio: [number, number, number];
  comboQualityMult: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const SINGLE_GENRE_DIRECTION: Record<GenreId, [number, number, number]> = {
  mecha: [66, 84, 58], isekai: [72, 57, 42], slice: [24, 32, 40],
  horror: [74, 48, 82], romance: [18, 38, 28], sports: [58, 90, 68],
  cyber: [68, 76, 88], fantasy: [64, 68, 60], idol: [45, 62, 94],
  mystery: [90, 34, 44], comedy: [36, 48, 34], cooking: [44, 74, 42],
  military: [82, 66, 56], supernatural: [60, 54, 72], space: [78, 86, 80],
  magical: [38, 72, 86], survival: [84, 54, 50], pirate: [70, 80, 66],
  martial: [62, 94, 44], mythology: [88, 72, 78], nordic: [72, 42, 62],
  samurai: [78, 90, 50], shinobi: [86, 78, 36],
};

function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function unit(seed: number, shift: number): number {
  const x = Math.imul((seed ^ (shift * 0x9e3779b9)) >>> 0, 2246822519) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 0xffffffff;
}

export function genreTargetFor(genres: GenreId[]): GenreProductionTarget {
  const ids = [...genres].sort();
  const key = ids.length ? ids.join("+") : "neutral";
  const defs = ids.map((id) => GENRES.find((g) => g.id === id)!).filter(Boolean);
  if (!defs.length) return { key, ideal: [50, 50, 50], ratio: [0.34, 0.33, 0.33], comboQualityMult: 1 };
  if (ids.length === 1) return { key, ideal: [...SINGLE_GENRE_DIRECTION[ids[0]]] as [number, number, number], ratio: [...defs[0].ratio] as [number, number, number], comboQualityMult: 1 };

  const baseIdeal = [0, 1, 2].map((i) => ids.reduce((sum, id) => sum + SINGLE_GENRE_DIRECTION[id][i], 0) / ids.length);
  const baseRatio = [0, 1, 2].map((i) => defs.reduce((sum, g) => sum + g.ratio[i], 0) / defs.length);
  const seed = hash32(key);
  const ideal = baseIdeal.map((v, i) => Math.round(clamp(v + (unit(seed, i + 1) * 2 - 1) * 13, 8, 92))) as [number, number, number];
  const rawRatio = baseRatio.map((v, i) => clamp(v + (unit(seed, i + 11) * 2 - 1) * 0.09, 0.08, 0.78));
  const total = rawRatio.reduce((a, b) => a + b, 0) || 1;
  const ratio = rawRatio.map((v) => v / total) as [number, number, number];
  const baseCombo = comboMult(ids as GenreId[], true);
  const comboQualityMult = baseCombo >= 1 ? clamp(1 + (baseCombo - 1) * 0.9, 1, 1.24) : clamp(1 - (1 - baseCombo) * 1.8, 0.62, 1);
  return { key, ideal, ratio, comboQualityMult };
}
'''
(ROOT / "src/engine/genreTargets.ts").write_text(TARGETS)
print("decision hardmode integration patch hardened")
