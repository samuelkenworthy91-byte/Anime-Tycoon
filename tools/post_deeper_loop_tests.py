from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def patch(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    if text.count(old) != 1:
        raise SystemExit(f"Expected one test patch in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

patch(
    "game_source/src/engine/__tests__/careers.test.ts",
    '''    const t1 = trainStaff(r, "a", "story")!;\n    expect(t1.staff.find((s) => s.id === "a")!.story).toBe(61);\n    expect(t1.staff.find((s) => s.id === "a")!.xp).toBe(XP_LEVELS[1] + 50);\n    expect(trainBlockReason(t1, "a")).toMatch(/cooldown/i);\n    expect(trainStaff(t1, "a", "story")).toBeNull();''',
    '''    const t1 = trainStaff(r, "a", "story")!;\n    /* courses now occupy real calendar time; no instant skill point */\n    expect(t1.staff.find((s) => s.id === "a")!.story).toBe(60);\n    expect(t1.trainingJobs).toHaveLength(1);\n    expect(trainBlockReason(t1, "a")).toMatch(/Training/i);\n    expect(trainStaff(t1, "a", "story")).toBeNull();\n    const weeks = t1.trainingJobs[0].completesWeek - t1.week;\n    const t2 = advanceWeeks(t1, weeks);\n    expect(t2.staff.find((s) => s.id === "a")!.story).toBe(61);\n    /* training is still productive work, so the staff member also earns a small\n       amount of weekly operation XP before the course-completion XP lands. */\n    expect(t2.staff.find((s) => s.id === "a")!.xp).toBeGreaterThanOrEqual(XP_LEVELS[1] + 50);\n    expect(trainBlockReason(t2, "a")).toMatch(/cooldown/i);'''
)

patch(
    "game_source/src/engine/__tests__/season-flow.test.ts",
    "  while (guard++ < 50) {",
    "  while (guard++ < 120) {"
)
patch(
    "game_source/src/engine/__tests__/season-flow.test.ts",
    "    while (guard++ < 40) {",
    "    while (guard++ < 120) {"
)

print("Updated regression expectations for timed training and capped schedules")
