from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(rel: str, old: str, new: str, expected: int = 1) -> None:
    p = ROOT / rel
    text = p.read_text(encoding="utf-8")
    found = text.count(old)
    if found != expected:
        raise RuntimeError(f"{rel}: expected {expected} copies, found {found}: {old[:120]!r}")
    p.write_text(text.replace(old, new, expected), encoding="utf-8")


# Negative narrative structures now live in ARC_CLASHES, not ARC_COMBOS.
patch(
    "src/engine/__tests__/arc-discovery.test.ts",
    'import { initialRun, migrateRun } from "../state";',
    'import { initialRun, migrateRun } from "../state";\nimport { arcClashesFor } from "../creativeDiscovery";',
)
patch(
    "src/engine/__tests__/arc-discovery.test.ts",
    '    expect(arcCombosFor(["tournament", "montage"]).some((c) => c.id === "backwards_training")).toBe(true);',
    '    expect(arcClashesFor(["tournament", "montage"]).some((c) => c.id === "clash_backwards_training")).toBe(true);',
)
patch(
    "src/engine/__tests__/arc-discovery.test.ts",
    '''    const risky = ARC_COMBOS.find((c) => c.id === "backwards_training")!;
    expect(arcComboRating(great).label).toMatch(/GREAT/);
    expect(arcComboRating(risky).label).toMatch(/RISKY/);''',
    '''    const risky = arcClashesFor(["tournament", "montage"]).find((c) => c.id === "clash_backwards_training")!;
    expect(arcComboRating(great).label).toMatch(/GREAT/);
    expect(risky.q).toBeLessThan(0);
    expect(risky.name).toMatch(/Training After the Test/);''',
)

# The ceremony integration fixture should still be a genuine qualifying release.
patch(
    "src/engine/__tests__/awards.test.ts",
    '      title: "Award Bait Zero", genres: ["sports" as GenreId], medium: "tv" as const, budget: "indie" as const,',
    '      title: "Award Bait Zero", genres: ["slice" as GenreId], medium: "tv" as const, budget: "blockbuster" as const,',
)
patch(
    "src/engine/__tests__/awards.test.ts",
    '      arcs: [], sliders: [60, 60, 50] as [number, number, number], season: 1,',
    '      arcs: ["hook", "finale"], sliders: [24, 32, 40] as [number, number, number], season: 1,',
)
patch(
    "src/engine/__tests__/awards.test.ts",
    '        ...p, stage: "ready" as const, points: { story: 80, art: 20, sound: 10 }, hype: 40,',
    '        ...p, stage: "ready" as const, points: { story: 420, art: 220, sound: 180 }, hype: 40,',
)

# The sweep fixture must meet the new craft qualification floors if it expects all three craft awards.
patch(
    "src/engine/__tests__/awards.test.ts",
    '    const shows = [mk({ title: "Sweep", player: true, score: 40, audience: 500_000 })];',
    '    const shows = [mk({ title: "Sweep", player: true, score: 40, story: 40, art: 40, sound: 40, audience: 500_000 })];',
)
patch(
    "src/engine/__tests__/awards.test.ts",
    '    const expectedFans = 1_500 + 750 + 3 * 250 + 1_000;',
    '    const expectedFans = 60_000 + 40_000 + 3 * 30_000 + 45_000;',
)

# Relocation preservation test must now satisfy the sustained-growth gate it is not testing.
patch(
    "src/engine/__tests__/facilities.test.ts",
    '    let r = richRun({ officeLevel: 1, cash: 5_000_000 }); // 3 slots',
    '    let r = richRun({ officeLevel: 1, cash: 5_000_000, showsMade: 8, fans: 25_000, staff: [worker("a"), worker("b"), worker("c")] }); // 3 slots',
)

print("Updated legacy tests for the new narrative, awards and relocation contracts.")
