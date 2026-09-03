from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
state = ROOT / "game_source/src/engine/state.ts"
s = state.read_text()
old = 'const projects = r.projects.map((pr) => pr.id === projectId ? { ...pr, issues: remaining, rdGained: pr.rdGained + cleared } : pr);'
new = 'const projects = r.projects.map((pr) => pr.id === projectId ? { ...pr, issues: remaining } : pr);'
if old not in s:
    raise SystemExit("Edit RD banking target missing")
s = s.replace(old, new, 1)
s = s.replace(' * Normal show work also has a small real quality contribution here so the\n * bubbles over employees are truthful rather than decorative. The weekly\n * contribution in projects.ts is deliberately halved to keep long-run scoring\n * near its previous balance.\n', ' * Normal scored production remains in the proven weekly engine; these daily\n * pulses make that skill-driven work legible throughout the office day without\n * double-counting quality.\n', 1)
state.write_text(s)

test = ROOT / "game_source/src/engine/__tests__/rush-edit-tuning.test.ts"
t = test.read_text()
needle = '    expect(out.rd).toBe(cleared);\n'
if needle not in t:
    raise SystemExit("Edit RD test target missing")
t = t.replace(needle, needle + '    expect(out.projects[0].rdGained).toBe(0); // no second payout at release\n', 1)
test.write_text(t)
print("Edit notes now award exactly one immediate RD each with no release-time duplicate")
