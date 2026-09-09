from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = ROOT / path
    s = p.read_text()
    if new in s and old not in s:
        return
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(s.replace(old, new, 1))

# Keep early scoring harder than the former baseline (10), but leave enough
# headroom that genuinely excellent late-game work can still reach 9s/10s.
replace_once(
    "src/engine/scoring.ts",
    "export const RAW_QUALITY_BASE = 8;\nexport const RAW_QUALITY_FLOOR = 12;",
    "export const RAW_QUALITY_BASE = 9;\nexport const RAW_QUALITY_FLOOR = 12;",
    "quality base tuning",
)
replace_once(
    "src/engine/scoring.ts",
    "export const TOP_QUALITY_SLOPE = 0.12;",
    "export const TOP_QUALITY_SLOPE = 0.15;",
    "elite ceiling tuning",
)

# Positive affinity remains bounded at the established values. Hard mode's
# new whole-production castFitMult supplies the severe downside for genuinely
# unsuitable casting; we don't also inflate the positive per-role bonus.
replace_once(
    "src/engine/scoring.ts",
    "export const CAST_BASE_QUALITY = 0.25;\nexport const VISIBLE_CAST_QUALITY = 0.75;",
    "export const CAST_BASE_QUALITY = 0.5;\nexport const VISIBLE_CAST_QUALITY = 0.6;",
    "bounded cast contribution",
)

# Don't fire global executive offers into a literally empty studio. Once the
# player has crew, an active production or a franchise, the expanded deck is live.
replace_once(
    "src/engine/events.ts",
    "export function rollStudioEvent(week: number, ctx: StudioEventContext): StudioEvent | null {\n  /* Most rolls now come from the broad executive-decision deck.",
    "export function rollStudioEvent(week: number, ctx: StudioEventContext): StudioEvent | null {\n  if (!ctx.crew.length && !ctx.active.length && !ctx.topFranchise) return null;\n  /* Most rolls now come from the broad executive-decision deck.",
    "empty studio event guard",
)

# The old deterministic balance fixtures predate exact genre/combo direction
# fingerprints. Make the fixtures aim at the same targets the live project
# pipeline now uses; otherwise a test intended to isolate CAST or point scaling
# accidentally simulates deliberately wrong sliders and collapses to the 4/10 floor.
replace_once(
    "scripts/cast-v2-balance.test.ts",
    'import { computeResult } from "../src/engine/scoring";\n',
    'import { computeResult } from "../src/engine/scoring";\nimport { genreTargetFor } from "../src/engine/genreTargets";\n',
    "cast balance target import",
)
replace_once(
    "scripts/cast-v2-balance.test.ts",
    '    sliders: [50, 50, 50],\n',
    '    sliders: genreTargetFor([genre]).ideal,\n',
    "cast balance exact sliders",
)
replace_once(
    "scripts/scoring-balance.test.ts",
    'import { computeResult, seededRng } from "../src/engine/scoring";\n',
    'import { computeResult, seededRng } from "../src/engine/scoring";\nimport { genreTargetFor } from "../src/engine/genreTargets";\n',
    "scoring balance target import",
)
old_genre_def = '''const genreDef = () => {\n  const defs = GENRES.map((g) => GENRE(g));\n  const n = defs.length;\n  const ideal = [0, 1, 2].map((i) => Math.round(defs.reduce((a, g) => a + g.ideal[i], 0) / n)) as [number, number, number];\n  const ratio = [0, 1, 2].map((i) => defs.reduce((a, g) => a + g.ratio[i], 0) / n) as [number, number, number];\n  return { defs, ideal, ratio };\n};\n'''
new_genre_def = '''const genreDef = () => {\n  const defs = GENRES.map((g) => GENRE(g));\n  const target = genreTargetFor(GENRES);\n  return { defs, ideal: target.ideal, ratio: target.ratio };\n};\n'''
replace_once(
    "scripts/scoring-balance.test.ts",
    old_genre_def,
    new_genre_def,
    "scoring balance exact combo target",
)

print("decision hardmode post-integration balance tuning applied")
