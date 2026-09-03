from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def patch(rel: str, old: str, new: str) -> None:
    p = ROOT / rel
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing TS fix anchor in {rel}: {old!r}")
    p.write_text(s.replace(old, new))

patch(
    "game_source/src/App.tsx",
    "  tickEditDay,\n  rollStudioWorkPulses,\n",
    "  tickEditDay,\n",
)

state = ROOT / "game_source/src/engine/state.ts"
s = state.read_text()
s = s.replace(
    "liveQuality: { story: 0, art: 0, sound: 0, ...(p.liveQuality ?? {}) }",
    "liveQuality: { ...(p.liveQuality ?? { story: 0, art: 0, sound: 0 }) }",
)
s = s.replace(
    "liveQuality: { story: 0, art: 0, sound: 0, ...(p.liveQuality ?? {}), [pulse.type]: (p.liveQuality?.[pulse.type] ?? 0) + pulse.points }",
    "liveQuality: { ...(p.liveQuality ?? { story: 0, art: 0, sound: 0 }), [pulse.type]: (p.liveQuality?.[pulse.type] ?? 0) + pulse.points }",
)
s = s.replace(
    "liveQuality: { story: 0, art: 0, sound: 0, ...(pr.liveQuality ?? {}) }",
    "liveQuality: { ...(pr.liveQuality ?? { story: 0, art: 0, sound: 0 }) }",
)
state.write_text(s)
print("realtime TypeScript cleanup applied")
