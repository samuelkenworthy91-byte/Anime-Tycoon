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

print("decision hardmode post-integration balance tuning applied")
