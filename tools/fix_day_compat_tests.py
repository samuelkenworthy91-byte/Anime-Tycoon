from pathlib import Path

# Old saves/tests/tools sometimes advance `week` directly without a matching day.
# Treat week*7 as a floor so they remain late when the high-level calendar jumps.
p = Path('game_source/src/engine/state.ts')
s = p.read_text()
s = s.replace(
    '    const late = (r.day ?? r.week * 7) > (deal.deadlineDay ?? deal.deadlineWeek * 7);',
    '    const late = Math.max(r.day ?? r.week * 7, r.week * 7) > (deal.deadlineDay ?? deal.deadlineWeek * 7);',
    1,
)
s = s.replace(
    '    if ((r.day ?? r.week * 7) > (deal.deadlineDay ?? deal.deadlineWeek * 7)) notices.push(`${deal.partnerName} logs the late delivery. They will remember.`);',
    '    if (Math.max(r.day ?? r.week * 7, r.week * 7) > (deal.deadlineDay ?? deal.deadlineWeek * 7)) notices.push(`${deal.partnerName} logs the late delivery. They will remember.`);',
    1,
)
p.write_text(s)

# Make the release-revenue regression compare the same critic RNG on both paths;
# otherwise random review variance can occasionally overwhelm the deliberate late multiplier.
p = Path('game_source/src/engine/__tests__/projects.test.ts')
s = p.read_text()
s = s.replace('import { describe, expect, it } from "vitest";', 'import { describe, expect, it, vi } from "vitest";', 1)
needle = '''  it("late delivery docks release revenue", () => {
    let r = richRun();'''
replacement = '''  it("late delivery docks release revenue", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let r = richRun();'''
if needle not in s:
    raise SystemExit('late revenue test anchor missing')
s = s.replace(needle, replacement, 1)
p.write_text(s)
print('preserved week-jump compatibility and stabilised late-revenue regression')
