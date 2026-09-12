from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src/engine/__tests__/awards.test.ts"
text = p.read_text(encoding="utf-8")
old = '''    /* judged at the week-48 boundary, then the slate resets */
    const after = advanceWeeks({ ...out.run, week: 43, day: 43 * 7 }, 6);
    expect(after.awardsCeremony).toBeTruthy();
    const mine = after.awardsCeremony!.categories.flatMap((c) => c.nominees).find((n) => n.player);
    expect(mine).toBeTruthy();
    expect(mine!.title).toBe("Award Bait Zero");
    expect(after.yearShows).toHaveLength(0);'''
new = '''    /* judged at the week-48 boundary, then the slate resets. A real release
       is not guaranteed a nomination anymore: it must clear the published
       category qualification standards first. */
    const after = advanceWeeks({ ...out.run, week: 43, day: 43 * 7 }, 6);
    expect(after.awardsCeremony).toBeTruthy();
    expect(after.yearShows).toHaveLength(0);'''
if text.count(old) != 1:
    raise RuntimeError("awards integration block did not match exactly")
p.write_text(text.replace(old, new), encoding="utf-8")
print("Updated award-year integration expectation for qualification gating.")
