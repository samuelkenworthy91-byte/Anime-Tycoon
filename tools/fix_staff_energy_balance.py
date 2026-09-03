from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Keep the established weekly quality formula. Daily bubbles are visible work units,
# while the weekly bank remains the authoritative scored contribution.
p = ROOT / "game_source/src/engine/projects.ts"
s = p.read_text().replace("staffPoint(s, focus) * 0.035 *", "staffPoint(s, focus) * 0.07 *")
p.write_text(s)

p = ROOT / "game_source/src/engine/state.ts"
s = p.read_text()

# Restore weekly canteen/stamina effects so existing facility balance remains intact.
needle = '''      const opBusy = new Set([\n        ...contractJobs.flatMap((j) => j.staffIds),\n        ...trainingJobs.map((j) => j.staffId),\n      ]);\n      staffArr = staffArr.map((st) => {\n'''
replace = '''      const opBusy = new Set([\n        ...contractJobs.flatMap((j) => j.staffIds),\n        ...trainingJobs.map((j) => j.staffId),\n      ]);\n      const drain = Math.max(1, 3 - fx.staminaSave);\n      const rest = 9 + fx.staminaRest;\n      staffArr = staffArr.map((st) => {\n'''
if needle not in s:
    raise SystemExit("weekly stamina insertion point missing")
s = s.replace(needle, replace, 1)

needle = '''        if (proj) {\n          /* morale while working */\n'''
replace = '''        if (proj) {\n          nx.stamina = Math.max(12, nx.stamina - drain);\n          /* morale while working */\n'''
if needle not in s: raise SystemExit("project stamina point missing")
s = s.replace(needle, replace, 1)

needle = '''        } else if (opBusy.has(st.id)) {\n          const g = gainXp(nx, Math.max(1, WEEKLY_XP - 1) * dynFx.xpMult);\n'''
replace = '''        } else if (opBusy.has(st.id)) {\n          nx.stamina = Math.max(12, nx.stamina - Math.max(1, drain - 1));\n          const g = gainXp(nx, Math.max(1, WEEKLY_XP - 1) * dynFx.xpMult);\n'''
if needle not in s: raise SystemExit("operation stamina point missing")
s = s.replace(needle, replace, 1)

needle = '''        } else {\n          const cur = moraleOf(nx);\n'''
replace = '''        } else {\n          nx.stamina = Math.min(100, nx.stamina + rest);\n          const cur = moraleOf(nx);\n'''
if needle not in s: raise SystemExit("idle stamina point missing")
s = s.replace(needle, replace, 1)

# Do not double-score the visible daily work bubble. It represents the employee's
# visible unit of the weekly bank; the authoritative score remains weekly.
mutation = '''        projects = projects.map((p) => p.id === project.id ? { ...p, points: { ...p.points, [projectFocus]: p.points[projectFocus] + 1 } } : p);\n'''
if mutation not in s: raise SystemExit("daily point mutation missing")
s = s.replace(mutation, "", 1)
p.write_text(s)

# Update the new daily-work test to verify truthful type/pulse and energy behaviour,
# without asserting a second independent scoring path.
p = ROOT / "game_source/src/engine/__tests__/gds-production.test.ts"
s = p.read_text()
s = s.replace('''  it("ordinary desk bubbles can add real project quality", () => {\n    vi.spyOn(Math, "random").mockReturnValue(0);\n    let r = initialRun("Test", "producer");\n    const staff = { ...r.candidates[0], story:99, stamina:100 };\n    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };\n    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };\n    const out = tickStudioDay(r);\n    expect(out.pulses.length).toBeGreaterThan(0);\n    expect(out.run.projects[0].points.story).toBeGreaterThan(0);\n    vi.restoreAllMocks();\n  });\n''', '''  it("ordinary desk work emits a visible contribution bubble of the correct type", () => {\n    vi.spyOn(Math, "random").mockReturnValue(0);\n    let r = initialRun("Test", "producer");\n    const staff = { ...r.candidates[0], story:99, stamina:100 };\n    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };\n    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };\n    const out = tickStudioDay(r);\n    expect(out.pulses.length).toBeGreaterThan(0);\n    expect(out.pulses[0].type).toBe("story");\n    expect(out.pulses[0].points).toBeGreaterThan(0);\n    vi.restoreAllMocks();\n  });\n''')
p.write_text(s)

print("Preserved weekly scoring/facility balance while keeping visible daily energy and work bubbles")
